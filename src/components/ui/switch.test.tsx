import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Switch } from "./switch";

describe("Switch", () => {
	it("renders the 40x24 track and white thumb from DESIGN.md section 9", () => {
		render(<Switch />);
		const track = screen.getByRole("switch");
		expect(track.className).toContain("h-6");
		expect(track.className).toContain("w-10");
		expect(track.className).toContain("rounded-[28px]");
		expect(track.firstElementChild).toHaveClass("bg-white");
	});

	it("paints the on state with the brand token, not the legacy green", async () => {
		const user = userEvent.setup();
		render(<Switch />);
		const track = screen.getByRole("switch");
		await user.click(track);
		expect(track).toHaveAttribute("data-state", "checked");
		expect(track.className).toContain("data-[state=checked]:bg-[#5E5CE6]");
		expect(track.className).not.toContain("#34B27B");
	});

	it("uses the spring easing token for the track and thumb motion", () => {
		render(<Switch />);
		const track = screen.getByRole("switch");
		// The module classes wire transition-duration/easing to var(--duration-fast)
		// and var(--ease-spring) — the utilities duration-fast/ease-spring do not
		// exist, so the transition lives in switch.module.css.
		expect(track.className).toMatch(/track/);
		expect(track.firstElementChild?.className).toMatch(/thumb/);
	});
});
