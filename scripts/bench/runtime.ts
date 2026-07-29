import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "@playwright/test";
import { type ProcessMetric, toMemoryMeasurements } from "../../src/lib/perf/appMetrics.ts";
import { type Budget, findViolations, formatViolations } from "../../src/lib/perf/budgets.ts";
import { closeElectron } from "./closeElectron.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MAIN_JS = path.join(ROOT, "dist-electron/main.js");
const BUDGETS_FILE = path.join(ROOT, "perf-budgets.json");
// Memory settles for a moment after the HUD paints; sampling too early
// reports a number the user never actually experiences.
const IDLE_SETTLE_MS = 3_000;

async function main() {
	if (!fs.existsSync(MAIN_JS)) {
		throw new Error(`No main process build at ${MAIN_JS}. Run "npx vite build" first.`);
	}

	const startedAt = Date.now();

	const app = await electron.launch({
		args: [MAIN_JS, "--no-sandbox", "--enable-unsafe-swiftshader"],
		env: { ...process.env, HEADLESS: "true" },
	});

	let hudFirstFrameMs: number;
	let processMetrics: ProcessMetric[];

	// Everything after launch runs under a finally: a measurement that throws
	// (HUD never appears, evaluate rejects) must not leave an orphaned Electron
	// behind, or the next run's idle memory sample is measuring the leak too.
	try {
		const hudWindow = await app.firstWindow({ timeout: 60_000 });
		await hudWindow.waitForLoadState("domcontentloaded");
		await hudWindow.evaluate(
			() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
		);

		hudFirstFrameMs = Date.now() - startedAt;

		await new Promise((resolve) => setTimeout(resolve, IDLE_SETTLE_MS));

		processMetrics = (await app.evaluate(({ app: electronApp }) =>
			electronApp.getAppMetrics(),
		)) as ProcessMetric[];
	} finally {
		await closeElectron(app);
	}

	const measurements = [
		{ metric: "startup.hudFirstFrame", value: hudFirstFrameMs },
		...toMemoryMeasurements(processMetrics, "idle"),
	];

	for (const measurement of measurements) {
		console.info(`${measurement.metric} = ${measurement.value}`);
	}

	const budgets = (JSON.parse(fs.readFileSync(BUDGETS_FILE, "utf8")) as { budgets: Budget[] })
		.budgets;
	const relevant = budgets.filter(
		(budget) => budget.metric.startsWith("startup.") || budget.metric.startsWith("memory."),
	);
	const measured = measurements.filter((measurement) =>
		relevant.some((budget) => budget.metric === measurement.metric),
	);
	const violations = findViolations(measured, relevant);

	if (violations.length > 0) {
		console.error(`\nBudget exceeded:\n${formatViolations(violations)}`);
		process.exit(1);
	}

	console.info("\nAll runtime budgets are within limits.");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
