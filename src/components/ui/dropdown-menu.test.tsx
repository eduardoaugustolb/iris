import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
});
