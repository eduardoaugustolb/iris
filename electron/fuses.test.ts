import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("main process hardening", () => {
	it("registers an afterPack hook that flips the Electron fuses", () => {
		const config = fs.readFileSync(path.join(ROOT, "electron-builder.json5"), "utf8");

		expect(config).toContain("afterPack");
		expect(config).toContain("./scripts/afterPack.mjs");
	});

	it("ships the fuses hook", () => {
		expect(fs.existsSync(path.join(ROOT, "scripts/afterPack.mjs"))).toBe(true);
	});

	it("hook flips the expected fuses and never disables RunAsNode or ASAR loading restriction", () => {
		const hook = fs.readFileSync(path.join(ROOT, "scripts/afterPack.mjs"), "utf8");

		expect(hook).toContain("flipFuses");
		expect(hook).toMatch(/RunAsNode\]\s*:\s*false/);
		expect(hook).toMatch(/EnableCookieEncryption\]\s*:\s*true/);
		expect(hook).toMatch(/EnableNodeOptionsEnvironmentVariable\]\s*:\s*false/);
		expect(hook).toMatch(/EnableNodeCliInspectArguments\]\s*:\s*false/);
		expect(hook).toMatch(/OnlyLoadAppFromAsar\]\s*:\s*true/);
	});

	it("resolves the Linux executable by its actual (lowercased) packaged name, not productFilename", () => {
		// electron-builder's LinuxPackager exposes `executableName`, which defaults to
		// appInfo.sanitizedName.toLowerCase() ("iris"), NOT productFilename ("Iris").
		// Confirmed against a real `npm run build:linux` output where the binary in
		// linux-unpacked/ is named "iris". Using productFilename here would make
		// flipFuses() throw ENOENT on every Linux build.
		const hook = fs.readFileSync(path.join(ROOT, "scripts/afterPack.mjs"), "utf8");

		expect(hook).toContain("packager.executableName");
	});

	it("resolves the Windows executable by productFilename, not executableName", () => {
		// WinPackager exposes no `executableName` property (only LinuxPackager does),
		// so the win32 branch must use productFilename ("Iris.exe") — otherwise the
		// packaged exe resolves to "undefined.exe" and flipFuses() throws ENOENT.
		const hook = fs.readFileSync(path.join(ROOT, "scripts/afterPack.mjs"), "utf8");
		const win32Segment = hook.slice(
			hook.indexOf('electronPlatformName === "win32"'),
			hook.indexOf(": packager.executableName;"),
		);

		expect(win32Segment).toContain("productFilename");
		expect(win32Segment).not.toContain("executableName");
	});
});
