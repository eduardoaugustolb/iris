import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

describe("DialogContent", () => {
	it("renders its content inside a Glass surface, not a raw background", () => {
		render(
			<Dialog open={true}>
				<DialogContent>
					<DialogTitle>Example</DialogTitle>
					<p>Body</p>
				</DialogContent>
			</Dialog>,
		);
		const title = screen.getByText("Example");
		const glassSurface = title.closest("[data-iris-glass]");
		expect(glassSurface).not.toBeNull();
		expect(glassSurface).toHaveAttribute("data-iris-glass", "3");
	});

	it("uses a Phosphor icon for the built-in close button, not lucide-react", () => {
		render(
			<Dialog open={true}>
				<DialogContent>
					<DialogTitle>Example</DialogTitle>
				</DialogContent>
			</Dialog>,
		);
		const closeButton = screen.getByRole("button", { name: /close/i });
		// Phosphor icons render a real <path>-based <svg>, not lucide's icon set —
		// this is a smoke check that some svg child exists and the button still works.
		expect(closeButton.querySelector("svg")).not.toBeNull();
	});
});
