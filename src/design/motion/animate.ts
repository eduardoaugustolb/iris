import { duration, easing } from "../tokens/motion";

export function prefersReducedMotion(): boolean {
	return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface RevealOptions {
	durationMs: number;
	easing: string;
}

/**
 * The default utility motion of DESIGN.md section 8: fade plus a 0.98 to 1
 * micro-scale, never a bounce. Only opacity and transform are touched so the
 * compositor can run it without layout or paint.
 */
export function reveal(element: Element, options: Partial<RevealOptions> = {}): Animation {
	const reduced = prefersReducedMotion();

	const keyframes = reduced
		? [{ opacity: 0 }, { opacity: 1 }]
		: [
				{ opacity: 0, transform: "scale(0.98)" },
				{ opacity: 1, transform: "scale(1)" },
			];

	return element.animate(keyframes, {
		duration: options.durationMs ?? (reduced ? duration.fast : duration.standard),
		easing: options.easing ?? easing.standard,
		fill: "both",
	});
}

/**
 * The diaphragm's signature animation (DESIGN.md section 8): every blade
 * rotates and scales to the center simultaneously. Callers must check
 * `!prefersReducedMotion()` before calling this — the reduced-motion path is
 * `crossfade`, never a scaled-down version of this rotation.
 */
export function closeDiaphragm(bladeElements: Element[]): Animation[] {
	return bladeElements.map((blade) =>
		blade.animate(
			[
				{ opacity: 1, transform: "rotate(0deg) scale(1)" },
				{ opacity: 0, transform: "rotate(35deg) scale(0.15)" },
			],
			{ duration: duration.slow, easing: easing.spring, fill: "forwards" },
		),
	);
}

/**
 * Plain opacity crossfade between two elements occupying the same spot — used
 * for the reduced-motion diaphragm transition (both directions) and for the
 * "stop recording" transition (DESIGN.md section 8 only specifies the start
 * transition; this project's design spec, 2026-07-30-iris-hud-fase3-design.md,
 * decided stop never reverses the blade rotation).
 */
export function crossfade(fromElement: Element, toElement: Element): Animation[] {
	const options = { duration: duration.fast, easing: easing.standard, fill: "forwards" as const };
	return [
		fromElement.animate([{ opacity: 1 }, { opacity: 0 }], options),
		toElement.animate([{ opacity: 0 }, { opacity: 1 }], options),
	];
}
