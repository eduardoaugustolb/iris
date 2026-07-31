import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Surfaces not yet rebuilt on the design layer. Shrinks to nothing as phases 3
 * to 6 land; nothing may ever be added to it.
 */
const LEGACY_ALLOWLIST = ["components", "hooks", "lib", "utils", "contexts"];

function sourceFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		const relative = path.relative(SRC, full);

		if (entry.isDirectory()) {
			// components/hud is rebuilt on the design layer (Íris Fase 3) — always walk it.
			if (relative === path.join("components", "hud")) return sourceFiles(full);

			// components/ui hosts shared primitives migrated one at a time (Íris Editor
			// sub-fase 1) — walk it so already-migrated files can be picked up below, even
			// though most of its siblings are still legacy.
			if (relative === path.join("components", "ui")) return sourceFiles(full);

			// Skip subdirectories of components except hud/ui, and walk components itself.
			if (relative === "components") return sourceFiles(full);

			// Every other subdirectory of components/ is still legacy — skip it.
			if (relative.startsWith("components" + path.sep)) return [];

			return LEGACY_ALLOWLIST.includes(relative) ? [] : sourceFiles(full);
		}

		// Inside components/ui specifically, only already-migrated primitives are
		// checked — the rest of that directory is still legacy Tailwind/shadcn.
		const inComponentsUi = relative.startsWith(path.join("components", "ui") + path.sep);
		if (inComponentsUi) {
			const MIGRATED_UI_PRIMITIVES = ["dialog.tsx", "dropdown-menu.tsx"];
			if (!MIGRATED_UI_PRIMITIVES.includes(entry.name)) return [];
		}

		return /\.(ts|tsx|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
	});
}

describe("glass guardrail", () => {
	const files = sourceFiles(SRC);

	it("finds files to check, so a broken walk can't pass silently", () => {
		expect(files.length).toBeGreaterThan(0);
	});

	it("never builds the glass material outside the Glass primitive", () => {
		const offenders = files.filter((file) => {
			if (file.includes(path.join("design", "glass"))) return false;

			const source = fs.readFileSync(file, "utf8");

			return /backdrop-filter|backdropFilter|backdrop-blur/.test(source);
		});

		expect(offenders).toEqual([]);
	});
});
