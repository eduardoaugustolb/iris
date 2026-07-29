import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findBannedDependencies } from "./dependencyGuard";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("package.json", () => {
	it("carries no banned dependency", () => {
		const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

		expect(findBannedDependencies(manifest)).toEqual([]);
	});
});
