import type { Measurement } from "./budgets";

/** Shape of one entry from Electron's `app.getAppMetrics()`. Sizes are in kilobytes. */
export interface ProcessMetric {
	type: string;
	memory: { workingSetSize: number };
}

export function totalResidentKb(metrics: ProcessMetric[]): number {
	return metrics.reduce((sum, metric) => sum + metric.memory.workingSetSize, 0);
}

export function residentByTypeKb(metrics: ProcessMetric[]): Record<string, number> {
	const byType: Record<string, number> = {};

	for (const metric of metrics) {
		byType[metric.type] = (byType[metric.type] ?? 0) + metric.memory.workingSetSize;
	}

	return byType;
}

export function toMemoryMeasurements(metrics: ProcessMetric[], phase: string): Measurement[] {
	return [
		{ metric: `memory.${phase}.total`, value: totalResidentKb(metrics) },
		...Object.entries(residentByTypeKb(metrics)).map(([type, value]) => ({
			metric: `memory.${phase}.${type}`,
			value,
		})),
	];
}
