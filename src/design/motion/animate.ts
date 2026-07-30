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
 * Plain opacity crossfade between two elements occupying the same spot — used
 * for the diaphragm's start/stop transitions (both directions). DESIGN.md
 * section 8's original spec called for an elaborate per-blade rotation on
 * start; that was replaced by a static Aperture glyph from `@phosphor-icons/react`
 * plus this crossfade (2026-07-30, `docs/superpowers/plans/2026-07-30-iris-hud-fase3.md`)
 * after repeated hand-drawn blade geometry shipped visibly broken.
 */
export function crossfade(fromElement: Element, toElement: Element): Animation[] {
	const options = { duration: duration.fast, easing: easing.standard, fill: "forwards" as const };
	return [
		fromElement.animate([{ opacity: 1 }, { opacity: 0 }], options),
		toElement.animate([{ opacity: 0 }, { opacity: 1 }], options),
	];
}
