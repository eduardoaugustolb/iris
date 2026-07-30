import { color } from "./color.ts";
import { duration, easing } from "./motion.ts";
import { elevation, radius, space } from "./space.ts";
import { fontStack } from "./typography.ts";

/** camelCase token key to the kebab-case custom property name in DESIGN.md. */
function kebab(name: string): string {
	return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

const COLOR_PROPERTY: Record<keyof typeof color, string> = {
	surfaceBase: "--surface-base",
	surfaceRaised: "--surface-raised",
	brandPrimary: "--brand-primary",
	brandPrimaryHover: "--brand-primary-hover",
	specular: "--specular",
	textPrimary: "--text-primary",
	textSecondary: "--text-secondary",
	textTertiary: "--text-tertiary",
	semanticRecording: "--semantic-recording",
	semanticSuccess: "--semantic-success",
	semanticWarning: "--semantic-warning",
};

export function tokensToCss(): string {
	const lines: string[] = [];

	for (const [token, value] of Object.entries(color)) {
		lines.push(`\t${COLOR_PROPERTY[token as keyof typeof color]}: ${value};`);
	}

	for (const [step, px] of Object.entries(space)) {
		lines.push(`\t--space-${step}: ${px}px;`);
	}

	for (const [step, px] of Object.entries(radius)) {
		lines.push(`\t--radius-${step}: ${px}px;`);
	}

	for (const [level, blur] of Object.entries(elevation)) {
		lines.push(`\t--elevation-${level}-backdrop-blur: ${blur.backdropBlurPx}px;`);
		lines.push(`\t--elevation-${level}-shadow-blur: ${blur.shadowBlurPx}px;`);
	}

	for (const [name, value] of Object.entries(fontStack)) {
		lines.push(`\t--font-${kebab(name)}: ${value};`);
	}

	for (const [name, value] of Object.entries(easing)) {
		lines.push(`\t--ease-${kebab(name)}: ${value};`);
	}

	for (const [name, ms] of Object.entries(duration)) {
		lines.push(`\t--duration-${kebab(name)}: ${ms}ms;`);
	}

	return `:root {\n${lines.join("\n")}\n}\n`;
}
