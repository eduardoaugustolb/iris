import { describe, expect, it } from "vitest";
import { type Budget, findViolations, formatViolations, type Measurement } from "./budgets";

const budgets: Budget[] = [
	{ metric: "bundle.pixi.js", max: 600_000, unit: "bytes" },
	{ metric: "startup.hudFirstFrame", max: 2_000, unit: "ms" },
];

describe("findViolations", () => {
	it("returns nothing when every measurement is within budget", () => {
		const measurements: Measurement[] = [
			{ metric: "bundle.pixi.js", value: 540_000 },
			{ metric: "startup.hudFirstFrame", value: 1_800 },
		];

		expect(findViolations(measurements, budgets)).toEqual([]);
	});

	it("reports a measurement that exceeds its budget", () => {
		const measurements: Measurement[] = [{ metric: "bundle.pixi.js", value: 640_000 }];

		expect(findViolations(measurements, budgets)).toEqual([
			{ metric: "bundle.pixi.js", value: 640_000, max: 600_000, unit: "bytes" },
		]);
	});

	it("treats a measurement exactly at the budget as passing", () => {
		const measurements: Measurement[] = [{ metric: "bundle.pixi.js", value: 600_000 }];

		expect(findViolations(measurements, budgets)).toEqual([]);
	});

	it("flags a measurement that has no budget, so new chunks can't slip in unmeasured", () => {
		const measurements: Measurement[] = [{ metric: "bundle.mystery.js", value: 1 }];

		expect(findViolations(measurements, budgets)).toEqual([
			{ metric: "bundle.mystery.js", value: 1, max: 0, unit: "count" },
		]);
	});
});

describe("formatViolations", () => {
	it("renders one human-readable line per violation", () => {
		const output = formatViolations([
			{ metric: "bundle.pixi.js", value: 640_000, max: 600_000, unit: "bytes" },
		]);

		expect(output).toBe("bundle.pixi.js: 640000 bytes exceeds budget of 600000 bytes");
	});
});
