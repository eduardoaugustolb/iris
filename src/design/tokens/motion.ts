/** The two curves from DESIGN.md section 8. A third curve is a design bug. */
export const easing = {
	standard: "cubic-bezier(0.32, 0.72, 0, 1)",
	spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/** Fixed durations from DESIGN.md section 8, in milliseconds. */
export const duration = { fast: 150, standard: 280, slow: 420 } as const;

/**
 * Doherty threshold (UX-PRINCIPLES.md part 4): past 400ms the user starts to
 * disengage. `duration.slow` intentionally exceeds it — the HUD entering and
 * leaving the screen is the one documented exception.
 */
const RESPONSE_BUDGET_MS = 400;

export function isWithinResponseBudget(ms: number): boolean {
	return ms <= RESPONSE_BUDGET_MS;
}

export type EasingToken = keyof typeof easing;
export type DurationToken = keyof typeof duration;
