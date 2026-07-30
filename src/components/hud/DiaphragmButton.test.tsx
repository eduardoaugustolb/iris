import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { duration, easing } from "@/design/tokens/motion";
import { DiaphragmButton } from "./DiaphragmButton";

function mockReducedMotion(matches: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

function Subject({ recording }: { recording: boolean }) {
	return (
		<DiaphragmButton
			recording={recording}
			paused={false}
			saving={false}
			elapsedSeconds={0}
			hasSelectedSource={true}
			savingLabel="Saving…"
			title={recording ? "Recording" : "Start"}
			onClick={vi.fn()}
		/>
	);
}

describe("DiaphragmButton", () => {
	it("calls onClick when pressed", () => {
		mockReducedMotion(false);
		const onClick = vi.fn();
		render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Select a source"
				onClick={onClick}
			/>,
		);
		fireEvent.click(screen.getByTestId("launch-record-button"));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("is disabled while saving", () => {
		render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={true}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Saving"
				onClick={vi.fn()}
			/>,
		);
		expect(screen.getByTestId("launch-record-button")).toBeDisabled();
	});

	it("renders the timer while recording", () => {
		render(
			<DiaphragmButton
				recording={true}
				paused={false}
				saving={false}
				elapsedSeconds={65}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Recording"
				onClick={vi.fn()}
			/>,
		);
		expect(screen.getByText("01:05")).toBeInTheDocument();
	});

	it("dims the diaphragm when no source is selected yet", () => {
		render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={false}
				savingLabel="Saving…"
				title="Select a source"
				onClick={vi.fn()}
			/>,
		);
		const blades = screen.getByTestId("launch-record-button").querySelector("svg")
			?.parentElement as HTMLElement;
		expect(blades).toHaveStyle({ opacity: "0.45" });
	});

	it("animates every blade with the spring curve when starting to record, unless reduced motion is on", () => {
		mockReducedMotion(false);
		const animate = vi.fn().mockReturnValue({} as Animation);
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = animate;

		const { rerender } = render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Start"
				onClick={vi.fn()}
			/>,
		);
		rerender(
			<DiaphragmButton
				recording={true}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Recording"
				onClick={vi.fn()}
			/>,
		);

		expect(animate).toHaveBeenCalled();
		const bladeCalls = animate.mock.calls.filter(
			([, options]) => options?.easing === easing.spring,
		);
		expect(bladeCalls.length).toBe(6);
		for (const [, options] of bladeCalls) {
			expect(options.duration).toBe(duration.slow);
		}

		Element.prototype.animate = originalAnimate;
	});

	it("crossfades instead of rotating blades when reduced motion is requested", () => {
		mockReducedMotion(true);
		const animate = vi.fn().mockReturnValue({} as Animation);
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = animate;

		const { rerender } = render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Start"
				onClick={vi.fn()}
			/>,
		);
		rerender(
			<DiaphragmButton
				recording={true}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Recording"
				onClick={vi.fn()}
			/>,
		);

		const springCalls = animate.mock.calls.filter(
			([, options]) => options?.easing === easing.spring,
		);
		expect(springCalls.length).toBe(0);
		const fastCalls = animate.mock.calls.filter(
			([, options]) => options?.duration === duration.fast,
		);
		expect(fastCalls.length).toBeGreaterThan(0);

		Element.prototype.animate = originalAnimate;
	});

	it("uses the standard easing token (never implicit linear) for the dot's reveal animation", () => {
		mockReducedMotion(false);
		const animate = vi.fn().mockReturnValue({ cancel: vi.fn() } as unknown as Animation);
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = animate;

		const { rerender } = render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Start"
				onClick={vi.fn()}
			/>,
		);
		rerender(
			<DiaphragmButton
				recording={true}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Recording"
				onClick={vi.fn()}
			/>,
		);

		const dotRevealCall = animate.mock.calls.find(
			([, options]) => options?.delay === duration.slow - duration.fast,
		);
		expect(dotRevealCall?.[1]).toMatchObject({
			duration: duration.fast,
			easing: easing.standard,
		});

		Element.prototype.animate = originalAnimate;
	});

	it("cancels the blade animations on stop so the diaphragm returns to its static appearance", () => {
		mockReducedMotion(false);
		const cancel = vi.fn();
		const animate = vi.fn().mockReturnValue({ cancel } as unknown as Animation);
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = animate;

		const { rerender } = render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Start"
				onClick={vi.fn()}
			/>,
		);
		rerender(
			<DiaphragmButton
				recording={true}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Recording"
				onClick={vi.fn()}
			/>,
		);
		expect(cancel).not.toHaveBeenCalled();

		rerender(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Start"
				onClick={vi.fn()}
			/>,
		);

		// One cancel() per blade — the closeDiaphragm animations are `fill:
		// "forwards"`, so without cancelling them the blades stay pinned at
		// their closed opacity/transform even after the wrapper fades back in.
		expect(cancel).toHaveBeenCalledTimes(6);

		Element.prototype.animate = originalAnimate;
	});

	it("carries the electronNoDrag class so clicking it doesn't drag the HUD window", () => {
		render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Start"
				onClick={vi.fn()}
			/>,
		);
		expect(screen.getByTestId("launch-record-button").className).toContain("electronNoDrag");
	});
	it("renders a spinner and the saving label while saving, so the state is visible at all", () => {
		render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={true}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Saving…"
				onClick={vi.fn()}
			/>,
		);

		const spinner = screen.getByTestId("launch-record-saving-spinner");
		expect(spinner).toBeInTheDocument();
		// The sprite symbol added for exactly this state.
		expect(spinner.querySelector("use")?.getAttribute("href")).toBe("#icon-spinner");
		// jsdom can't run the CSS animation, but the class that drives it is the
		// mechanism — its absence is what made the original regression invisible.
		expect(spinner.className).toContain("animate-spin");
		const button = screen.getByTestId("launch-record-button");
		expect(button.textContent).toContain("Saving…");
		// The diaphragm must not sit next to the spinner.
		const blades = button.querySelector("svg")?.parentElement as HTMLElement;
		expect(blades).toHaveStyle({ opacity: "0" });
	});

	it("gives every blade its own start angle so they converge instead of collapsing as one shape", () => {
		mockReducedMotion(false);
		const animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation);
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = animate;

		const { rerender } = render(<Subject recording={false} />);
		rerender(<Subject recording={true} />);

		const bladeKeyframes = animate.mock.calls
			.filter(([, options]) => (options as KeyframeAnimationOptions)?.easing === easing.spring)
			.map(([keyframes]) => keyframes as Array<{ transform: string }>);

		expect(bladeKeyframes.length).toBe(6);
		const starts = bladeKeyframes.map((frames) => frames[0].transform);
		// Six blades, six distinct resting angles, 60 degrees apart. A WAAPI
		// transform keyframe outranks the SVG transform presentation attribute
		// that spaces them, so a shared start angle would stack all six.
		expect(starts).toEqual([
			"rotate(0deg) scale(1)",
			"rotate(60deg) scale(1)",
			"rotate(120deg) scale(1)",
			"rotate(180deg) scale(1)",
			"rotate(240deg) scale(1)",
			"rotate(300deg) scale(1)",
		]);
		expect(new Set(starts).size).toBe(6);
		expect(bladeKeyframes.map((frames) => frames[1].transform)).toEqual([
			"rotate(35deg) scale(0.15)",
			"rotate(95deg) scale(0.15)",
			"rotate(155deg) scale(0.15)",
			"rotate(215deg) scale(0.15)",
			"rotate(275deg) scale(0.15)",
			"rotate(335deg) scale(0.15)",
		]);

		Element.prototype.animate = originalAnimate;
	});

	it("pins each blade's animated pivot to the same point its static rotation uses", () => {
		render(<Subject recording={false} />);

		const paths = Array.from(screen.getByTestId("launch-record-button").querySelectorAll("path"));
		expect(paths.length).toBe(6);
		for (const path of paths) {
			expect(path.getAttribute("transform")).toMatch(/^rotate\(-?\d+ 10 10\)$/);
			expect((path as SVGPathElement).style.transformBox).toBe("view-box");
			expect((path as SVGPathElement).style.transformOrigin).toBe("10px 10px");
		}
	});

	it("keeps the blades painted until the close animation finishes, instead of playing it inside an invisible subtree", () => {
		mockReducedMotion(false);
		const created: Array<{ cancel: ReturnType<typeof vi.fn>; onfinish: null | (() => void) }> = [];
		const animate = vi.fn(() => {
			const animation = { cancel: vi.fn(), onfinish: null };
			created.push(animation);
			return animation as unknown as Animation;
		});
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = animate;

		const { rerender } = render(<Subject recording={false} />);
		const blades = screen.getByTestId("launch-record-button").querySelector("svg")
			?.parentElement as HTMLElement;

		rerender(<Subject recording={true} />);

		// The commit that schedules closeDiaphragm must NOT already hide the
		// wrapper — the browser's first paint after it would otherwise run the
		// whole 420ms blade close at opacity 0.
		expect(blades).toHaveStyle({ opacity: "1" });

		const settled = created.filter((a) => a.onfinish !== null).pop();
		expect(settled).toBeDefined();
		act(() => {
			settled?.onfinish?.();
		});

		expect(blades).toHaveStyle({ opacity: "0" });

		Element.prototype.animate = originalAnimate;
	});

	it("fills the dot's delayed reveal backwards too, so it doesn't flash before fading in", () => {
		mockReducedMotion(false);
		const animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation);
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = animate;

		const { rerender } = render(<Subject recording={false} />);
		rerender(<Subject recording={true} />);

		const dotRevealCall = animate.mock.calls.find(
			([, options]) =>
				(options as KeyframeAnimationOptions)?.delay === duration.slow - duration.fast,
		);
		// "forwards" leaves the delay window unfilled, so the dot would render at
		// its React inline opacity: 1 for ~270ms and then snap to 0.
		expect((dotRevealCall?.[1] as KeyframeAnimationOptions)?.fill).toBe("both");

		Element.prototype.animate = originalAnimate;
	});

	it("releases the stop crossfade once it finishes so the dimmed resting opacity can apply again", () => {
		mockReducedMotion(false);
		const created: Array<{ cancel: ReturnType<typeof vi.fn>; onfinish: null | (() => void) }> = [];
		const animate = vi.fn(() => {
			const animation = { cancel: vi.fn(), onfinish: null };
			created.push(animation);
			return animation as unknown as Animation;
		});
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = animate;

		const { rerender } = render(<Subject recording={false} />);
		rerender(<Subject recording={true} />);
		const beforeStop = created.length;
		rerender(<Subject recording={false} />);

		const crossfadeAnimations = created.slice(beforeStop);
		expect(crossfadeAnimations.length).toBe(2);
		const settle = crossfadeAnimations.find((a) => a.onfinish !== null);
		expect(settle).toBeDefined();
		act(() => {
			settle?.onfinish?.();
		});
		// `crossfade` fills forwards, pinning the wrapper at opacity 1 forever and
		// clobbering the `hasSelectedSource ? 1 : 0.45` dimmed state. Cancelling on
		// finish hands control back to the inline style.
		for (const animation of crossfadeAnimations) {
			expect(animation.cancel).toHaveBeenCalled();
		}

		Element.prototype.animate = originalAnimate;
	});

	it("never fades the blades back in when the stop lands together with saving", () => {
		mockReducedMotion(false);
		const created: Array<{
			element: Element;
			keyframes: unknown;
			cancel: ReturnType<typeof vi.fn>;
			onfinish: null | (() => void);
		}> = [];
		const originalAnimate = Element.prototype.animate;
		const animate = vi.fn(function (this: Element, keyframes: unknown) {
			const animation = { element: this, keyframes, cancel: vi.fn(), onfinish: null };
			created.push(animation);
			return animation as unknown as Animation;
		});
		Element.prototype.animate = animate as unknown as typeof Element.prototype.animate;

		const { rerender } = render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Start"
				onClick={vi.fn()}
			/>,
		);
		const blades = screen.getByTestId("launch-record-button").querySelector("svg")
			?.parentElement as HTMLElement;

		rerender(
			<DiaphragmButton
				recording={true}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Recording"
				onClick={vi.fn()}
			/>,
		);
		const beforeStop = created.length;

		// The real flow: `useScreenRecorder` sets recording=false and saving=true in
		// one batched update, so the stop transition is detected in the same commit
		// that hands the button to the spinner.
		rerender(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={true}
				elapsedSeconds={0}
				hasSelectedSource={true}
				savingLabel="Saving…"
				title="Saving…"
				onClick={vi.fn()}
			/>,
		);

		const stopAnimations = created.slice(beforeStop);
		// Nothing may animate the blades wrapper: WAAPI keyframes outrank the
		// inline `opacity: 0`, so even a 150ms fade-in flashes the blades over the
		// spinner.
		expect(stopAnimations.some((a) => a.element === blades)).toBe(false);
		// The dot still fades out — recording really did stop.
		const dotFade = stopAnimations.find((a) => a.element !== blades);
		expect(dotFade).toBeDefined();
		expect(dotFade?.keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);
		expect(blades).toHaveStyle({ opacity: "0" });

		// …and it stays hidden after that fade settles and releases its fill.
		act(() => {
			dotFade?.onfinish?.();
		});
		expect(blades).toHaveStyle({ opacity: "0" });

		Element.prototype.animate = originalAnimate;
	});
});
