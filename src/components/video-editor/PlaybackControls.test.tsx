import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlaybackControls from "./PlaybackControls";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

const baseProps = {
	currentTime: 0,
	duration: 0,
	onTogglePlayPause: vi.fn(),
	onSeek: vi.fn(),
};

describe("PlaybackControls", () => {
	it("formats the current time and duration", () => {
		render(
			<PlaybackControls {...baseProps} isPlaying={false} currentTime={125.5} duration={300} />,
		);
		expect(screen.getByText("2:05")).toBeInTheDocument();
		expect(screen.getByText("5:00")).toBeInTheDocument();
	});

	it("toggles play/pause through the labeled button", () => {
		render(<PlaybackControls {...baseProps} isPlaying={false} />);
		screen.getByRole("button", { name: "common.playback.play" }).click();
		expect(baseProps.onTogglePlayPause).toHaveBeenCalled();
	});

	it("paints the progress fill with brand primary and keeps the bar flat (no backdrop blur)", () => {
		const { container } = render(
			<PlaybackControls {...baseProps} isPlaying currentTime={60} duration={120} />,
		);
		expect(container.querySelector("[class*='bg-[#5E5CE6]']")).not.toBeNull();
		expect(container.querySelector("[class*='backdrop-blur']")).toBeNull();
	});

	it("renders the fullscreen toggle only when a handler is provided", () => {
		render(<PlaybackControls {...baseProps} isPlaying={false} />);
		expect(screen.queryByRole("button", { name: "common.playback.fullscreen" })).toBeNull();

		render(<PlaybackControls {...baseProps} isPlaying={false} onToggleFullscreen={vi.fn()} />);
		expect(screen.getByRole("button", { name: "common.playback.fullscreen" })).toBeInTheDocument();
	});
});
