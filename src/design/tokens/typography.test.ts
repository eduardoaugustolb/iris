import { describe, expect, it } from "vitest";
import { fontStack, typography } from "./typography";

describe("typography scale", () => {
	it("is the seven steps from DESIGN.md section 4", () => {
		expect(typography).toEqual({
			display: { sizePx: 34, lineHeight: 1.1, weight: 700 },
			title1: { sizePx: 22, lineHeight: 1.2, weight: 600 },
			title2: { sizePx: 17, lineHeight: 1.3, weight: 600 },
			body: { sizePx: 13, lineHeight: 1.4, weight: 400 },
			bodyEmphasis: { sizePx: 13, lineHeight: 1.4, weight: 590 },
			caption: { sizePx: 11, lineHeight: 1.3, weight: 400 },
			captionNumeric: { sizePx: 11, lineHeight: 1.3, weight: 500, tabularNums: true },
		});
	});

	it("never goes above weight 700, the most common tell of a fake Apple UI", () => {
		for (const step of Object.values(typography)) {
			expect(step.weight).toBeLessThanOrEqual(700);
		}
	});
});

describe("font stack", () => {
	it("leads with the embedded family, not a system font", () => {
		expect(fontStack.display.startsWith('"Iris Sans"')).toBe(true);
		expect(fontStack.text.startsWith('"Iris Sans"')).toBe(true);
		expect(fontStack.mono.startsWith('"Iris Mono"')).toBe(true);
	});

	it("ships no Apple-licensed family name", () => {
		const stacks = Object.values(fontStack).join(" ");

		expect(stacks).not.toContain("SF Pro");
		expect(stacks).not.toContain("SF Mono");
		expect(stacks).not.toContain("-apple-system");
	});
});
