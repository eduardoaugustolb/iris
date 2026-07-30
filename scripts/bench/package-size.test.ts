import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Extracts the raw text of a top-level `"<key>": { ... }` block from a JSON5
 * source string, by locating the key and then brace-matching from its opening
 * `{` to the corresponding closing `}`. This is not a full JSON5 parser — it's
 * just precise enough to let us assert things scoped to a single platform
 * block (mac/win/linux) instead of searching the whole file, which would miss
 * a self-exclusion line accidentally placed in the wrong block.
 */
function extractBlock(source: string, key: string): string {
	const keyMatch = new RegExp(`"${key}"\\s*:\\s*\\{`).exec(source);
	if (!keyMatch) {
		throw new Error(`Could not find "${key}" block in electron-builder.json5`);
	}

	const openBraceIndex = keyMatch.index + keyMatch[0].length - 1;
	let depth = 0;
	for (let i = openBraceIndex; i < source.length; i++) {
		if (source[i] === "{") depth++;
		else if (source[i] === "}") {
			depth--;
			if (depth === 0) {
				return source.slice(openBraceIndex, i + 1);
			}
		}
	}

	throw new Error(`Unbalanced braces while extracting "${key}" block`);
}

function excludesGlob(platform: string): RegExp {
	return new RegExp(`!\\*\\*/node_modules/onnxruntime-node/bin/napi-v\\*/${platform}/\\*\\*`);
}

describe("electron-builder config", () => {
	const config = fs.readFileSync(path.join(ROOT, "electron-builder.json5"), "utf8");

	// Real directory names confirmed via `ls node_modules/onnxruntime-node/bin/napi-v*/`:
	// darwin, linux, win32 (each further split into arm64/x64, irrelevant to these globs).
	const platformBlocks: Record<string, string> = {
		darwin: "mac",
		linux: "linux",
		win32: "win",
	};
	const allOnnxPlatforms = Object.keys(platformBlocks);

	it("mentions onnxruntime-node/bin at all (this string is new to this task)", () => {
		// Confirmed absent from the pre-task commit (c0ec083c) via
		// `git show c0ec083c:electron-builder.json5 | grep onnxruntime` (no match) —
		// so this assertion is genuinely new, not something already true before the fix.
		expect(config).toContain("onnxruntime-node/bin");
	});

	for (const [onnxPlatform, builderKey] of Object.entries(platformBlocks)) {
		describe(`"${builderKey}" block (ships ${onnxPlatform}'s onnxruntime binaries)`, () => {
			const block = extractBlock(config, builderKey);
			const otherPlatforms = allOnnxPlatforms.filter((p) => p !== onnxPlatform);

			it(`excludes the other platforms' onnxruntime binaries (${otherPlatforms.join(", ")})`, () => {
				for (const other of otherPlatforms) {
					expect(block).toMatch(excludesGlob(other));
				}
			});

			it(`does NOT exclude its own platform's onnxruntime binaries (${onnxPlatform})`, () => {
				expect(block).not.toMatch(excludesGlob(onnxPlatform));
			});
		});
	}
});
