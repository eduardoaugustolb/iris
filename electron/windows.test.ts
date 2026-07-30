import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const WINDOWS_TS = path.join(path.dirname(fileURLToPath(import.meta.url)), "windows.ts");

describe("window creation", () => {
	const source = fs.readFileSync(WINDOWS_TS, "utf8");

	it("never hardcodes backgroundThrottling, so the policy is the only authority", () => {
		expect(source).not.toContain("backgroundThrottling: false");
		expect(source).not.toContain("backgroundThrottling: true");
	});

	it("exposes a single entry point for applying the policy", () => {
		expect(source).toContain("export function applyThrottlePolicy");
	});

	it("creates every window with context isolation and no node integration", () => {
		const isolation = source.match(/contextIsolation: true/g) ?? [];
		const nodeIntegration = source.match(/nodeIntegration: false/g) ?? [];
		const sandbox = source.match(/sandbox: true/g) ?? [];
		const windows = source.match(/new BrowserWindow\(/g) ?? [];

		expect(isolation).toHaveLength(windows.length);
		expect(nodeIntegration).toHaveLength(windows.length);
		expect(sandbox).toHaveLength(windows.length);
	});
});
