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

			// components/launch is rebuilt on the design layer (Íris Fase 4) — always walk it.
			if (relative === path.join("components", "launch")) return sourceFiles(full);

			// components/ui hosts shared primitives migrated one at a time (Íris Editor
			// sub-fase 1) — walk it so already-migrated files can be picked up below, even
			// though most of its siblings are still legacy.
			if (relative === path.join("components", "ui")) return sourceFiles(full);

			// components/video-editor hosts dialog surfaces rebuilt on the design layer one
			// at a time (Íris Editor sub-fase 3) — walk it, and let the file filter below
			// pick out only the migrated dialogs.
			if (relative === path.join("components", "video-editor")) return sourceFiles(full);

			// components/video-editor/timeline is rebuilt on the design layer (Íris Fase 6)
			// — always walk it.
			if (relative === path.join("components", "video-editor", "timeline"))
				return sourceFiles(full);

			// Skip subdirectories of components except hud/launch/ui/video-editor, and walk
			// components itself.
			if (relative === "components") return sourceFiles(full);

			// Every other subdirectory of components/ is still legacy — skip it.
			if (relative.startsWith("components" + path.sep)) return [];

			return LEGACY_ALLOWLIST.includes(relative) ? [] : sourceFiles(full);
		}

		// Inside components/ui specifically, only already-migrated primitives are
		// checked — the rest of that directory is still legacy Tailwind/shadcn.
		const inComponentsUi = relative.startsWith(path.join("components", "ui") + path.sep);
		if (inComponentsUi) {
			const MIGRATED_UI_PRIMITIVES = [
				"dialog.tsx",
				"dropdown-menu.tsx",
				"button.tsx",
				"switch.tsx",
				"switch.module.css",
				"slider.tsx",
				"select.tsx",
				"popover.tsx",
				"tabs.tsx",
				"tooltip.tsx",
				"accordion.tsx",
				"input.tsx",
				"label.tsx",
				"toggle.tsx",
				"toggle-group.tsx",
				"card.tsx",
				"sonner.tsx",
			];
			if (!MIGRATED_UI_PRIMITIVES.includes(entry.name)) return [];
		}

		// components/video-editor is fully rebuilt on the design layer (Íris Fase 5),
		// including the timeline subdirectory (Íris Fase 6) — walk it all.
		return /\.(ts|tsx|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
	});
}

describe("glass guardrail", () => {
	const files = sourceFiles(SRC);

	it("finds files to check, so a broken walk can't pass silently", () => {
		expect(files.length).toBeGreaterThan(0);
	});

	it("walks components/launch, now that those surfaces are rebuilt on the design layer", () => {
		const launchFiles = files.filter((file) => file.includes(path.join("components", "launch")));
		expect(launchFiles.length).toBeGreaterThan(0);
		expect(
			launchFiles.some((file) =>
				file.endsWith(path.join("components", "launch", "SourceSelector.module.css")),
			),
		).toBe(true);
		expect(
			launchFiles.some((file) =>
				file.endsWith(path.join("components", "launch", "NotesToolbar.tsx")),
			),
		).toBe(true);
	});

	it("walks every ui primitive migrated in the Fase 5.1 batch", () => {
		const expected = [
			"button.tsx",
			"switch.tsx",
			"switch.module.css",
			"slider.tsx",
			"select.tsx",
			"popover.tsx",
			"tabs.tsx",
			"tooltip.tsx",
			"accordion.tsx",
			"input.tsx",
			"label.tsx",
			"toggle.tsx",
			"toggle-group.tsx",
			"card.tsx",
			"sonner.tsx",
		];
		for (const name of expected) {
			expect(
				files.some((file) => file.endsWith(path.join("components", "ui", name))),
				`expected ${name} to be walked by the glass guardrail`,
			).toBe(true);
		}
	});

	it("walks every editor dialog migrated in the Fase 5.2 batch", () => {
		const expected = [
			"ExportDialog.tsx",
			"ShortcutsConfigDialog.tsx",
			"UnsavedChangesDialog.tsx",
			"AddCustomFontDialog.tsx",
		];
		for (const name of expected) {
			expect(
				files.some((file) => file.endsWith(path.join("components", "video-editor", name))),
				`expected ${name} to be walked by the glass guardrail`,
			).toBe(true);
		}
	});

	it("walks every editor panel migrated in the Fase 5.3 batch", () => {
		const expected = [
			"SettingsPanel.tsx",
			"AnnotationSettingsPanel.tsx",
			"BlurSettingsPanel.tsx",
			"GifOptionsPanel.tsx",
			"CropControl.tsx",
			"FormatSelector.tsx",
			"PlaybackControls.tsx",
			"TutorialHelp.tsx",
			"KeyboardShortcutsHelp.tsx",
		];
		for (const name of expected) {
			expect(
				files.some((file) => file.endsWith(path.join("components", "video-editor", name))),
				`expected ${name} to be walked by the glass guardrail`,
			).toBe(true);
		}
	});

	it("walks every editor shell surface, now that the whole editor is migrated", () => {
		const expected = [
			"VideoEditor.tsx",
			"VideoPlayback.tsx",
			"AnnotationOverlay.tsx",
			"EditorEmptyState.tsx",
			"EditorMenuBar.tsx",
			"ArrowSvgs.tsx",
			"types.ts",
		];
		for (const name of expected) {
			expect(
				files.some((file) => file.endsWith(path.join("components", "video-editor", name))),
				`expected ${name} to be walked by the glass guardrail`,
			).toBe(true);
		}
	});

	it("walks the whole timeline subdirectory, now that Fase 6 rebuilt it", () => {
		const timelineFiles = files.filter((file) =>
			file.includes(path.join("components", "video-editor", "timeline")),
		);
		expect(timelineFiles.length).toBeGreaterThan(0);
		for (const name of [
			"TimelineEditor.tsx",
			"TimelineWrapper.tsx",
			"Item.tsx",
			"ItemGlass.module.css",
			"Row.tsx",
			"Subrow.tsx",
			"BackgroundWaveform.tsx",
			"KeyframeMarkers.tsx",
		]) {
			expect(
				timelineFiles.some((file) =>
					file.endsWith(path.join("components", "video-editor", "timeline", name)),
				),
				`expected ${name} to be walked by the glass guardrail`,
			).toBe(true);
		}
	});

	it("never builds the glass material outside the Glass primitive", () => {
		const offenders = files.filter((file) => {
			if (file.includes(path.join("design", "glass"))) return false;
			if (file.includes(path.join("design", "effects"))) return false;

			const source = fs.readFileSync(file, "utf8");

			return /backdrop-filter|backdropFilter|backdrop-blur/.test(source);
		});

		expect(offenders).toEqual([]);
	});
});
