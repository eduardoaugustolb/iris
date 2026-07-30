import { describe, expect, it } from "vitest";
import { duration, easing, isWithinResponseBudget } from "./motion";

describe("easing tokens", () => {
	it("is exactly the two curves from DESIGN.md section 8, never a third", () => {
		expect(easing).toEqual({
			standard: "cubic-bezier(0.32, 0.72, 0, 1)",
			spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
		});
	});
});

describe("duration tokens", () => {
	it("is the three fixed durations from DESIGN.md section 8", () => {
		expect(duration).toEqual({ fast: 150, standard: 280, slow: 420 });
	});
});

describe("isWithinResponseBudget", () => {
	it("accepts anything up to the 400ms Doherty threshold", () => {
		expect(isWithinResponseBudget(150)).toBe(true);
		expect(isWithinResponseBudget(400)).toBe(true);
	});

	it("rejects anything past it", () => {
		expect(isWithinResponseBudget(401)).toBe(false);
		expect(isWithinResponseBudget(1000)).toBe(false);
	});

	it("confirms the documented slow exception (HUD entering/leaving) genuinely exceeds the budget", () => {
		expect(isWithinResponseBudget(duration.slow)).toBe(false);
	});
});
