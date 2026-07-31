import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./input";

describe("Input", () => {
	it("paints the field on the raised surface token, not the shadcn hsl theme", () => {
		render(<Input aria-label="name" placeholder="Type here" />);
		const field = screen.getByRole("textbox");
		expect(field.className).toContain("bg-[#141416]");
		expect(field.className).toContain("text-[#F5F5F7]");
		expect(field.className).not.toMatch(/bg-(background|muted)/);
	});

	it("keeps the brand focus ring and the surface-offset ring color", () => {
		render(<Input aria-label="name" placeholder="Type here" />);
		const field = screen.getByRole("textbox");
		expect(field.className).toContain("focus-visible:ring-[#5E5CE6]");
		expect(field.className).toContain("focus-visible:ring-offset-[#0A0A0C]");
	});
});
