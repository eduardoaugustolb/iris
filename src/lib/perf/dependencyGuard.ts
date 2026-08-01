/**
 * Packages that must not come back. `gsap`, `emoji-picker-react` and `mp4box`
 * had zero imports when audited; `motion` was used only as a spring integrator,
 * replaced by src/lib/spring.ts. UI motion is CSS/WAAPI by decision.
 * `lucide-react` and `react-icons` were fully replaced by `@phosphor-icons/react`
 * during the Íris rebrand (Fases 3–6) — icons are Phosphor-only (DESIGN.md §7).
 */
export const BANNED_DEPENDENCIES = [
	"gsap",
	"motion",
	"emoji-picker-react",
	"mp4box",
	"lucide-react",
	"react-icons",
] as const satisfies readonly string[];

export function findBannedDependencies(packageJson: {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}): string[] {
	const installed = new Set([
		...Object.keys(packageJson.dependencies ?? {}),
		...Object.keys(packageJson.devDependencies ?? {}),
	]);

	return BANNED_DEPENDENCIES.filter((name) => installed.has(name));
}
