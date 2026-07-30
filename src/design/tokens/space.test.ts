import { describe, expect, it } from "vitest";
import { elevation, isValidSpacing, radius, space } from "./space";

describe("space tokens", () => {
	it("is the base-4 scale from DESIGN.md section 6", () => {
		expect(space).toEqual({ 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 });
	});
});

describe("radius tokens", () => {
	it("is the fixed four-step scale from DESIGN.md section 5", () => {
		expect(radius).toEqual({ sm: 8, md: 14, lg: 20, xl: 28 });
	});
});

describe("elevation tokens", () => {
	it("raises backdrop blur and shadow blur together, never one alone", () => {
		expect(elevation).toEqual({
			1: { backdropBlurPx: 12, shadowBlurPx: 8 },
			2: { backdropBlurPx: 24, shadowBlurPx: 32 },
			3: { backdropBlurPx: 40, shadowBlurPx: 48 },
		});
	});
});

describe("isValidSpacing", () => {
	it("accepts values on the scale", () => {
		expect(isValidSpacing(16)).toBe(true);
		expect(isValidSpacing(64)).toBe(true);
	});

	it("rejects values off the scale, including the tempting ones", () => {
		expect(isValidSpacing(13)).toBe(false);
		expect(isValidSpacing(17)).toBe(false);
		expect(isValidSpacing(20)).toBe(false);
	});
});
