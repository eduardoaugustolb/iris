import { afterEach, describe, expect, it, vi } from "vitest";
import { duration, easing } from "../tokens/motion";
import { closeDiaphragm, crossfade, prefersReducedMotion, reveal } from "./animate";

function mockReducedMotion(matches: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("prefersReducedMotion", () => {
	it("is true when the system asks for reduced motion", () => {
		mockReducedMotion(true);

		expect(prefersReducedMotion()).toBe(true);
	});

	it("is false otherwise", () => {
		mockReducedMotion(false);

		expect(prefersReducedMotion()).toBe(false);
	});
});

describe("reveal", () => {
	it("animates only opacity and transform, so the compositor can own the frame", () => {
		mockReducedMotion(false);
		const element = document.createElement("div");
		const animate = vi.fn().mockReturnValue({} as Animation);
		element.animate = animate;

		reveal(element);

		const [keyframes] = animate.mock.calls[0];
		const properties = new Set(keyframes.flatMap((frame: object) => Object.keys(frame)));

		expect(properties).toEqual(new Set(["opacity", "transform"]));
	});

	it("uses the standard curve and standard duration by default", () => {
		mockReducedMotion(false);
		const element = document.createElement("div");
		const animate = vi.fn().mockReturnValue({} as Animation);
		element.animate = animate;

		reveal(element);

		const [, options] = animate.mock.calls[0];

		expect(options.duration).toBe(duration.standard);
		expect(options.easing).toBe(easing.standard);
	});

	it("starts from a 0.98 scale, never a bounce", () => {
		mockReducedMotion(false);
		const element = document.createElement("div");
		const animate = vi.fn().mockReturnValue({} as Animation);
		element.animate = animate;

		reveal(element);

		const [keyframes] = animate.mock.calls[0];

		expect(keyframes[0].transform).toBe("scale(0.98)");
		expect(keyframes[1].transform).toBe("scale(1)");
	});

	it("drops the scale and shortens to the fast duration under reduced motion", () => {
		mockReducedMotion(true);
		const element = document.createElement("div");
		const animate = vi.fn().mockReturnValue({} as Animation);
		element.animate = animate;

		reveal(element);

		const [keyframes, options] = animate.mock.calls[0];

		expect(keyframes.every((frame: { transform?: string }) => frame.transform === undefined)).toBe(
			true,
		);
		expect(options.duration).toBe(duration.fast);
	});
});

describe("closeDiaphragm", () => {
	it("animates every blade with the spring curve and slow duration", () => {
		mockReducedMotion(false);
		const animate = vi.fn().mockReturnValue({} as Animation);
		const blades = [0, 1].map(() => {
			const el = document.createElement("div");
			el.animate = animate;
			return el;
		});

		closeDiaphragm(blades);

		expect(animate).toHaveBeenCalledTimes(2);
		for (const call of animate.mock.calls) {
			const [, options] = call;
			expect(options.duration).toBe(duration.slow);
			expect(options.easing).toBe(easing.spring);
			expect(options.fill).toBe("forwards");
		}
	});

	it("folds each blade's own base angle into its keyframes so the rosette stays a rosette", () => {
		mockReducedMotion(false);
		const animate = vi.fn().mockReturnValue({} as Animation);
		const blades = [0, 1, 2].map(() => {
			const el = document.createElement("div");
			el.animate = animate;
			return el;
		});

		closeDiaphragm(blades, [0, 60, 120]);

		// A WAAPI transform keyframe is a CSS declaration and outranks the SVG
		// `transform` presentation attribute that spaces the blades apart, so a
		// shared `rotate(0deg)` start would snap all blades onto one angle and
		// collapse them as a single stacked shape. Each blade must start from its
		// own resting angle and sweep the same 35 degrees from there.
		const starts = animate.mock.calls.map(([keyframes]) => keyframes[0].transform);
		const ends = animate.mock.calls.map(([keyframes]) => keyframes[1].transform);

		expect(starts).toEqual([
			"rotate(0deg) scale(1)",
			"rotate(60deg) scale(1)",
			"rotate(120deg) scale(1)",
		]);
		expect(ends).toEqual([
			"rotate(35deg) scale(0.15)",
			"rotate(95deg) scale(0.15)",
			"rotate(155deg) scale(0.15)",
		]);
		expect(new Set(starts).size).toBe(3);
	});

	it("only animates opacity and transform per blade", () => {
		mockReducedMotion(false);
		const animate = vi.fn().mockReturnValue({} as Animation);
		const blade = document.createElement("div");
		blade.animate = animate;

		closeDiaphragm([blade]);

		const [keyframes] = animate.mock.calls[0];
		const properties = new Set(keyframes.flatMap((frame: object) => Object.keys(frame)));
		expect(properties).toEqual(new Set(["opacity", "transform"]));
	});
});

describe("crossfade", () => {
	it("fades the first element out and the second in, over the fast duration by default", () => {
		const fromAnimate = vi.fn().mockReturnValue({} as Animation);
		const toAnimate = vi.fn().mockReturnValue({} as Animation);
		const from = document.createElement("div");
		const to = document.createElement("div");
		from.animate = fromAnimate;
		to.animate = toAnimate;

		crossfade(from, to);

		expect(fromAnimate.mock.calls[0][0]).toEqual([{ opacity: 1 }, { opacity: 0 }]);
		expect(toAnimate.mock.calls[0][0]).toEqual([{ opacity: 0 }, { opacity: 1 }]);
		expect(fromAnimate.mock.calls[0][1].duration).toBe(duration.fast);
		expect(toAnimate.mock.calls[0][1].duration).toBe(duration.fast);
	});
});
