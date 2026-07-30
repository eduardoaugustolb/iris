// src/components/hud/RecordingControls.test.tsx
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RecordingControls, type RecordingControlsProps } from "./RecordingControls";

function mockReducedMotion(matches: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
	);
}

function setupAnimateMock() {
	const animate = vi.fn().mockReturnValue({ cancel: vi.fn() } as unknown as Animation);
	const originalAnimate = Element.prototype.animate;
	Element.prototype.animate = animate;
	return () => {
		Element.prototype.animate = originalAnimate;
	};
}

const t = ((key: string) => key) as RecordingControlsProps["t"];

const baseProps: RecordingControlsProps = {
	recording: true,
	paused: false,
	saving: false,
	elapsedSeconds: 12,
	hasSelectedSource: true,
	selectedSource: "Entire screen",
	t,
	onRecordButtonClick: vi.fn(),
	canPauseRecording: true,
	onTogglePaused: vi.fn(),
	onRestart: vi.fn(),
	onCancel: vi.fn(),
};

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("RecordingControls", () => {
	it("shows pause/restart/cancel only while recording", () => {
		mockReducedMotion(false);
		const cleanup = setupAnimateMock();
		const { rerender } = render(<RecordingControls {...baseProps} recording={false} />);
		expect(
			screen.queryByRole("button", { name: t("tooltips.pauseRecording") }),
		).not.toBeInTheDocument();
		rerender(<RecordingControls {...baseProps} recording={true} />);
		expect(screen.getByRole("button", { name: t("tooltips.pauseRecording") })).toBeInTheDocument();
		cleanup();
	});

	it("hides the pause control when the format doesn't support pausing", () => {
		mockReducedMotion(false);
		const cleanup = setupAnimateMock();
		render(<RecordingControls {...baseProps} canPauseRecording={false} />);
		expect(
			screen.queryByRole("button", { name: t("tooltips.pauseRecording") }),
		).not.toBeInTheDocument();
		cleanup();
	});

	it("wires restart and cancel", () => {
		mockReducedMotion(false);
		const cleanup = setupAnimateMock();
		const onRestart = vi.fn();
		const onCancel = vi.fn();
		render(<RecordingControls {...baseProps} onRestart={onRestart} onCancel={onCancel} />);
		fireEvent.click(screen.getByRole("button", { name: t("tooltips.restartRecording") }));
		fireEvent.click(screen.getByRole("button", { name: t("tooltips.cancelRecording") }));
		expect(onRestart).toHaveBeenCalledTimes(1);
		expect(onCancel).toHaveBeenCalledTimes(1);
		cleanup();
	});
});
