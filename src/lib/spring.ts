export interface SpringStep {
	value: number;
	velocity: number;
	target: number;
	deltaMs: number;
	stiffness: number;
	damping: number;
	mass: number;
}

// Sub-stepping keeps the integrator stable when a frame runs long: one 250ms
// leap through a stiff spring diverges, ten 25ms steps don't.
const MAX_SUB_STEP_MS = 8;

/**
 * Semi-implicit Euler spring. Replaces `motion`'s spring generator, which
 * allocated a new generator on every frame of the cursor and zoom hot path.
 */
export function integrateSpring(step: SpringStep): { value: number; velocity: number } {
	const subSteps = Math.max(1, Math.ceil(step.deltaMs / MAX_SUB_STEP_MS));
	const dt = step.deltaMs / subSteps / 1000;

	let value = step.value;
	let velocity = step.velocity;

	for (let index = 0; index < subSteps; index += 1) {
		const springForce = -step.stiffness * (value - step.target);
		const dampingForce = -step.damping * velocity;

		velocity += ((springForce + dampingForce) / step.mass) * dt;
		value += velocity * dt;
	}

	return { value, velocity };
}
