export type BudgetUnit = "bytes" | "ms" | "count";

export interface Budget {
	metric: string;
	max: number;
	unit: BudgetUnit;
}

export interface Measurement {
	metric: string;
	value: number;
}

export interface Violation {
	metric: string;
	value: number;
	max: number;
	unit: BudgetUnit;
}

/**
 * A measurement with no matching budget is a violation, not a pass: an unbudgeted
 * chunk is exactly how weight creeps back in unnoticed.
 */
export function findViolations(measurements: Measurement[], budgets: Budget[]): Violation[] {
	const byMetric = new Map(budgets.map((budget) => [budget.metric, budget]));

	return measurements.flatMap((measurement) => {
		const budget = byMetric.get(measurement.metric);

		if (!budget) {
			return [{ metric: measurement.metric, value: measurement.value, max: 0, unit: "count" }];
		}

		if (measurement.value <= budget.max) {
			return [];
		}

		return [
			{
				metric: measurement.metric,
				value: measurement.value,
				max: budget.max,
				unit: budget.unit,
			},
		];
	});
}

export function formatViolations(violations: Violation[]): string {
	return violations
		.map(
			(violation) =>
				`${violation.metric}: ${violation.value} ${violation.unit} exceeds budget of ${violation.max} ${violation.unit}`,
		)
		.join("\n");
}
