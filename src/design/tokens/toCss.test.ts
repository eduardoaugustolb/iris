import { describe, expect, it } from "vitest";
import { tokensToCss } from "./toCss";

describe("tokensToCss", () => {
	const css = tokensToCss();

	it("wraps everything in a :root block", () => {
		expect(css.startsWith(":root {")).toBe(true);
		expect(css.trimEnd().endsWith("}")).toBe(true);
	});

	it("uses the custom property names DESIGN.md specifies", () => {
		expect(css).toContain("--surface-base: #0A0A0C;");
		expect(css).toContain("--brand-primary: #5E5CE6;");
		expect(css).toContain("--semantic-recording: #FF453A;");
	});

	it("emits the spacing scale with px units", () => {
		expect(css).toContain("--space-1: 4px;");
		expect(css).toContain("--space-8: 64px;");
	});

	it("emits the radius scale with px units", () => {
		expect(css).toContain("--radius-sm: 8px;");
		expect(css).toContain("--radius-xl: 28px;");
	});

	it("emits both easing curves and all three durations", () => {
		expect(css).toContain("--ease-standard: cubic-bezier(0.32, 0.72, 0, 1);");
		expect(css).toContain("--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);");
		expect(css).toContain("--duration-fast: 150ms;");
		expect(css).toContain("--duration-slow: 420ms;");
	});

	it("emits the font stacks", () => {
		expect(css).toContain("--font-text:");
		expect(css).toContain("--font-mono:");
	});

	it("emits elevation blur pairs so no surface can raise one without the other", () => {
		expect(css).toContain("--elevation-2-backdrop-blur: 24px;");
		expect(css).toContain("--elevation-2-shadow-blur: 32px;");
	});
});
