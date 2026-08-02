import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ELECTRON = path.join(SRC, "..", "electron");
const TOKENS_SOURCE = path.join(SRC, "design", "tokens", "color.ts");

// Colors that may only ever exist as the single source of truth in color.ts.
// #34B27B was the old OpenScreen brand green; #09090b the old near-black shell.
const BANNED_COLORS = ["#34B27B", "#09090b"];

function sourceFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) return sourceFiles(full);

		return /\.(tsx?|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
	});
}

describe("legacy color guardrail", () => {
	const files = [...sourceFiles(SRC), ...sourceFiles(ELECTRON)].filter(
		(file) => file !== TOKENS_SOURCE,
	);

	it("finds source files to check, so a broken walk can't pass silently", () => {
		expect(files.length).toBeGreaterThan(0);
		expect(sourceFiles(ELECTRON).length).toBeGreaterThan(0);
	});

	it("bans the old brand green and near-black shell everywhere but color.ts", () => {
		const offenders = files.filter((file) => {
			const source = fs.readFileSync(file, "utf8").toLowerCase();
			return BANNED_COLORS.some((color) => source.includes(color));
		});

		expect(offenders).toEqual([]);
	});
});
