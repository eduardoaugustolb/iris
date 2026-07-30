import { describe, expect, it } from "vitest";
import { contrastRatio, parseColor } from "./contrast";
import { color } from "./tokens/color";

describe("parseColor", () => {
	it("reads six-digit hex", () => {
		expect(parseColor("#5E5CE6")).toEqual({ r: 94, g: 92, b: 230, a: 1 });
	});

	it("reads rgba with alpha", () => {
		expect(parseColor("rgba(245,245,247,0.62)")).toEqual({ r: 245, g: 245, b: 247, a: 0.62 });
	});

	it("rejects anything else instead of guessing", () => {
		expect(() => parseColor("red")).toThrow();
	});
});

describe("contrastRatio", () => {
	it("gives 21 for black on white", () => {
		expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
	});

	it("gives 1 for a colour against itself", () => {
		expect(contrastRatio("#5E5CE6", "#5E5CE6")).toBeCloseTo(1, 5);
	});

	it("composites a translucent foreground over the background first", () => {
		const composited = contrastRatio(color.textSecondary, color.surfaceBase);
		const opaque = contrastRatio("#F5F5F7", color.surfaceBase);

		expect(composited).toBeLessThan(opaque);
	});
});

describe("design system contrast floor", () => {
	it("keeps primary text at or above 4.5:1 on the base surface", () => {
		expect(contrastRatio(color.textPrimary, color.surfaceBase)).toBeGreaterThanOrEqual(4.5);
	});

	it("keeps secondary text at or above 4.5:1 on the base surface", () => {
		expect(contrastRatio(color.textSecondary, color.surfaceBase)).toBeGreaterThanOrEqual(4.5);
	});

	it("keeps primary text at or above 4.5:1 on the raised surface", () => {
		expect(contrastRatio(color.textPrimary, color.surfaceRaised)).toBeGreaterThanOrEqual(4.5);
	});
});
