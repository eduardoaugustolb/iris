import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecordingTimer } from "./RecordingTimer";

describe("RecordingTimer", () => {
	it("formats elapsed seconds as mm:ss", () => {
		render(<RecordingTimer elapsedSeconds={125} paused={false} />);
		expect(screen.getByText("02:05")).toBeInTheDocument();
	});

	it("uses the recording colour while active", () => {
		render(<RecordingTimer elapsedSeconds={5} paused={false} />);
		expect(screen.getByText("00:05")).toHaveStyle({ color: "#FF453A" });
	});

	it("uses the warning colour while paused", () => {
		render(<RecordingTimer elapsedSeconds={5} paused={true} />);
		expect(screen.getByText("00:05")).toHaveStyle({ color: "#FF9F0A" });
	});

	it("does not re-render when props are referentially equal across parent re-renders", () => {
		let renderCount = 0;
		function Probe({ elapsedSeconds, paused }: { elapsedSeconds: number; paused: boolean }) {
			renderCount += 1;
			return <RecordingTimer elapsedSeconds={elapsedSeconds} paused={paused} />;
		}
		const { rerender } = render(<Probe elapsedSeconds={1} paused={false} />);
		expect(renderCount).toBe(1);
		rerender(<Probe elapsedSeconds={1} paused={false} />);
		expect(renderCount).toBe(2);
	});
});
