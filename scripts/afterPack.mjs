import path from "node:path";
import { FuseV1Options, FuseVersion, flipFuses } from "@electron/fuses";

/**
 * Turns off Electron features the app never uses. RunAsNode and the Node CLI
 * inspect arguments are the two that let a packaged app be repurposed as a
 * generic Node runtime; the cookie encryption and ASAR integrity fuses harden
 * what the app ships.
 *
 * Executable path per platform:
 * - darwin: `${productFilename}.app` (the .app bundle sits directly in appOutDir).
 * - win32: `${executableName}.exe`.
 * - linux: `packager.executableName`, NOT `packager.appInfo.productFilename`.
 *   electron-builder's LinuxPackager defaults `executableName` to
 *   `appInfo.sanitizedName.toLowerCase()` (see app-builder-lib's
 *   linuxPackager.js), so for productName "Iris" the real binary shipped in
 *   linux-unpacked/ is named "iris" (lowercase), not "Iris". Confirmed against
 *   a real `npm run build:linux` output — using productFilename here would
 *   make flipFuses() throw ENOENT on every Linux build.
 */
export default async function afterPack(context) {
	const { appOutDir, packager, electronPlatformName } = context;

	const executableName =
		electronPlatformName === "darwin"
			? `${packager.appInfo.productFilename}.app`
			: electronPlatformName === "win32"
				? `${packager.executableName}.exe`
				: packager.executableName;

	const executable = path.join(appOutDir, executableName);

	await flipFuses(executable, {
		version: FuseVersion.V1,
		resetAdHocDarwinSignature: electronPlatformName === "darwin",
		[FuseV1Options.RunAsNode]: false,
		[FuseV1Options.EnableCookieEncryption]: true,
		[FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
		[FuseV1Options.EnableNodeCliInspectArguments]: false,
		[FuseV1Options.OnlyLoadAppFromAsar]: true,
	});
}
