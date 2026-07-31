import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "./dropdown-menu";

describe("DropdownMenuContent", () => {
	beforeAll(() => {
		// Radix relies on pointer-capture / scroll APIs jsdom does not implement.
		Element.prototype.hasPointerCapture = () => false;
		Element.prototype.releasePointerCapture = () => {};
		Element.prototype.scrollIntoView = () => {};
	});

	it("renders its items inside a Glass surface, not a raw background", async () => {
		render(
			<DropdownMenu open={true}>
				<DropdownMenuTrigger>Open</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>Example item</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>,
		);
		const item = await screen.findByText("Example item");
		const glassSurface = item.closest("[data-iris-glass]");
		expect(glassSurface).not.toBeNull();
		expect(glassSurface).toHaveAttribute("data-iris-glass", "3");
	});

	it("uses the radius-lg token and the project's standard easing curve", async () => {
		render(
			<DropdownMenu open={true}>
				<DropdownMenuTrigger>Open</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>Example item</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>,
		);
		const item = await screen.findByText("Example item");
		const glassSurface = item.closest("[data-iris-glass]") as HTMLElement;
		// Popovers/menus are radius-lg (DESIGN.md §5) — Glass's own default.
		expect(glassSurface.style.borderRadius).toBe("20px");

		const positioner = glassSurface.parentElement as HTMLElement;
		expect(positioner.className).toContain("duration-[280ms]");
		expect(positioner.className).toContain("ease-[cubic-bezier(0.32,0.72,0,1)]");
	});

	it("gives submenus the same radius and easing as top-level menus", async () => {
		render(
			<DropdownMenu open={true}>
				<DropdownMenuTrigger>Open</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuSub open={true}>
						<DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuItem>Sub item</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuContent>
			</DropdownMenu>,
		);
		const item = await screen.findByText("Sub item");
		const glassSurface = item.closest("[data-iris-glass]") as HTMLElement;
		expect(glassSurface).toHaveAttribute("data-iris-glass", "3");
		expect(glassSurface.style.borderRadius).toBe("20px");

		const positioner = glassSurface.parentElement as HTMLElement;
		expect(positioner.className).toContain("duration-[280ms]");
		expect(positioner.className).toContain("ease-[cubic-bezier(0.32,0.72,0,1)]");
	});
});
