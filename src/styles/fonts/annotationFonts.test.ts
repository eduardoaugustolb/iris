import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const ANNOTATION_FAMILIES = [
	"Bebas Neue",
	"Caveat",
	"DM Sans",
	"Fira Code",
	"IBM Plex Mono",
	"IBM Plex Sans",
	"Inter",
	"Lora",
	"Manrope",
	"Merriweather",
	"Oswald",
	"Permanent Marker",
	"Playfair Display",
	"Plus Jakarta Sans",
	"Space Grotesk",
	"Sora",
];

describe("annotation fonts", () => {
	it("are declared locally, one @font-face per family", () => {
		const css = fs.readFileSync(path.join(ROOT, "src/styles/fonts/annotation-fonts.css"), "utf8");

		for (const family of ANNOTATION_FAMILIES) {
			expect(css).toContain(`font-family: "${family}"`);
		}
	});

	it("ship the woff2 files they reference", () => {
		const css = fs.readFileSync(path.join(ROOT, "src/styles/fonts/annotation-fonts.css"), "utf8");
		const referenced = [...css.matchAll(/url\("([^"]+\.woff2)"\)/g)].map((match) => match[1]);

		expect(referenced.length).toBeGreaterThan(0);

		for (const reference of referenced) {
			const file = path.join(ROOT, "public", reference.replace(/^\/+/, ""));

			expect(fs.existsSync(file), `missing font file ${file}`).toBe(true);
		}
	});

	it("never fetch fonts over the network at startup", () => {
		const indexCss = fs.readFileSync(path.join(ROOT, "src/index.css"), "utf8");

		expect(indexCss).not.toContain("fonts.googleapis.com");
		expect(indexCss).not.toContain("fonts.gstatic.com");
	});
});
