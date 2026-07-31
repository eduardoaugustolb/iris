import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Label } from "./label";

describe("Label", () => {
	it("renders on the text-primary token at the 13px caption size", () => {
		render(<Label htmlFor="field">Field name</Label>);
		const label = screen.getByText("Field name");
		expect(label.className).toContain("text-[13px]");
		expect(label.className).toContain("text-[#F5F5F7]");
	});
});
