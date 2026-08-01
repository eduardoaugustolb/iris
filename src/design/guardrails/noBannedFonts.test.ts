import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DESIGN = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const COMPONENTS = path.join(DESIGN, "..", "components");

function sourceFiles(root: string, dir = root): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) return sourceFiles(root, full);

		return /\.(tsx?|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
	});
}

describe("typography guardrail", () => {
	const sources = [...sourceFiles(DESIGN), ...sourceFiles(COMPONENTS)].map((file) => ({
		file: path.relative(path.join(DESIGN, ".."), file),
		source: fs.readFileSync(file, "utf8"),
	}));

	it("never uses a font weight above 700", () => {
		const offenders = sources.filter(({ source }) =>
			/font-?[wW]eight:\s*["']?(8\d\d|9\d\d|bolder)/.test(source),
		);

		expect(offenders.map((entry) => entry.file)).toEqual([]);
	});

	it("never references an Apple-licensed family", () => {
		const offenders = sources.filter(({ source }) =>
			/SF Pro|SF Mono|-apple-system|SF Symbols/.test(source),
		);

		expect(offenders.map((entry) => entry.file)).toEqual([]);
	});
});
