import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect } from "@playwright/test";
import { type Budget, findViolations, formatViolations } from "../../src/lib/perf/budgets.ts";
import { closeElectron } from "./closeElectron.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MAIN_JS = path.join(ROOT, "dist-electron/main.js");
const FIXTURE = path.join(ROOT, "tests/fixtures/sample.webm");
const BUDGETS_FILE = path.join(ROOT, "perf-budgets.json");
// Measured via: ffprobe -v error -show_entries format=duration -of csv=p=0 tests/fixtures/sample.webm
const FIXTURE_SECONDS = 2;

async function main() {
	if (!fs.existsSync(FIXTURE)) {
		throw new Error(`Missing fixture ${FIXTURE}`);
	}

	const outputPath = path.join(os.tmpdir(), `iris-bench-export-${Date.now()}.mp4`);

	const app = await electron.launch({
		args: [MAIN_JS, "--no-sandbox", "--enable-unsafe-swiftshader"],
		env: { ...process.env, HEADLESS: "true" },
	});

	// Declared outside the try so the finally can always clean them up, and so
	// the measurement survives past the block that produced it.
	let fixtureCopy = "";
	let elapsedMs: number;

	try {
		const hudWindow = await app.firstWindow({ timeout: 60_000 });
		await hudWindow.waitForLoadState("domcontentloaded");

		// Capture the export completion in the main process instead of writing to
		// disk, so the measurement isn't dominated by the save dialog or filesystem.
		await app.evaluate(({ ipcMain }, targetPath: string) => {
			ipcMain.removeHandler("pick-export-save-path");
			ipcMain.removeHandler("write-export-to-path");
			ipcMain.handle("pick-export-save-path", () => ({
				success: true,
				path: targetPath,
				canceled: false,
			}));
			ipcMain.handle("write-export-to-path", () => {
				(globalThis as Record<string, unknown>)["__benchExportDone"] = true;
				return { success: true, path: targetPath };
			});
		}, outputPath);

		const userDataDir = await app.evaluate(({ app: electronApp }) =>
			electronApp.getPath("userData"),
		);
		const recordingsDir = path.join(userDataDir, "recordings");
		fixtureCopy = path.join(recordingsDir, "bench-sample.webm");
		fs.mkdirSync(recordingsDir, { recursive: true });
		fs.copyFileSync(FIXTURE, fixtureCopy);

		await hudWindow.evaluate(
			(videoPath: string) => window.electronAPI.setCurrentVideoPath(videoPath),
			fixtureCopy,
		);

		try {
			await hudWindow.evaluate(() => window.electronAPI.switchToEditor());
		} catch (error) {
			// The HUD tears down as the editor takes over; that isn't a failure.
			if (
				!(error instanceof Error) ||
				!/closed|destroyed|target page|target closed/i.test(error.message)
			) {
				throw error;
			}
		}

		const editorWindow = await app.waitForEvent("window", {
			predicate: (w) => w.url().includes("windowType=editor"),
			timeout: 15_000,
		});

		// WebCodecs may not be registered in the renderer on first load.
		await editorWindow.reload();
		await editorWindow.waitForLoadState("domcontentloaded");
		await expect(editorWindow.getByText("Loading video...")).not.toBeVisible({ timeout: 15_000 });

		await editorWindow.getByTestId("testId-export-panel-button").click();
		await editorWindow.getByTestId("testId-mp4-format-button").click();

		// The clock starts at the click, not at launch: this measures encoding.
		const startedAt = Date.now();
		await editorWindow.getByTestId("testId-export-button").click();

		await expect
			.poll(
				() =>
					app.evaluate(() => Boolean((globalThis as Record<string, unknown>)["__benchExportDone"])),
				{ timeout: 180_000 },
			)
			.toBe(true);

		elapsedMs = Date.now() - startedAt;
	} finally {
		await closeElectron(app);

		if (fixtureCopy) {
			fs.rmSync(fixtureCopy, { force: true });
		}
	}

	const measurement = {
		metric: "export.mp4.msPerSecondOfVideo",
		value: Math.round(elapsedMs / FIXTURE_SECONDS),
	};

	console.info(`${measurement.metric} = ${measurement.value}`);

	const budgets = (
		JSON.parse(fs.readFileSync(BUDGETS_FILE, "utf8")) as { budgets: Budget[] }
	).budgets.filter((budget) => budget.metric === measurement.metric);

	if (budgets.length > 0) {
		const violations = findViolations([measurement], budgets);

		if (violations.length > 0) {
			console.error(`\nBudget exceeded:\n${formatViolations(violations)}`);
			process.exit(1);
		}
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
