import { fireEvent, render } from "@testing-library/react";
import { useCallback, useState } from "react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import TimelineEditor from "@/components/video-editor/timeline/TimelineEditor";
import type { ZoomRegion } from "@/components/video-editor/types";
import { I18nProvider } from "@/contexts/I18nContext";
import { ShortcutsProvider } from "@/contexts/ShortcutsContext";
import { loadLocale } from "@/i18n/loader";
import perfBudgets from "../../../perf-budgets.json";
import { createRenderProfiler } from "./renderCounter";

/**
 * Render bench (browser mode, same infra as `test:browser`). Mounts the real
 * TimelineEditor and counts commits of its subtree (via React Profiler) while
 * driving the three interactive paths over a fixed fixture:
 *
 * - `render.scrub` — dragging the playhead across the timeline (onSeek).
 * - `render.zoom`  — adding a zoom region with the keyboard shortcut (Z).
 * - `render.drag`  — dragging a zoom-region item (onItemSpanChange).
 *
 * Budgets live in `perf-budgets.json` and are enforced here; the interaction is
 * a fixed number of events so a render storm (e.g. a per-frame setState) trips
 * the budget. See `createRenderProfiler` for the commit-counting semantics.
 */

const SCRUB_EVENTS = 20;
const ZOOM_EVENTS = 20;
const DRAG_EVENTS = 20;

const FIXTURE_REGION: ZoomRegion = {
	id: "zoom-1",
	startMs: 2000,
	endMs: 4000,
	depth: 3,
	focus: { cx: 0.5, cy: 0.5 },
};

const originalSetPointerCapture = Element.prototype.setPointerCapture;
const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
const originalHasPointerCapture = Element.prototype.hasPointerCapture;
const originalElectronApi = window.electronAPI;

beforeAll(async () => {
	// `I18nProvider` now gates children on the active locale's messages being
	// loaded (lazy per-locale chunks); preload "en" so the editor mounts
	// immediately and the bench measures renders, not i18n hydration.
	await loadLocale("en");

	// Synthetic pointer events aren't backed by an active pointer, so the
	// browser would throw on setPointerCapture. The handlers still track the
	// pointerId in refs, so a no-op capture keeps the interaction faithful.
	Element.prototype.setPointerCapture = () => undefined;
	Element.prototype.releasePointerCapture = () => undefined;
	Element.prototype.hasPointerCapture = () => false;

	// The app runs inside Electron where `window.electronAPI` always exists;
	// in a bare browser it's undefined. Stub the handful of calls the harness
	// makes during mount (shortcuts/platform/locale).
	Object.defineProperty(window, "electronAPI", {
		configurable: true,
		value: {
			getShortcuts: async () => null,
			saveShortcuts: async () => ({ success: true }),
			updateGlobalShortcut: async () => ({ success: true }),
			getPlatform: async () => "linux",
			setLocale: async () => undefined,
		},
	});
});

afterAll(() => {
	Element.prototype.setPointerCapture = originalSetPointerCapture;
	Element.prototype.releasePointerCapture = originalReleasePointerCapture;
	Element.prototype.hasPointerCapture = originalHasPointerCapture;
	Object.defineProperty(window, "electronAPI", {
		configurable: true,
		value: originalElectronApi,
	});
});

function getBudget(metric: string): number {
	const budget = perfBudgets.budgets.find((entry) => entry.metric === metric);
	if (!budget) {
		throw new Error(`missing budget ${metric} in perf-budgets.json`);
	}
	return budget.max;
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Lets ResizeObserver/effects settle so dnd-timeline has measured layout. */
async function settle(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 20));
	await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** The timeline background (the div wired to pointer/wheel handlers). */
function timelineRoot(container: HTMLElement): HTMLElement {
	for (const element of container.querySelectorAll<HTMLElement>("div")) {
		if (element.classList.contains("cursor-pointer") && element.classList.contains("group")) {
			return element;
		}
	}
	throw new Error("timeline root not found");
}

function TimelineHarness({
	profiler,
	initialRegions = [],
}: {
	profiler: ReturnType<typeof createRenderProfiler>;
	initialRegions?: ZoomRegion[];
}) {
	const [currentTime, setCurrentTime] = useState(0);
	const [zoomRegions, setZoomRegions] = useState<ZoomRegion[]>(initialRegions);
	const [zoomCounter, setZoomCounter] = useState(0);

	const handleSeek = useCallback((seconds: number) => {
		setCurrentTime(seconds);
	}, []);

	return (
		<profiler.Profiler>
			<div
				data-testid="timeline-harness"
				data-current-time={currentTime.toFixed(2)}
				data-zoom-count={zoomCounter}
				data-region-start={zoomRegions[0]?.startMs ?? -1}
				data-region-end={zoomRegions[0]?.endMs ?? -1}
				style={{ width: 1200 }}
			>
				<TimelineEditor
					videoDuration={10}
					currentTime={currentTime}
					onSeek={handleSeek}
					zoomRegions={zoomRegions}
					onZoomAdded={() => setZoomCounter((n) => n + 1)}
					onZoomSpanChange={(id, span) => {
						setZoomRegions((previous) =>
							previous.map((region) =>
								region.id === id ? { ...region, startMs: span.start, endMs: span.end } : region,
							),
						);
					}}
					onZoomDelete={() => setZoomRegions([])}
					selectedZoomId={null}
					onSelectZoom={() => {}}
					aspectRatio="16:9"
					onAspectRatioChange={() => {}}
				/>
			</div>
		</profiler.Profiler>
	);
}

