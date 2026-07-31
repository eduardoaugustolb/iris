import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

describe("SelectContent", () => {
	beforeAll(() => {
		// Radix Select scrolls the selected item into view on open.
		Element.prototype.scrollIntoView = () => {
			/* jsdom lacks it */
		};
	});
	it("renders its options inside a Glass surface at level 3", async () => {
		render(
			<Select open={true}>
				<SelectTrigger>
					<SelectValue placeholder="Pick one" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="a">Alpha</SelectItem>
				</SelectContent>
			</Select>,
		);
		const item = await screen.findByText("Alpha");
		const glassSurface = item.closest("[data-iris-glass]");
		expect(glassSurface).not.toBeNull();
		expect(glassSurface).toHaveAttribute("data-iris-glass", "3");
	});

	it("uses the radius-lg token via Glass and the standard easing on the positioner", async () => {
		render(
			<Select open={true}>
				<SelectTrigger>
					<SelectValue placeholder="Pick one" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="a">Alpha</SelectItem>
				</SelectContent>
			</Select>,
		);
		const item = await screen.findByText("Alpha");
		const glassSurface = item.closest("[data-iris-glass]") as HTMLElement;
		expect(glassSurface.style.borderRadius).toBe("20px");
		const positioner = glassSurface.parentElement as HTMLElement;
		expect(positioner.className).toContain("duration-standard");
		expect(positioner.className).toContain("ease-standard");
	});

	it("paints the trigger on the raised surface token, not the shadcn hsl theme", () => {
		render(
			<Select>
				<SelectTrigger aria-label="Pick one">
					<SelectValue placeholder="Pick one" />
				</SelectTrigger>
			</Select>,
		);
		const trigger = screen.getByRole("combobox");
		expect(trigger.className).toContain("bg-[#141416]");
		expect(trigger.className).not.toMatch(/bg-(background|popover|muted)/);
	});

	it("uses a Phosphor icon for the trigger chevron, not lucide-react", () => {
		render(
			<Select>
				<SelectTrigger aria-label="Pick one">
					<SelectValue placeholder="Pick one" />
				</SelectTrigger>
			</Select>,
		);
		const trigger = screen.getByRole("combobox");
		expect(trigger.querySelector("svg")).not.toBeNull();
		expect(trigger.innerHTML).not.toContain("lucide");
	});
});
