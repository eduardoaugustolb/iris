import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Budget, findViolations, formatViolations } from "../../src/lib/perf/budgets.ts";
import { type AssetFile, toMeasurements } from "../../src/lib/perf/bundleSize.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ASSETS_DIR = path.join(ROOT, "dist/assets");
const BUDGETS_FILE = path.join(ROOT, "perf-budgets.json");

function readAssets(): AssetFile[] {
	if (!fs.existsSync(ASSETS_DIR)) {
		throw new Error(`No build output at ${ASSETS_DIR}. Run "npx vite build" first.`);
	}

	return fs
		.readdirSync(ASSETS_DIR)
		.filter((name) => name.endsWith(".js") || name.endsWith(".css"))
		.map((name) => ({ name, bytes: fs.statSync(path.join(ASSETS_DIR, name)).size }));
}

function readBudgets(): Budget[] {
	const parsed = JSON.parse(fs.readFileSync(BUDGETS_FILE, "utf8")) as { budgets: Budget[] };

	return parsed.budgets;
}

const measurements = toMeasurements(readAssets());

for (const measurement of measurements) {
	console.info(`${measurement.metric} = ${measurement.value}`);
}

const violations = findViolations(
	measurements,
	readBudgets().filter((budget) => budget.metric.startsWith("bundle.")),
);

if (violations.length > 0) {
	console.error(`\nBudget exceeded:\n${formatViolations(violations)}`);
	process.exit(1);
}

console.info("\nAll bundle budgets are within limits.");
