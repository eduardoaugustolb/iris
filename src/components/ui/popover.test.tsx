import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

describe("PopoverContent", () => {
	it("renders its content inside a Glass surface at level 3", () => {
		render(
			<Popover open={true}>
				<PopoverTrigger>Open</PopoverTrigger>
				<PopoverContent>Panel body</PopoverContent>
			</Popover>,
		);
		const body = screen.getByText("Panel body");
		const glassSurface = body.closest("[data-iris-glass]");
		expect(glassSurface).not.toBeNull();
		expect(glassSurface).toHaveAttribute("data-iris-glass", "3");
	});

	it("animates with the project's standard duration and easing curve", () => {
		render(
			<Popover open={true}>
				<PopoverTrigger>Open</PopoverTrigger>
				<PopoverContent>Panel body</PopoverContent>
			</Popover>,
		);
		const glassSurface = screen.getByText("Panel body").closest("[data-iris-glass]")
			?.parentElement as HTMLElement;
		expect(glassSurface.className).toContain("duration-standard");
		expect(glassSurface.className).toContain("ease-standard");
	});
});
