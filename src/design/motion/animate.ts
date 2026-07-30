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
