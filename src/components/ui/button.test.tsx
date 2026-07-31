import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
	it("paints the primary action with the brand token, not a shadcn hsl color", () => {
		render(<Button>Confirm</Button>);
		const button = screen.getByRole("button", { name: "Confirm" });
		expect(button.className).toContain("bg-[#5E5CE6]");
		expect(button.className).not.toMatch(/bg-primary\b/);
	});

	it("uses the radius-md token and 32px height from DESIGN.md section 9", () => {
		render(<Button>Confirm</Button>);
		const button = screen.getByRole("button", { name: "Confirm" });
		expect(button.className).toContain("rounded-[14px]");
		expect(button.className).toContain("h-8");
	});

	it("switches to the brand hover token", async () => {
		const user = userEvent.setup();
		render(<Button>Confirm</Button>);
		const button = screen.getByRole("button", { name: "Confirm" });
		await user.hover(button);
		expect(button.className).toContain("hover:bg-[#8886F0]");
	});

	it("does not reference the legacy shadcn theme variables", () => {
		render(
			<>
				<Button variant="outline">Outline</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="destructive">Delete</Button>
				<Button variant="link">Link</Button>
			</>,
		);
		for (const name of ["Outline", "Ghost", "Delete", "Link"]) {
			const button = screen.getByRole("button", { name });
			expect(button.className).not.toMatch(
				/bg-(primary|secondary|destructive|accent|background|muted|popover|card)\b/,
			);
			expect(button.className).not.toMatch(/text-(primary|accent|foreground)/);
		}
	});
});