describe("timeline render budgets", () => {
	it("render.scrub stays under budget", async () => {
		const profiler = createRenderProfiler();
		const { container } = render(
			<I18nProvider>
				<ShortcutsProvider>
					<TimelineHarness profiler={profiler} />
				</ShortcutsProvider>
			</I18nProvider>,
		);
		await settle();
		const timeline = timelineRoot(container);

		profiler.reset();
		fireEvent.pointerDown(timeline, {
			clientX: 60,
			clientY: 120,
			pointerId: 1,
			isPrimary: true,
			button: 0,
		});
		await flush();
		for (let i = 0; i < SCRUB_EVENTS; i += 1) {
			fireEvent.pointerMove(timeline, { clientX: 70 + i * 15, pointerId: 1 });
			await flush();
		}
		fireEvent.pointerUp(timeline, { pointerId: 1 });
		await settle();

		// Sanity: the scrub must have moved the playhead, otherwise the bench is
		// not exercising the path it claims to.
		const harness = container.querySelector("[data-testid='timeline-harness']") as HTMLElement;
		const currentTime = Number(harness.dataset.currentTime);
		expect(currentTime).toBeGreaterThan(0);

		const count = profiler.count();
		console.info(`render.scrub = ${count} commits over ${SCRUB_EVENTS} moves`);
		expect(
			count,
			`render.scrub (${count}) over budget ${getBudget("render.scrub")}`,
		).toBeLessThanOrEqual(getBudget("render.scrub"));
	});

	it("render.zoom stays under budget", async () => {
		const profiler = createRenderProfiler();
		const { container } = render(
			<I18nProvider>
				<ShortcutsProvider>
					<TimelineHarness profiler={profiler} />
				</ShortcutsProvider>
			</I18nProvider>,
		);
		await settle();

		profiler.reset();
		for (let i = 0; i < ZOOM_EVENTS; i += 1) {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", bubbles: true }));
			await flush();
		}
		await settle();

		// Sanity: each Z press must have placed a zoom region.
		const harness = container.querySelector("[data-testid='timeline-harness']") as HTMLElement;
		expect(Number(harness.dataset.zoomCount)).toBeGreaterThan(0);

		const count = profiler.count();
		console.info(`render.zoom = ${count} commits over ${ZOOM_EVENTS} adds`);
		expect(
			count,
			`render.zoom (${count}) over budget ${getBudget("render.zoom")}`,
		).toBeLessThanOrEqual(getBudget("render.zoom"));
	});

	it("render.drag stays under budget", async () => {
		const profiler = createRenderProfiler();
		const { container } = render(
			<I18nProvider>
				<ShortcutsProvider>
					<TimelineHarness profiler={profiler} initialRegions={[FIXTURE_REGION]} />
				</ShortcutsProvider>
			</I18nProvider>,
		);
		await settle();

		const item = container.querySelector<HTMLElement>("div[class*='cursor-grab']");
		if (!item) {
			throw new Error("zoom item not found");
		}
		const itemRect = item.getBoundingClientRect();
		const startX = itemRect.left + itemRect.width / 2;
		const startY = itemRect.top + itemRect.height / 2;

		profiler.reset();
		fireEvent.pointerDown(item, {
			clientX: startX,
			clientY: startY,
			pointerId: 2,
			isPrimary: true,
			button: 0,
		});
		await flush();
		// dnd-kit's pointer sensor listens on the owner document during the drag
		// (not window), so moves/up must be dispatched there.
		document.dispatchEvent(
			new PointerEvent("pointermove", {
				clientX: startX + 10,
				clientY: startY,
				pointerId: 2,
				bubbles: true,
			}),
		);
		await flush();
		for (let i = 1; i <= DRAG_EVENTS; i += 1) {
			document.dispatchEvent(
				new PointerEvent("pointermove", {
					clientX: startX + i * 5,
					clientY: startY,
					pointerId: 2,
					bubbles: true,
				}),
			);
			await flush();
		}
		document.dispatchEvent(
			new PointerEvent("pointerup", {
				clientX: startX + DRAG_EVENTS * 5,
				clientY: startY,
				pointerId: 2,
				bubbles: true,
			}),
		);
		await settle();

		// Sanity: the item must have moved, otherwise the bench is not
		// exercising the dnd path it claims to.
		const harness = container.querySelector("[data-testid='timeline-harness']") as HTMLElement;
		const regionStart = Number(harness.dataset.regionStart);
		expect(regionStart).not.toBe(FIXTURE_REGION.startMs);

		const count = profiler.count();
		console.info(`render.drag = ${count} commits over ${DRAG_EVENTS} moves`);
		expect(
			count,
			`render.drag (${count}) over budget ${getBudget("render.drag")}`,
		).toBeLessThanOrEqual(getBudget("render.drag"));
	});
});
