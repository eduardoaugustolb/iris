import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SourceAudioControls, type SourceAudioControlsProps } from "./SourceAudioControls";

const t = ((key: string) => key) as SourceAudioControlsProps["t"];

const baseProps: SourceAudioControlsProps = {
	trayLayout: "horizontal",
	selectedSource: "Entire screen",
	onOpenSourceSelector: vi.fn(),
	recording: false,
	saving: false,
	systemAudioEnabled: false,
	onToggleSystemAudio: vi.fn(),
	microphoneEnabled: false,
	onToggleMicrophone: vi.fn(),
	webcamEnabled: false,
	onToggleWebcam: vi.fn(),
	supportsCursorModeToggle: false,
	cursorCaptureMode: "system",
	onToggleCursorMode: vi.fn(),
	t,
};

describe("SourceAudioControls", () => {
	it("opens the source selector on click", () => {
		const onOpen = vi.fn();
		render(<SourceAudioControls {...baseProps} onOpenSourceSelector={onOpen} />);
		fireEvent.click(screen.getByTestId("launch-source-selector-button"));
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it("toggles the microphone", () => {
		const onToggle = vi.fn();
		render(<SourceAudioControls {...baseProps} onToggleMicrophone={onToggle} />);
		fireEvent.click(screen.getByTestId("launch-microphone-button"));
		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it("disables source, audio and device toggles while recording", () => {
		render(<SourceAudioControls {...baseProps} recording={true} />);
		expect(screen.getByTestId("launch-source-selector-button")).toBeDisabled();
		expect(screen.getByTestId("launch-microphone-button")).toBeDisabled();
		expect(screen.getByTestId("launch-webcam-button")).toBeDisabled();
	});

	it("only shows the cursor mode button when supported", () => {
		const { rerender } = render(
			<SourceAudioControls {...baseProps} supportsCursorModeToggle={false} />,
		);
		expect(screen.queryByTestId("launch-cursor-mode-button")).not.toBeInTheDocument();
		rerender(<SourceAudioControls {...baseProps} supportsCursorModeToggle={true} />);
		expect(screen.getByTestId("launch-cursor-mode-button")).toBeInTheDocument();
	});
});
