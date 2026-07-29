import { spawnSync } from "node:child_process";
import type { ElectronApplication } from "@playwright/test";

/**
 * Shuts the app down on every path, including failures. Playwright's launch
 * spawns Electron as an independent subprocess: if a measurement throws and
 * nothing kills it, the orphan keeps running and the next run's idle memory
 * sample measures the leak too. Mirrors the teardown in
 * tests/e2e/gif-export.spec.ts.
 */
export async function closeElectron(app: ElectronApplication): Promise<void> {
	const electronProcess = app.process();

	await app.close().catch(() => {
		// Already gone, or never became responsive — the kill below is the backstop.
	});

	const pid = electronProcess.pid;

	if (!pid || electronProcess.killed) {
		return;
	}

	if (process.platform === "win32") {
		spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
	} else {
		try {
			electronProcess.kill("SIGKILL");
		} catch {
			// The process exited between the check and the signal.
		}
	}
}
