import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { duration, easing } from "@/design/tokens/motion";
import { DiaphragmButton } from "./DiaphragmButton";

afterEach(() => {
	vi.restoreAllMocks();
});

function Subject({ recording, saving = false }: { recording: boolean; saving?: boolean }) {
	return (
		<DiaphragmButton
			recording={recording}
			paused={false}
			saving={saving}
			elapsedSeconds={0}
			hasSelectedSource={true}
			savingLabel="Saving…"
			title={recording ? "Recording" : "Start"}
			onClick={vi.fn()}
		/>
	);
}

function apertureWrapper() {
	return screen.getByTestId("launch-record-button").querySelector("svg")
		?.parentElement as HTMLElement;
}

describe("DiaphragmButton", () => {
	it("calls onClick when pressed", () => {
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
		render(<Subject recording={false} saving={true} />);
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

	it("dims the aperture when no source is selected yet", () => {
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
		expect(apertureWrapper()).toHaveStyle({ opacity: "0.45" });
	});

	it("carries the electronNoDrag class so clicking it doesn't drag the HUD window", () => {
		render(<Subject recording={false} />);
		expect(screen.getByTestId("launch-record-button").className).toContain("electronNoDrag");
	});

	it("renders a spinner and the saving label while saving, so the state is visible at all", () => {
		render(<Subject recording={false} saving={true} />);

		const spinner = screen.getByTestId("launch-record-saving-spinner");
		expect(spinner).toBeInTheDocument();
		expect(spinner.querySelector("svg")).toBeInTheDocument();
		expect(spinner.className).toContain("animate-spin");
		const button = screen.getByTestId("launch-record-button");
		expect(button.textContent).toContain("Saving…");
		// The aperture must not sit next to the spinner.
		expect(apertureWrapper()).toHaveStyle({ opacity: "0" });
	});

	it("crossfades the aperture into the recording dot when recording starts", () => {
		const animate = vi.fn(() => ({ cancel: vi.fn(), onfinish: null }) as unknown as Animation);
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = animate as unknown as typeof Element.prototype.animate;

		const { rerender } = render(<Subject recording={false} />);
		rerender(<Subject recording={true} />);

		// crossfade() animates exactly two elements: the aperture wrapper fading
		// out, the dot fading in.
		expect(animate).toHaveBeenCalledTimes(2);
		for (const [, options] of animate.mock.calls) {
			expect((options as KeyframeAnimationOptions).duration).toBe(duration.fast);
			expect((options as KeyframeAnimationOptions).easing).toBe(easing.standard);
		}
		const keyframeSets = animate.mock.calls.map(([keyframes]) => keyframes);
		expect(keyframeSets).toContainEqual([{ opacity: 1 }, { opacity: 0 }]);
		expect(keyframeSets).toContainEqual([{ opacity: 0 }, { opacity: 1 }]);

		Element.prototype.animate = originalAnimate;
	});

	it("crossfades the dot back into the aperture on a plain stop", () => {
		const animate = vi.fn(() => ({ cancel: vi.fn(), onfinish: null }) as unknown as Animation);
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = animate as unknown as typeof Element.prototype.animate;

		const { rerender } = render(<Subject recording={false} />);
		rerender(<Subject recording={true} />);
		const beforeStop = animate.mock.calls.length;
		rerender(<Subject recording={false} />);

		expect(animate.mock.calls.length - beforeStop).toBe(2);

		Element.prototype.animate = originalAnimate;
	});

	it("releases the crossfade once it finishes so the dimmed resting opacity can apply again", () => {
		const created: Array<{ cancel: ReturnType<typeof vi.fn>; onfinish: null | (() => void) }> = [];
		const animate = vi.fn(() => {
			const animation = { cancel: vi.fn(), onfinish: null };
			created.push(animation);
			return animation as unknown as Animation;
		});
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = animate as unknown as typeof Element.prototype.animate;

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
		for (const animation of crossfadeAnimations) {
			expect(animation.cancel).toHaveBeenCalled();
		}

		Element.prototype.animate = originalAnimate;
	});

	it("never fades the aperture back in when the stop lands together with saving", () => {
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

		const { rerender } = render(<Subject recording={false} />);
		const aperture = apertureWrapper();

		rerender(<Subject recording={true} />);
		const beforeStop = created.length;

		// The real flow: `useScreenRecorder` sets recording=false and saving=true in
		// one batched update, so the stop transition is detected in the same commit
		// that hands the button to the spinner.
		rerender(<Subject recording={false} saving={true} />);

		const stopAnimations = created.slice(beforeStop);
		// Nothing may animate the aperture wrapper: WAAPI keyframes outrank the
		// inline `opacity: 0`, so even a fade-in flashes it over the spinner.
		expect(stopAnimations.some((a) => a.element === aperture)).toBe(false);
		// The dot still fades out — recording really did stop.
		const dotFade = stopAnimations.find((a) => a.element !== aperture);
		expect(dotFade).toBeDefined();
		expect(dotFade?.keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);
		expect(aperture).toHaveStyle({ opacity: "0" });

		act(() => {
			dotFade?.onfinish?.();
		});
		expect(aperture).toHaveStyle({ opacity: "0" });

		Element.prototype.animate = originalAnimate;
	});
});
