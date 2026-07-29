import { describe, expect, it } from "vitest";
import { type AssetFile, chunkNameFromFile, toMeasurements } from "./bundleSize";

describe("chunkNameFromFile", () => {
	it("strips the Vite content hash so budgets survive a rebuild", () => {
		expect(chunkNameFromFile("VideoEditor-DHSCG_Jh.js")).toBe("VideoEditor.js");
		expect(chunkNameFromFile("index-ByNYrzXz.css")).toBe("index.css");
	});

	it("keeps names that carry no hash", () => {
		expect(chunkNameFromFile("manifest.json")).toBe("manifest.json");
	});

	it("keeps hyphenated names whose last segment is not a hash", () => {
		expect(chunkNameFromFile("gif-worker.js")).toBe("gif-worker.js");
	});
});

describe("toMeasurements", () => {
	it("prefixes every chunk with bundle. and sums duplicates of the same chunk", () => {
		const files: AssetFile[] = [
			{ name: "pixi-BXozQCwi.js", bytes: 530_000 },
			{ name: "pixi-Zaaaaaaa.js", bytes: 1_000 },
			{ name: "index-ByNYrzXz.css", bytes: 74_000 },
		];

		expect(toMeasurements(files)).toEqual([
			{ metric: "bundle.pixi.js", value: 531_000 },
			{ metric: "bundle.index.css", value: 74_000 },
			{ metric: "bundle.total", value: 605_000 },
		]);
	});

	it("adds a total across every asset", () => {
		const files: AssetFile[] = [
			{ name: "a-AAAAAAAA.js", bytes: 10 },
			{ name: "b-BBBBBBBB.js", bytes: 20 },
		];

		expect(toMeasurements(files)).toContainEqual({ metric: "bundle.total", value: 30 });
	});
});
