import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isValidSpacing } from "../tokens/space";

const DESIGN = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const SPACING_PROPERTIES =
	/(?:margin|padding|gap|top|right|bottom|left)(?:Top|Right|Bottom|Left)?:\s*["']?(\d+)px/g;

function designFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) return designFiles(full);

		return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
	});
}

describe("spacing guardrail", () => {
	it("uses only values from the base-4 scale in DESIGN.md section 6", () => {
		const offenders: string[] = [];

		for (const file of designFiles(DESIGN)) {
			const source = fs.readFileSync(file, "utf8");

			for (const match of source.matchAll(SPACING_PROPERTIES)) {
				if (!isValidSpacing(Number(match[1]))) {
					offenders.push(`${path.basename(file)}: ${match[0]}`);
				}
			}
		}

		expect(offenders).toEqual([]);
	});
});
