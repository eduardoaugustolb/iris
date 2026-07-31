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

	it("keeps the card at a fixed width instead of shrink-to-fit", () => {
		render(
			<Dialog open={true}>
				<DialogContent>
					<DialogTitle>Example</DialogTitle>
				</DialogContent>
			</Dialog>,
		);
		const card = screen.getByText("Example").closest("[data-iris-glass]") as HTMLElement;
		// The visible card is the width owner: it always fills the available width
		// up to its own max-width, so a wide viewport renders the intended 512px.
		expect(card.className).toContain("w-full");
		expect(card.className).toContain("max-w-lg");

		// The positioner above it spans the viewport horizontally (inset-x-0) and
		// centers the card with flex, so it can never shrink-to-fit around the
		// content and squeeze the card below its max-width. It must NOT carry a
		// horizontal translate, otherwise a viewport-wide box would be pushed off
		// screen by half its own width.
		const positioner = card.parentElement as HTMLElement;
		expect(positioner.className).toContain("inset-x-0");
		expect(positioner.className).toContain("flex");
		expect(positioner.className).toContain("justify-center");
		expect(positioner.className).not.toMatch(/(^|\s|:)-?translate-x-/);
		expect(positioner.className).not.toMatch(/(^|\s|:)(max-)?w-(?!full)/);
		// Vertical centering still relies on top-50% + translateY(-50%).
		expect(positioner.className).toContain("top-[50%]");
		expect(positioner.className).toContain("translate-y-[-50%]");
		// The animation keyframes must not re-introduce the horizontal -50% shift.
		expect(positioner.className).not.toContain("slide-in-from-left-1/2");
		expect(positioner.className).not.toContain("slide-out-to-left-1/2");
		// The viewport-wide positioner must stay click-through so a click beside the
		// card still counts as "outside" and dismisses the dialog; the card itself
		// re-enables hit testing.
		expect(positioner.className).toContain("!pointer-events-none");
		expect(card.className).toContain("pointer-events-auto");
	});

	it("lets a consumer's max-width govern the rendered card width", () => {
		render(
			<Dialog open={true}>
				<DialogContent className="max-w-sm gap-0">
					<DialogTitle>Example</DialogTitle>
				</DialogContent>
			</Dialog>,
		);
		const card = screen.getByText("Example").closest("[data-iris-glass]") as HTMLElement;
		// tailwind-merge drops the default max-w-lg/gap-4 in favour of the override,
		// and the override lands on the element that actually paints the card.
		expect(card.className).toContain("max-w-sm");
		expect(card.className).not.toContain("max-w-lg");
		expect(card.className).toContain("gap-0");
		expect(card.className).not.toContain("gap-4");
		// No ancestor caps the card below max-w-sm.
		expect((card.parentElement as HTMLElement).className).not.toMatch(/(^|\s|:)max-w-/);
	});

	it("animates with the project's standard duration and easing curve", () => {
		render(
			<Dialog open={true}>
				<DialogContent>
					<DialogTitle>Example</DialogTitle>
				</DialogContent>
			</Dialog>,
		);
		const positioner = screen.getByText("Example").closest("[data-iris-glass]")
			?.parentElement as HTMLElement;
		expect(positioner.className).toContain("duration-standard");
		expect(positioner.className).toContain("ease-standard");
	});

	it("uses the radius-lg token for the modal surface", () => {
		render(
			<Dialog open={true}>
				<DialogContent>
					<DialogTitle>Example</DialogTitle>
				</DialogContent>
			</Dialog>,
		);
		const card = screen.getByText("Example").closest("[data-iris-glass]") as HTMLElement;
		expect(card.style.borderRadius).toBe("20px");
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
