import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
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
});
