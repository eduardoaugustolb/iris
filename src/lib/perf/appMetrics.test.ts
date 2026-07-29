import { describe, expect, it } from "vitest";
import {
	type ProcessMetric,
	residentByTypeKb,
	toMemoryMeasurements,
	totalResidentKb,
} from "./appMetrics";

const metrics: ProcessMetric[] = [
	{ type: "Browser", memory: { workingSetSize: 120_000 } },
	{ type: "Tab", memory: { workingSetSize: 80_000 } },
	{ type: "Tab", memory: { workingSetSize: 60_000 } },
	{ type: "GPU", memory: { workingSetSize: 40_000 } },
];

describe("totalResidentKb", () => {
	it("sums every process, because a window we forgot still costs memory", () => {
		expect(totalResidentKb(metrics)).toBe(300_000);
	});

	it("returns zero for no processes", () => {
		expect(totalResidentKb([])).toBe(0);
	});
});

describe("residentByTypeKb", () => {
	it("groups by process type so renderer growth is visible on its own", () => {
		expect(residentByTypeKb(metrics)).toEqual({ Browser: 120_000, Tab: 140_000, GPU: 40_000 });
	});
});

describe("toMemoryMeasurements", () => {
	it("emits a total and a per-type metric namespaced by phase", () => {
		expect(toMemoryMeasurements(metrics, "idle")).toEqual([
			{ metric: "memory.idle.total", value: 300_000 },
			{ metric: "memory.idle.Browser", value: 120_000 },
			{ metric: "memory.idle.Tab", value: 140_000 },
			{ metric: "memory.idle.GPU", value: 40_000 },
		]);
	});
});
