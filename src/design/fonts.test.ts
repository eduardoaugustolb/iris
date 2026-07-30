import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("UI fonts", () => {
	const css = () => fs.readFileSync(path.join(ROOT, "src/design/fonts.css"), "utf8");

	it("declares both embedded families", () => {
		expect(css()).toContain('font-family: "Iris Sans"');
		expect(css()).toContain('font-family: "Iris Mono"');
	});

	it("ships the variable font files", () => {
		expect(fs.existsSync(path.join(ROOT, "public/fonts/iris-sans-variable.woff2"))).toBe(true);
		expect(fs.existsSync(path.join(ROOT, "public/fonts/iris-mono-variable.woff2"))).toBe(true);
	});

	it("covers the full weight range the scale needs, 400 through 700", () => {
		expect(css()).toContain("font-weight: 400 700");
	});

	it("loads nothing over the network", () => {
		expect(css()).not.toContain("http");
	});

	it("records the licence of every embedded family", () => {
		const licences = fs.readFileSync(path.join(ROOT, "public/fonts/LICENSES.md"), "utf8");

		expect(licences).toContain("Iris Sans");
		expect(licences).toContain("Iris Mono");
		expect(licences).toContain("SIL Open Font License");
	});
});
