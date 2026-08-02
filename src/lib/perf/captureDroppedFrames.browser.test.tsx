import { Application, Graphics } from "pixi.js";
import { describe, expect, it } from "vitest";
import perfBudgets from "../../../perf-budgets.json";

/**
 * Capture-frame budget (browser mode, CI Linux, no native code). Drives the
 * real renderer (Pixi.js, same compositor VideoPlayback uses) with a
 * synthetic source — a moving waveform-style bar redrawn every display frame —
 * and measures dropped frames per minute from the requestAnimationFrame
 * cadence:
 *
 * - Record rAF timestamps for MEASURE_SECONDS while the synthetic source runs.
 * - The median inter-frame gap is the renderer's base cadence (cadence-relative,
 *   so it works whether headless Chromium fires at 30, 45 or 60 fps).
 * - A "long frame" is any gap > STALL_MULTIPLIER × the median — each one means
 *   the compositor missed a beat (a dropped/stalled frame).
 * - Extrapolate to dropped frames per minute and compare against the
 *   `capture.droppedFramesPerMinute` budget in perf-budgets.json.
 *
 * A per-frame render storm (e.g. an O(n²) per-tick loop, layout thrash, or a
 * WebGL leak) stretches those gaps and trips the budget. The sanity assertions
 * at the end keep a broken bench from passing silently.
 *
 * Calibration (budget 1200, ~2.4x the worst case): the synthetic source alone
 * sustains ~60 fps and measures 30-45 dropped/min (2-3 long frames over 4 s).
 * Running in the shared browser-test page (as CI does, after the exporter
 * tests) adds periodic GC/process stalls of 30-35 long frames per window —
 * measured 460-530 dropped/min with the base cadence intact. The budget sits
 * above that noise and still trips on a storm that drops a large fraction of
 * frames (a 50% frame loss at 60 fps alone yields ~1800 dropped/min).
 */

const MEASURE_SECONDS = 4;
const STALL_MULTIPLIER = 1.5;
const MIN_FRAMES = 2 * MEASURE_SECONDS * 10; // at least ~10 fps cadence

function getBudget(metric: string): number {
	const budget = perfBudgets.budgets.find((entry) => entry.metric === metric);
	if (!budget) {
		throw new Error(`missing budget ${metric} in perf-budgets.json`);
	}
	return budget.max;
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

describe("capture dropped-frame budget", () => {
	it("keeps dropped frames per minute under budget on a synthetic source", async () => {
		const app = new Application();
		await app.init({
			width: 640,
			height: 360,
			backgroundAlpha: 0,
			antialias: true,
			resolution: 1,
			autoDensity: true,
		});
		document.body.appendChild(app.canvas);

		const bar = new Graphics();
		app.stage.addChild(bar);

		let phase = 0;
		app.ticker.maxFPS = 60;
		// Synthetic source: a waveform that shifts every frame, like a captured
		// video frame being composited by the renderer.
		app.ticker.add(() => {
			bar.clear();
			for (let i = 0; i < 32; i += 1) {
				const height = 12 + ((i * 17 + phase) % 48);
				bar.rect(20 + i * 19, 180 - height / 2, 10, height).fill(0x5e5ce6);
			}
			phase += 1;
		});

		const timestamps: number[] = [];
		const start = performance.now();
		try {
			await new Promise<void>((resolve) => {
				const frame = () => {
					const now = performance.now();
					timestamps.push(now);
					if (now - start < MEASURE_SECONDS * 1000) {
						requestAnimationFrame(frame);
					} else {
						resolve();
					}
				};
				requestAnimationFrame(frame);
			});
		} finally {
			// destroy(true) removes the view from the DOM and stops the ticker.
			app.destroy(true, {
				children: true,
				texture: true,
				textureSource: true,
			});
		}

		const gaps: number[] = [];
		for (let i = 1; i < timestamps.length; i += 1) {
			gaps.push(timestamps[i] - timestamps[i - 1]);
		}

		// Sanity: the synthetic source must have actually run — otherwise the
		// bench is not measuring the renderer it claims to.
		expect(timestamps.length).toBeGreaterThan(MIN_FRAMES);
		const baseGap = median(gaps);
		expect(baseGap).toBeLessThan(100); // at least ~10 fps cadence

		const longFrames = gaps.filter((gap) => gap > baseGap * STALL_MULTIPLIER).length;
		const elapsedMinutes = (timestamps[timestamps.length - 1] - timestamps[0]) / 60_000;
		const droppedPerMinute = Math.round(longFrames / elapsedMinutes);

		console.info(
			`capture.droppedFramesPerMinute = ${droppedPerMinute} (${longFrames} long frames over ${Math.round(
				elapsedMinutes * 60_000,
			)} ms, base cadence ${Math.round(baseGap)} ms)`,
		);
		expect(
			droppedPerMinute,
			`capture.droppedFramesPerMinute (${droppedPerMinute}) over budget ${getBudget(
				"capture.droppedFramesPerMinute",
			)}`,
		).toBeLessThanOrEqual(getBudget("capture.droppedFramesPerMinute"));
	});
});
