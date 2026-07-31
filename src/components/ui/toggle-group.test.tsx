import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

describe("ToggleGroupItem", () => {
	it("applies the migrated toggle variants, not legacy slate tokens", () => {
		render(
			<ToggleGroup type="single" aria-label="Options">
				<ToggleGroupItem value="a">Option A</ToggleGroupItem>
			</ToggleGroup>,
		);
		const item = screen.getByRole("radio", { name: "Option A" });
		expect(item.className).toContain("data-[state=on]:bg-[#5E5CE6]");
		expect(item.className).not.toContain("text-slate");
		expect(item.className).not.toContain("#34B27B");
	});
});
