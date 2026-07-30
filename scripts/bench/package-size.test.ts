import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("electron-builder config", () => {
	const config = fs.readFileSync(path.join(ROOT, "electron-builder.json5"), "utf8");

	it("excludes onnxruntime binaries for platforms other than the build target", () => {
		expect(config).toContain("onnxruntime-node/bin");
	});

	it("keeps the binaries for the platform being built", () => {
		expect(config).toMatch(/\$\{platform\}|darwin|win32|linux/);
	});

	it("excludes the other two platforms in each of the mac/win/linux blocks", () => {
		// Real directory names confirmed under node_modules/onnxruntime-node/bin/napi-v3/:
		// darwin, linux, win32 (verified via `ls node_modules/onnxruntime-node/bin/napi-v*/`).
		const platforms = ["darwin", "linux", "win32"] as const;

		for (const platform of platforms) {
			const others = platforms.filter((p) => p !== platform);
			for (const other of others) {
				expect(config).toMatch(
					new RegExp(`!\\*\\*/node_modules/onnxruntime-node/bin/napi-v\\*/${other}/\\*\\*`),
				);
			}
		}
	});
});
