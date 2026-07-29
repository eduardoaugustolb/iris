import { describe, expect, it } from "vitest";
import { integrateSpring } from "./spring";

const config = { stiffness: 320, damping: 40, mass: 0.92 };

describe("integrateSpring", () => {
	it("moves toward the target", () => {
		const next = integrateSpring({ value: 0, velocity: 0, target: 100, deltaMs: 16, ...config });

		expect(next.value).toBeGreaterThan(0);
		expect(next.value).toBeLessThan(100);
		expect(next.velocity).toBeGreaterThan(0);
	});

	it("stays put when already at the target with no velocity", () => {
		const next = integrateSpring({ value: 50, velocity: 0, target: 50, deltaMs: 16, ...config });

		expect(next.value).toBeCloseTo(50, 6);
		expect(next.velocity).toBeCloseTo(0, 6);
	});

	it("settles at the target after enough steps instead of oscillating forever", () => {
		let state = { value: 0, velocity: 0 };

		for (let step = 0; step < 400; step += 1) {
			state = integrateSpring({ ...state, target: 100, deltaMs: 16, ...config });
		}

		expect(state.value).toBeCloseTo(100, 1);
		expect(Math.abs(state.velocity)).toBeLessThan(0.5);
	});

	it("is stable across a long frame, so a stutter doesn't fling the value", () => {
		const next = integrateSpring({ value: 0, velocity: 0, target: 100, deltaMs: 250, ...config });

		expect(Number.isFinite(next.value)).toBe(true);
		expect(next.value).toBeLessThanOrEqual(100);
	});

	it("allocates nothing per call beyond its return value", () => {
		const next = integrateSpring({ value: 1, velocity: 2, target: 3, deltaMs: 16, ...config });

		expect(Object.keys(next)).toEqual(["value", "velocity"]);
	});
});
