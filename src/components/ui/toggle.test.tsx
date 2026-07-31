import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toggle } from "./toggle";

describe("Toggle", () => {
	it("paints the on state with the brand token, not the shadcn accent", () => {
		render(<Toggle defaultPressed>Mute</Toggle>);
		const toggle = screen.getByRole("button", { name: "Mute" });
		expect(toggle).toHaveAttribute("data-state", "on");
		expect(toggle.className).toContain("data-[state=on]:bg-[#5E5CE6]");
		expect(toggle.className).not.toContain("bg-accent");
	});
});
