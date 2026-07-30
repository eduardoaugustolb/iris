import "@testing-library/jest-dom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon, type IconName } from "./Icon";

const SPRITE = path.join(path.dirname(fileURLToPath(import.meta.url)), "sprite.svg");

const NAMES: IconName[] = [
	"record",
	"stop",
	"pause",
	"settings",
	"microphone",
	"camera",
	"close",
	"minimize",
	"check",
	"folder",
	"chevron-right",
	"drag-handle",
];

describe("sprite", () => {
	const svg = fs.readFileSync(SPRITE, "utf8");

	it("defines every declared icon", () => {
		for (const name of NAMES) {
			expect(svg).toContain(`id="icon-${name}"`);
		}
	});

	it("draws every symbol on the same 20x20 grid", () => {
		const viewBoxes = [...svg.matchAll(/<symbol[^>]*viewBox="([^"]+)"/g)].map((m) => m[1]);

		expect(viewBoxes.length).toBe(NAMES.length);
		expect(new Set(viewBoxes)).toEqual(new Set(["0 0 20 20"]));
	});

	it("uses currentColor only, so icons inherit their context", () => {
		expect(svg).not.toMatch(/(?:fill|stroke)="#[0-9a-f]{3,8}"/i);
	});

	it("keeps one optical weight across the whole set", () => {
		const widths = [...svg.matchAll(/stroke-width="([^"]+)"/g)].map((m) => m[1]);

		expect(new Set(widths)).toEqual(new Set(["1.5"]));
	});
});

describe("Icon", () => {
	it("renders at 20px by default", () => {
		render(<Icon name="record" />);
		const svg = document.querySelector("svg");

		expect(svg).toHaveAttribute("width", "20");
		expect(svg).toHaveAttribute("height", "20");
	});

	it("honours an explicit size", () => {
		render(<Icon name="record" size={16} />);

		expect(document.querySelector("svg")).toHaveAttribute("width", "16");
	});

	it("is hidden from assistive tech when purely decorative", () => {
		render(<Icon name="record" />);

		expect(document.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
	});

	it("becomes an accessible image when given a label", () => {
		render(<Icon name="record" label="Iniciar gravação" />);

		expect(screen.getByRole("img", { name: "Iniciar gravação" })).toBeInTheDocument();
	});
});
