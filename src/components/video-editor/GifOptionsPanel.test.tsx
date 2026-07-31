import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GifOptionsPanel } from "./GifOptionsPanel";

describe("GifOptionsPanel", () => {
	const baseProps = {
		frameRate: 15 as const,
		onFrameRateChange: vi.fn(),
		loop: true,
		onLoopChange: vi.fn(),
		sizePreset: "medium" as const,
		onSizePresetChange: vi.fn(),
		outputDimensions: { width: 1280, height: 720 },
	};

	it("renders the frame rate, output size and loop controls", () => {
		const { container } = render(<GifOptionsPanel {...baseProps} />);
		expect(screen.getByText("Frame Rate")).toBeInTheDocument();
		expect(screen.getByText("Output Size")).toBeInTheDocument();
		expect(screen.getByText("Loop Animation")).toBeInTheDocument();
		expect(container.querySelector("[class*='#1a1a1f']")).toBeNull();
	});

	it("toggles loop animation through the switch", () => {
		const onLoopChange = vi.fn();
		render(<GifOptionsPanel {...baseProps} loop onLoopChange={onLoopChange} />);
		screen.getByRole("switch").click();
		expect(onLoopChange).toHaveBeenCalledWith(false);
	});

	it("shows the computed output dimensions", () => {
		render(<GifOptionsPanel {...baseProps} />);
		expect(screen.getByText(/1280 × 720px/)).toBeInTheDocument();
	});
});
