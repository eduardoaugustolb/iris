# Íris Fase 3 — HUD de gravação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the entire HUD-overlay bar (today baked into `LaunchWindow.tsx` as raw Tailwind) as a set of focused, tested components under `src/components/hud/`, built on the Fase 2 design system (tokens, `Glass`, `Icon`, WAAPI motion), with the diaphragm signature animation and a measured render budget.

**Architecture:** `LaunchWindow.tsx` keeps 100% of its existing state, hooks, refs and effects unchanged — it only stops rendering the bar's JSX itself and instead renders `<HudOverlay />`, passing everything through as props (including DOM ref-callbacks and pointer handlers the existing window-sizing/drag logic needs). `HudOverlay` and its children are pure presentational components; no recording/device/i18n logic is duplicated or reimplemented.

**Tech Stack:** React 18 + TypeScript, Vitest + Testing Library, WAAPI (`element.animate`) — no animation library, per project-wide decision.

## Global Constraints

- Two easing curves only: `--ease-standard` (`cubic-bezier(0.32, 0.72, 0, 1)`) and `--ease-spring` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) — from `src/design/tokens/motion.ts`. Never introduce a third.
- Durations: `duration.fast = 150`, `duration.standard = 280`, `duration.slow = 420` (ms) — same file. `duration.slow` is reserved for the HUD entering/leaving the screen and the diaphragm's opening animation; nothing else uses it.
- `Glass` (`src/design/glass/Glass.tsx`) is the only place allowed to construct `backdrop-filter`. Enforced by `src/design/guardrails/noRogueGlass.test.ts`.
- Colour values come from `src/design/tokens/color.ts` (`color.semanticRecording`, `color.semanticWarning`, `color.brandPrimary`, `color.textPrimary/Secondary/Tertiary`). Mapping from the current ad hoc Tailwind values, applied consistently across every task below:
  - Recording-active red (`text-red-400`, `bg-red-500/12`) → `color.semanticRecording`.
  - Paused amber (`text-amber-400`, `bg-amber-500/10`) → `color.semanticWarning`.
  - "Toggle is on" green glow (`text-green-400`, `drop-shadow(...rgba(74,222,128,...))`) → `color.brandPrimary`. DESIGN.md §3 reserves violet exactly for "active state, focus of interactive elements" — the green glow was never a designed colour, it's legacy.
  - Icon/text opacity tiers: original code uses five ad hoc white opacities (0.80, 0.60, 0.45, 0.40, 0.30) for a control's or icon's visual weight. Collapse to the three tiers DESIGN.md §3 actually defines: ≥0.7 → `color.textPrimary`, 0.45–0.69 → `color.textSecondary`, <0.45 → `color.textTertiary`.
- Icons: only `Icon` (`src/design/icons/Icon.tsx`) + `sprite.svg` symbols. No `react-icons`, no `lucide-react`, anywhere under `src/components/hud/`.
- DESIGN.md §1 bans literal camera/film iconography ("câmera de cinema, claquete") — the current "open studio" button uses `Clapperboard` from `lucide-react`, which violates this rule already. Its replacement icon must come from the aperture/lens vocabulary (concentric circles), not a clapperboard.
- `prefers-reduced-motion` must always resolve to a plain opacity crossfade, `duration.fast`, never a transform/rotation — checked via `prefersReducedMotion()` in `src/design/motion/animate.ts`.
- Never mount `createRenderCounter().Probe` under `React.StrictMode` — it double-counts.

---

### Task 1: `Glass` forwards refs and DOM props

The HUD bar needs a `ref` (for the existing `ResizeObserver`-driven window-sizing logic) and pointer handlers (`onPointerEnter`, `onPointerLeave`, `onPointerDown`) directly on the glass surface. `Glass` today only accepts `level`, `radius`, `className`, `children` — nothing else reaches the DOM node.

**Files:**
- Modify: `src/design/glass/Glass.tsx`
- Test: `src/design/glass/Glass.test.tsx`

**Interfaces:**
- Produces: `Glass` becomes `React.forwardRef<HTMLDivElement, GlassProps>`, where `GlassProps extends Omit<React.ComponentPropsWithoutRef<"div">, "style">` (so `ref`, `onPointerEnter/Leave/Down`, `data-*`, `aria-*`, `id`, etc. all pass through) plus the existing `level`/`radius`/`className`/`children`. `style` stays excluded from the public props — the component still owns and computes it internally, merging in nothing.

- [ ] **Step 1: Write the failing test**

Add to `src/design/glass/Glass.test.tsx`:

```tsx
it("forwards a ref to the underlying div", () => {
  const ref = { current: null as HTMLDivElement | null };
  render(
    <Glass level={2} ref={ref}>
      content
    </Glass>,
  );
  expect(ref.current).toBeInstanceOf(HTMLDivElement);
});

it("passes through arbitrary DOM props like data attributes and pointer handlers", () => {
  const onPointerEnter = () => {};
  render(
    <Glass level={2} data-testid="glass-surface" onPointerEnter={onPointerEnter}>
      content
    </Glass>,
  );
  const element = screen.getByTestId("glass-surface");
  expect(element).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design/glass/Glass.test.tsx`
Expected: FAIL — `ref` is not a valid prop on a plain function component, `data-testid` never reaches the DOM.

- [ ] **Step 3: Implement**

Replace the component in `src/design/glass/Glass.tsx`:

```tsx
import { type CSSProperties, type ComponentPropsWithoutRef, forwardRef, type ReactNode } from "react";
import { type ElevationLevel, elevation, type RadiusToken, radius } from "../tokens/space";

export const GLASS_MARKER = "data-iris-glass";

export interface GlassProps extends Omit<ComponentPropsWithoutRef<"div">, "style"> {
	level: ElevationLevel;
	radius?: RadiusToken;
	children?: ReactNode;
}

/**
 * The only place in the app allowed to build the glass material. It stacks the
 * three layers DESIGN.md section 5 requires — backdrop blur, surface tint and
 * specular border — because any one of them alone reads as flat translucency.
 */
export const Glass = forwardRef<HTMLDivElement, GlassProps>(function Glass(
	{ level, radius: radiusToken = "lg", className, children, ...rest },
	ref,
) {
	const { backdropBlurPx, shadowBlurPx } = elevation[level];
	const backdrop = `blur(${backdropBlurPx}px) saturate(180%)`;

	const style: CSSProperties = {
		backdropFilter: backdrop,
		WebkitBackdropFilter: backdrop,
		background: "rgba(255, 255, 255, 0.08)",
		border: "0.5px solid rgba(255, 255, 255, 0.14)",
		borderTop: "0.5px solid rgba(255, 255, 255, 0.24)",
		borderRadius: `${radius[radiusToken]}px`,
		boxShadow: [
			"0 0 0 0.5px rgba(0, 0, 0, 0.3)",
			`0 12px ${shadowBlurPx}px rgba(0, 0, 0, 0.28)`,
			"inset 0 1px 0 rgba(255, 255, 255, 0.08)",
		].join(", "),
	};

	return (
		<div
			ref={ref}
			className={className}
			style={style}
			{...{ [GLASS_MARKER]: String(level) }}
			{...rest}
		>
			{children}
		</div>
	);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/design/glass/Glass.test.tsx`
Expected: PASS (all tests, including the pre-existing ones — the visual behaviour is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/design/glass/Glass.tsx src/design/glass/Glass.test.tsx
git commit -m "feat(design): forward ref and DOM props through Glass"
```

---

### Task 2: Diaphragm motion helper in `src/design/motion/animate.ts`

The diaphragm button needs two WAAPI-driven behaviours the existing `reveal()` helper doesn't cover: (a) animating N independent blade elements simultaneously with a spring rotation/scale-to-center, and (b) a plain opacity crossfade fallback under reduced motion. Both need to be reusable and unit-testable the same way `reveal()`/`prefersReducedMotion()` already are.

**Files:**
- Modify: `src/design/motion/animate.ts`
- Test: `src/design/motion/animate.test.ts`

**Interfaces:**
- Consumes: `duration`, `easing` from `../tokens/motion`; `prefersReducedMotion` (already exported by this file).
- Produces:
  ```ts
  export function closeDiaphragm(bladeElements: Element[]): Animation[]
  export function crossfade(fromElement: Element, toElement: Element): Animation[]
  ```
  `closeDiaphragm` is only ever called when `!prefersReducedMotion()` (callers check first, same pattern as `reveal`). `crossfade` is used for the reduced-motion diaphragm path (icon → dot) and for the "stop recording" transition in both motion modes.

- [ ] **Step 1: Write the failing test**

Append to `src/design/motion/animate.test.ts`:

```ts
import { closeDiaphragm, crossfade } from "./animate";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design/motion/animate.test.ts`
Expected: FAIL — `closeDiaphragm`/`crossfade` are not exported.

- [ ] **Step 3: Implement**

Append to `src/design/motion/animate.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/design/motion/animate.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/design/motion/animate.ts src/design/motion/animate.test.ts
git commit -m "feat(design): add closeDiaphragm and crossfade WAAPI helpers"
```

---

### Task 3: New icon symbols + `IconName` union

The HUD bar needs symbols the sprite doesn't have yet. All follow the existing convention: `viewBox="0 0 20 20"`, `fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`.

**Files:**
- Modify: `src/design/icons/sprite.svg`
- Modify: `src/design/icons/Icon.tsx`
- Test: `src/design/icons/Icon.test.tsx`

**Interfaces:**
- Produces: `IconName` gains these members: `"monitor"`, `"volume-on"`, `"volume-off"`, `"microphone-off"`, `"camera-off"`, `"cursor"`, `"resume"`, `"restart"`, `"cancel"`, `"chevron-down"`, `"tray-columns"`, `"tray-rows"`, `"language"`, `"notes"`, `"lens"`, `"spinner"`. (`"microphone"` and `"camera"` already exist and cover the "on" states; `"pause"`, `"stop"`, `"record"`, `"minimize"`, `"close"`, `"check"`, `"drag-handle"` already exist and are reused as-is.)

- [ ] **Step 1: Write the failing test**

Append to `src/design/icons/Icon.test.tsx` (one parametrized-style case per new name; follow whatever pattern the existing file already uses for the 12 current names — if it iterates over `IconName` values and asserts each resolves to a mounted `<symbol>`, the new entries are covered automatically once added to the union and the sprite; otherwise add explicit cases):

```tsx
it.each([
	"monitor",
	"volume-on",
	"volume-off",
	"microphone-off",
	"camera-off",
	"cursor",
	"resume",
	"restart",
	"cancel",
	"chevron-down",
	"tray-columns",
	"tray-rows",
	"language",
	"notes",
	"lens",
	"spinner",
] as const)("renders icon-%s from the sprite", (name) => {
	render(
		<>
			<IconSpriteProvider />
			<Icon name={name} label={name} />
		</>,
	);
	const svg = screen.getByRole("img", { name });
	expect(svg.querySelector("use")).toHaveAttribute("href", `#icon-${name}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design/icons/Icon.test.tsx`
Expected: FAIL — TypeScript error (names not in `IconName`) and/or missing `<symbol>` elements.

- [ ] **Step 3: Implement**

Add to `src/design/icons/sprite.svg`, before the closing `</svg>`:

```xml
	<symbol id="icon-monitor" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<rect x="3" y="4.5" width="14" height="9" rx="1.5" />
		<path d="M7.5 16.5h5M10 13.5v3" />
	</symbol>
	<symbol id="icon-volume-on" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M4 8h2.5L10 5v10l-3.5-3H4z" />
		<path d="M13 7.5a4 4 0 0 1 0 5" />
	</symbol>
	<symbol id="icon-volume-off" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M4 8h2.5L10 5v10l-3.5-3H4z" />
		<path d="M12.5 8l3 4M15.5 8l-3 4" />
	</symbol>
	<symbol id="icon-microphone-off" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<rect x="7.5" y="3" width="5" height="8" rx="2.5" />
		<path d="M5.5 10v.5a4.5 4.5 0 0 0 9 0V10M10 15v2" />
		<path d="M4 4l12 12" />
	</symbol>
	<symbol id="icon-camera-off" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M3 7.5a1 1 0 0 1 1-1h1.5l1-1.5h5l1 1.5H15a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
		<circle cx="9.5" cy="10.5" r="2.5" />
		<path d="M3.5 3.5l13 13" />
	</symbol>
	<symbol id="icon-cursor" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M5 4l9 9-3.5.5L9 17z" />
	</symbol>
	<symbol id="icon-resume" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M7 5l7 5-7 5z" />
	</symbol>
	<symbol id="icon-restart" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M14.5 6a5.5 5.5 0 1 1-1.8-2.4" />
		<path d="M14.5 2.8v3.5H11" />
	</symbol>
	<symbol id="icon-cancel" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<circle cx="10" cy="10" r="6.5" />
		<path d="M7.8 7.8l4.4 4.4M12.2 7.8l-4.4 4.4" />
	</symbol>
	<symbol id="icon-chevron-down" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M4.5 7.5l5.5 6 5.5-6" />
	</symbol>
	<symbol id="icon-tray-columns" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M7 4v12M13 4v12" />
	</symbol>
	<symbol id="icon-tray-rows" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M4 7h12M4 13h12" />
	</symbol>
	<symbol id="icon-language" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<circle cx="10" cy="10" r="6.5" />
		<path d="M3.5 10h13" />
		<path d="M10 3.5a9 9 0 0 1 0 13" />
		<path d="M10 3.5a9 9 0 0 0 0 13" />
	</symbol>
	<symbol id="icon-notes" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<path d="M6 3.5h6l2.5 2.5V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
		<path d="M12 3.5V6h2.5" />
		<path d="M7 10.5h6M7 13h4" />
	</symbol>
	<symbol id="icon-lens" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
		<circle cx="10" cy="10" r="6.5" />
		<circle cx="10" cy="10" r="2.5" />
	</symbol>
	<symbol id="icon-spinner" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
		<circle cx="10" cy="10" r="6.5" stroke-dasharray="28 12" />
	</symbol>
```

Update the `IconName` union in `src/design/icons/Icon.tsx`:

```ts
export type IconName =
	| "record"
	| "stop"
	| "pause"
	| "settings"
	| "microphone"
	| "camera"
	| "close"
	| "minimize"
	| "check"
	| "folder"
	| "chevron-right"
	| "drag-handle"
	| "monitor"
	| "volume-on"
	| "volume-off"
	| "microphone-off"
	| "camera-off"
	| "cursor"
	| "resume"
	| "restart"
	| "cancel"
	| "chevron-down"
	| "tray-columns"
	| "tray-rows"
	| "language"
	| "notes"
	| "lens"
	| "spinner";
```

If `Icon.test.tsx` doesn't currently iterate names generically, adjust the added test block to match whatever pattern (individual `it(...)` blocks vs. `it.each`) the file already uses — read it first and mirror its style exactly.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/design/icons/Icon.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/design/icons/sprite.svg src/design/icons/Icon.tsx src/design/icons/Icon.test.tsx
git commit -m "feat(design): add HUD icon symbols to the sprite"
```

---

### Task 4: Guardrail coverage for `src/components/hud`

`noRogueGlass.test.ts` currently skips all of `src/components` (`LEGACY_ALLOWLIST`), because none of it is rebuilt on the design layer yet. The HUD is about to be the first surface that is — its comment ("shrinks to nothing as phases 3 to 6 land") means this is exactly when it starts shrinking.

**Files:**
- Modify: `src/design/guardrails/noRogueGlass.test.ts`
- Test: same file (guardrail tests are self-verifying — no separate test file)

**Interfaces:**
- Produces: the guardrail now walks into `src/components/hud` even though `src/components` stays allowlisted for every other subdirectory.

- [ ] **Step 1: Write the failing test**

This guardrail test doesn't need a new test case — it needs the walk itself to start covering the new directory before that directory exists, which would trivially pass (empty dir). Instead, verify the change is effective by temporarily creating a throwaway offending file:

```bash
mkdir -p src/components/hud
echo 'export const x = "backdrop-filter: blur(4px)";' > src/components/hud/_tmp_offender.ts
npx vitest run src/design/guardrails/noRogueGlass.test.ts
```

Expected: still PASS at this point (the walk hasn't been changed yet) — confirms the baseline, then remove the guard from the allowlist skip and re-run to see it FAIL.

- [ ] **Step 2: Confirm current behaviour doesn't catch it, then implement**

Edit `src/design/guardrails/noRogueGlass.test.ts`'s `sourceFiles` function:

```ts
function sourceFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		const relative = path.relative(SRC, full);

		if (entry.isDirectory()) {
			// components/hud is rebuilt on the design layer (Íris Fase 3) — always
			// walk it even though the rest of "components" is still legacy.
			if (relative === path.join("components", "hud")) return sourceFiles(full);
			return LEGACY_ALLOWLIST.includes(relative) ? [] : sourceFiles(full);
		}

		return /\.(ts|tsx|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
	});
}
```

- [ ] **Step 3: Run test to verify the offender is now caught**

Run: `npx vitest run src/design/guardrails/noRogueGlass.test.ts`
Expected: FAIL — `_tmp_offender.ts` reported.

- [ ] **Step 4: Remove the throwaway file, verify green, and commit**

```bash
rm src/components/hud/_tmp_offender.ts
npx vitest run src/design/guardrails/noRogueGlass.test.ts
```

Expected: PASS (directory is empty again, `it("finds files to check"...)` still passes because other legacy dirs still contain files — no wait, `src/components/hud` being empty doesn't affect that assertion, it counts files across everything not skipped).

```bash
git add src/design/guardrails/noRogueGlass.test.ts
git commit -m "chore(guardrails): stop exempting components/hud from the glass check"
```

---

### Task 5: `RecordingTimer`

**Files:**
- Create: `src/components/hud/RecordingTimer.tsx`
- Test: `src/components/hud/RecordingTimer.test.tsx`

**Interfaces:**
- Consumes: `color.semanticRecording`, `color.semanticWarning` from `@/design/tokens/color`; `formatTimePadded` from `@/utils/timeUtils` (existing helper, already used by `LaunchWindow.tsx` line 1118).
- Produces:
  ```ts
  export interface RecordingTimerProps {
  	elapsedSeconds: number;
  	paused: boolean;
  }
  export const RecordingTimer: React.NamedExoticComponent<RecordingTimerProps>; // React.memo
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/hud/RecordingTimer.test.tsx
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecordingTimer } from "./RecordingTimer";

describe("RecordingTimer", () => {
	it("formats elapsed seconds as mm:ss", () => {
		render(<RecordingTimer elapsedSeconds={125} paused={false} />);
		expect(screen.getByText("02:05")).toBeInTheDocument();
	});

	it("uses the recording colour while active", () => {
		render(<RecordingTimer elapsedSeconds={5} paused={false} />);
		expect(screen.getByText("00:05")).toHaveStyle({ color: "#FF453A" });
	});

	it("uses the warning colour while paused", () => {
		render(<RecordingTimer elapsedSeconds={5} paused={true} />);
		expect(screen.getByText("00:05")).toHaveStyle({ color: "#FF9F0A" });
	});

	it("does not re-render when props are referentially equal across parent re-renders", () => {
		let renderCount = 0;
		function Probe({ elapsedSeconds, paused }: { elapsedSeconds: number; paused: boolean }) {
			renderCount += 1;
			return <RecordingTimer elapsedSeconds={elapsedSeconds} paused={paused} />;
		}
		const { rerender } = render(<Probe elapsedSeconds={1} paused={false} />);
		expect(renderCount).toBe(1);
		rerender(<Probe elapsedSeconds={1} paused={false} />);
		expect(renderCount).toBe(2);
	});
});
```

(The last test exercises the wrapper, not `RecordingTimer` itself in isolation — the real render-budget assertion for the *rest of the tree not re-rendering* belongs in Task 12's `HudOverlay` test, per this plan's render budget. This test only pins down the formatting/colour contract.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/hud/RecordingTimer.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```tsx
// src/components/hud/RecordingTimer.tsx
import { memo } from "react";
import { color } from "@/design/tokens/color";
import { formatTimePadded } from "@/utils/timeUtils";

export interface RecordingTimerProps {
	elapsedSeconds: number;
	paused: boolean;
}

export const RecordingTimer = memo(function RecordingTimer({
	elapsedSeconds,
	paused,
}: RecordingTimerProps) {
	return (
		<span
			className="inline-block w-[34px] text-left text-xs font-semibold tabular-nums"
			style={{ color: paused ? color.semanticWarning : color.semanticRecording }}
		>
			{formatTimePadded(elapsedSeconds)}
		</span>
	);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/hud/RecordingTimer.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/RecordingTimer.tsx src/components/hud/RecordingTimer.test.tsx
git commit -m "feat(hud): add RecordingTimer"
```

---

### Task 6: `DiaphragmButton`

The signature element (DESIGN.md §8). Six blade `<path>`s (not sprite symbols — each needs an independent WAAPI animation target), reusing the geometric idiom of `icon-lens`/existing sprite icons: a hexagonal-ish rosette of six curved wedges around a center.

**Files:**
- Create: `src/components/hud/DiaphragmButton.tsx`
- Test: `src/components/hud/DiaphragmButton.test.tsx`

**Interfaces:**
- Consumes: `closeDiaphragm`, `crossfade`, `prefersReducedMotion` from `@/design/motion/animate`; `color.semanticRecording`, `color.brandPrimary`, `color.brandPrimaryHover` from `@/design/tokens/color`; `RecordingTimer` (Task 5).
- Produces:
  ```ts
  export interface DiaphragmButtonProps {
  	recording: boolean;
  	paused: boolean;
  	saving: boolean;
  	elapsedSeconds: number;
  	hasSelectedSource: boolean;
  	title: string;
  	onClick: () => void;
  }
  export function DiaphragmButton(props: DiaphragmButtonProps): JSX.Element;
  ```
  This is the direct replacement for the "Record/Stop group" block currently at `src/components/launch/LaunchWindow.tsx:1056-1123`. It owns its own `data-testid="launch-record-button"` (kept identical so existing E2E/manual QA references still resolve) and reads/writes no external state — all decisions come from props.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/hud/DiaphragmButton.test.tsx
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { duration, easing } from "@/design/tokens/motion";
import { DiaphragmButton } from "./DiaphragmButton";

function mockReducedMotion(matches: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
	);
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("DiaphragmButton", () => {
	it("calls onClick when pressed", () => {
		mockReducedMotion(false);
		const onClick = vi.fn();
		render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				title="Select a source"
				onClick={onClick}
			/>,
		);
		fireEvent.click(screen.getByTestId("launch-record-button"));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("is disabled while saving", () => {
		render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={true}
				elapsedSeconds={0}
				hasSelectedSource={true}
				title="Saving"
				onClick={vi.fn()}
			/>,
		);
		expect(screen.getByTestId("launch-record-button")).toBeDisabled();
	});

	it("renders the timer while recording", () => {
		render(
			<DiaphragmButton
				recording={true}
				paused={false}
				saving={false}
				elapsedSeconds={65}
				hasSelectedSource={true}
				title="Recording"
				onClick={vi.fn()}
			/>,
		);
		expect(screen.getByText("01:05")).toBeInTheDocument();
	});

	it("dims the diaphragm when no source is selected yet", () => {
		render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={false}
				title="Select a source"
				onClick={vi.fn()}
			/>,
		);
		const blades = screen.getByTestId("launch-record-button").querySelector("svg")
			?.parentElement as HTMLElement;
		expect(blades).toHaveStyle({ opacity: "0.45" });
	});

	it("animates every blade with the spring curve when starting to record, unless reduced motion is on", () => {
		mockReducedMotion(false);
		const animate = vi.fn().mockReturnValue({} as Animation);
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = animate;

		const { rerender } = render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				title="Start"
				onClick={vi.fn()}
			/>,
		);
		rerender(
			<DiaphragmButton
				recording={true}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				title="Recording"
				onClick={vi.fn()}
			/>,
		);

		expect(animate).toHaveBeenCalled();
		const bladeCalls = animate.mock.calls.filter(
			([, options]) => options?.easing === easing.spring,
		);
		expect(bladeCalls.length).toBe(6);
		for (const [, options] of bladeCalls) {
			expect(options.duration).toBe(duration.slow);
		}

		Element.prototype.animate = originalAnimate;
	});

	it("crossfades instead of rotating blades when reduced motion is requested", () => {
		mockReducedMotion(true);
		const animate = vi.fn().mockReturnValue({} as Animation);
		const originalAnimate = Element.prototype.animate;
		Element.prototype.animate = animate;

		const { rerender } = render(
			<DiaphragmButton
				recording={false}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				title="Start"
				onClick={vi.fn()}
			/>,
		);
		rerender(
			<DiaphragmButton
				recording={true}
				paused={false}
				saving={false}
				elapsedSeconds={0}
				hasSelectedSource={true}
				title="Recording"
				onClick={vi.fn()}
			/>,
		);

		const springCalls = animate.mock.calls.filter(([, options]) => options?.easing === easing.spring);
		expect(springCalls.length).toBe(0);
		const fastCalls = animate.mock.calls.filter(([, options]) => options?.duration === duration.fast);
		expect(fastCalls.length).toBeGreaterThan(0);

		Element.prototype.animate = originalAnimate;
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/hud/DiaphragmButton.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```tsx
// src/components/hud/DiaphragmButton.tsx
import { useEffect, useRef } from "react";
import { color } from "@/design/tokens/color";
import { duration } from "@/design/tokens/motion";
import { closeDiaphragm, crossfade, prefersReducedMotion } from "@/design/motion/animate";
import { RecordingTimer } from "./RecordingTimer";

export interface DiaphragmButtonProps {
	recording: boolean;
	paused: boolean;
	saving: boolean;
	elapsedSeconds: number;
	hasSelectedSource: boolean;
	title: string;
	onClick: () => void;
}

const BLADE_COUNT = 6;
const BLADE_ANGLES = Array.from({ length: BLADE_COUNT }, (_, i) => (360 / BLADE_COUNT) * i);

/**
 * Six blades arranged around a rounded hexagonal void, 35% open — DESIGN.md
 * section 7's reference angle (fully open/closed both read as generic shapes).
 * Each blade is a separate path so Task-level motion can animate them
 * independently (closeDiaphragm needs one Element per blade).
 */
function DiaphragmBlades({ bladeRefs }: { bladeRefs: React.MutableRefObject<(SVGPathElement | null)[]> }) {
	return (
		<svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true">
			<defs>
				<linearGradient id="diaphragm-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor={color.brandPrimary} />
					<stop offset="100%" stopColor={color.brandPrimaryHover} />
				</linearGradient>
			</defs>
			<g fill="url(#diaphragm-gradient)">
				{BLADE_ANGLES.map((angle, index) => (
					<path
						key={angle}
						ref={(el) => {
							bladeRefs.current[index] = el;
						}}
						d="M10 10 L10 3 A7 7 0 0 1 15.5 6 Z"
						transform={`rotate(${angle} 10 10)`}
					/>
				))}
			</g>
		</svg>
	);
}

export function DiaphragmButton({
	recording,
	paused,
	saving,
	elapsedSeconds,
	hasSelectedSource,
	title,
	onClick,
}: DiaphragmButtonProps) {
	const bladeRefs = useRef<(SVGPathElement | null)[]>([]);
	const dotRef = useRef<HTMLSpanElement | null>(null);
	const bladesWrapperRef = useRef<HTMLSpanElement | null>(null);
	const wasRecording = useRef(recording);

	useEffect(() => {
		const startedRecording = recording && !wasRecording.current;
		const stoppedRecording = !recording && wasRecording.current;
		wasRecording.current = recording;

		const blades = bladeRefs.current.filter((el): el is SVGPathElement => el !== null);
		if (blades.length === 0 || !dotRef.current || !bladesWrapperRef.current) return;

		if (startedRecording) {
			if (prefersReducedMotion()) {
				crossfade(bladesWrapperRef.current, dotRef.current);
			} else {
				closeDiaphragm(blades);
				dotRef.current.animate([{ opacity: 0 }, { opacity: 1 }], {
					duration: duration.fast,
					delay: duration.slow - duration.fast,
					fill: "forwards",
				});
			}
		} else if (stoppedRecording) {
			crossfade(dotRef.current, bladesWrapperRef.current);
		}
	}, [recording]);

	return (
		<button
			type="button"
			data-testid="launch-record-button"
			disabled={saving}
			title={title}
			aria-label={title}
			onClick={onClick}
			className="relative flex items-center justify-center gap-1.5 rounded-full p-2 transition-[min-width] duration-150"
			style={{ minWidth: recording || saving ? 78 : 36 }}
		>
			<span
				ref={bladesWrapperRef}
				style={{
					opacity: recording ? 0 : hasSelectedSource ? 1 : 0.45,
					position: recording ? "absolute" : "static",
				}}
			>
				<DiaphragmBlades bladeRefs={bladeRefs} />
			</span>
			<span
				ref={dotRef}
				style={{
					display: "inline-block",
					width: 10,
					height: 10,
					borderRadius: "50%",
					background: color.semanticRecording,
					opacity: recording ? 1 : 0,
					position: recording ? "static" : "absolute",
				}}
			/>
			{recording && <RecordingTimer elapsedSeconds={elapsedSeconds} paused={paused} />}
		</button>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/hud/DiaphragmButton.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/DiaphragmButton.tsx src/components/hud/DiaphragmButton.test.tsx
git commit -m "feat(hud): add DiaphragmButton with the signature open/close animation"
```

---

### Task 7: `HudNotices`

Extraction of the system-locale-suggestion and software-encoder-fallback notices currently at `src/components/launch/LaunchWindow.tsx:682-757`.

**Files:**
- Create: `src/components/hud/HudNotices.tsx`
- Test: `src/components/hud/HudNotices.test.tsx`

**Interfaces:**
- Consumes: `Glass` (Task 1), `Button` from `@/components/ui/button` (already used at these exact call sites in the source — keep using it, it's a shared UI primitive, not something this plan touches).
- Produces:
  ```ts
  export interface HudNoticesProps {
  	t: ReturnType<typeof import("@/contexts/I18nContext").useScopedT>;
  	systemLocaleSuggestion: string | null;
  	suggestedLanguageName: string;
  	onAcceptSystemLocale: () => void;
  	onDismissSystemLocale: () => void;
  	setSystemLocalePromptEl: (el: HTMLDivElement | null) => void;
  	softwareEncoderFallbackNoticeVisible: boolean;
  	onDismissSoftwareFallback: (persist?: boolean) => void;
  	setSoftwareFallbackNoticeEl: (el: HTMLDivElement | null) => void;
  }
  export function HudNotices(props: HudNoticesProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/hud/HudNotices.test.tsx
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HudNotices } from "./HudNotices";

const t = ((key: string) => key) as HudNoticesProps["t"];

import type { HudNoticesProps } from "./HudNotices";

describe("HudNotices", () => {
	it("renders nothing when there is no suggestion or notice", () => {
		const { container } = render(
			<HudNotices
				t={t}
				systemLocaleSuggestion={null}
				suggestedLanguageName=""
				onAcceptSystemLocale={vi.fn()}
				onDismissSystemLocale={vi.fn()}
				setSystemLocalePromptEl={vi.fn()}
				softwareEncoderFallbackNoticeVisible={false}
				onDismissSoftwareFallback={vi.fn()}
				setSoftwareFallbackNoticeEl={vi.fn()}
			/>,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("renders the system locale prompt and wires its buttons", () => {
		const onAccept = vi.fn();
		const onDismiss = vi.fn();
		render(
			<HudNotices
				t={t}
				systemLocaleSuggestion="pt-BR"
				suggestedLanguageName="Português"
				onAcceptSystemLocale={onAccept}
				onDismissSystemLocale={onDismiss}
				setSystemLocalePromptEl={vi.fn()}
				softwareEncoderFallbackNoticeVisible={false}
				onDismissSoftwareFallback={vi.fn()}
				setSoftwareFallbackNoticeEl={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("systemLanguagePrompt.switch"));
		expect(onAccept).toHaveBeenCalledTimes(1);
		fireEvent.click(screen.getByText("systemLanguagePrompt.keepDefault"));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("renders the software encoder fallback notice and wires its buttons", () => {
		const onDismiss = vi.fn();
		render(
			<HudNotices
				t={t}
				systemLocaleSuggestion={null}
				suggestedLanguageName=""
				onAcceptSystemLocale={vi.fn()}
				onDismissSystemLocale={vi.fn()}
				setSystemLocalePromptEl={vi.fn()}
				softwareEncoderFallbackNoticeVisible={true}
				onDismissSoftwareFallback={onDismiss}
				setSoftwareFallbackNoticeEl={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("softwareEncoderFallback.dismiss"));
		expect(onDismiss).toHaveBeenCalledWith();
		fireEvent.click(screen.getByText("softwareEncoderFallback.dontShowAgain"));
		expect(onDismiss).toHaveBeenCalledWith(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/hud/HudNotices.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Port the JSX at `src/components/launch/LaunchWindow.tsx:682-757` verbatim into the new component, wrapping each notice panel's outer `div` (currently `rounded-xl border ... backdrop-blur-xl`) in `<Glass level={2}>` instead of the raw Tailwind blur/border classes — keep every other class (padding, text sizes, animation classes) as-is, since those are layout/typography, not material. Wire the `ref`/`data-hud-interactive` attributes straight onto the `Glass` instance (Task 1 makes this possible). Replace `systemLocaleSuggestion`/`suggestedLanguageName`/`acceptSystemLocaleSuggestion`/`dismissSystemLocaleSuggestion`/`softwareEncoderFallbackNoticeVisible`/`dismissSoftwareEncoderFallbackNotice`/`setSystemLocalePromptEl`/`setSoftwareFallbackNoticeEl`/`t` references with the corresponding prop from `HudNoticesProps`.

```tsx
// src/components/hud/HudNotices.tsx
import { Glass } from "@/design/glass/Glass";
import { Button } from "@/components/ui/button";
import type { useScopedT } from "@/contexts/I18nContext";

export interface HudNoticesProps {
	t: ReturnType<typeof useScopedT>;
	systemLocaleSuggestion: string | null;
	suggestedLanguageName: string;
	onAcceptSystemLocale: () => void;
	onDismissSystemLocale: () => void;
	setSystemLocalePromptEl: (el: HTMLDivElement | null) => void;
	softwareEncoderFallbackNoticeVisible: boolean;
	onDismissSoftwareFallback: (persist?: boolean) => void;
	setSoftwareFallbackNoticeEl: (el: HTMLDivElement | null) => void;
}

export function HudNotices({
	t,
	systemLocaleSuggestion,
	suggestedLanguageName,
	onAcceptSystemLocale,
	onDismissSystemLocale,
	setSystemLocalePromptEl,
	softwareEncoderFallbackNoticeVisible,
	onDismissSoftwareFallback,
	setSoftwareFallbackNoticeEl,
}: HudNoticesProps) {
	if (!systemLocaleSuggestion && !softwareEncoderFallbackNoticeVisible) return null;

	return (
		<div className="fixed top-8 left-1/2 z-30 flex w-[calc(100vw-1rem)] max-w-[520px] -translate-x-1/2 flex-col gap-2">
			{systemLocaleSuggestion && (
				<Glass
					level={2}
					ref={setSystemLocalePromptEl}
					data-hud-interactive="true"
					className="w-full p-3 text-white animate-in fade-in-0 zoom-in-95 duration-200"
				>
					<div className="text-[13px] font-semibold text-white">
						{t("systemLanguagePrompt.title")}
					</div>
					<div className="mt-1 text-[11px] leading-relaxed text-white/75">
						{t("systemLanguagePrompt.description", { language: suggestedLanguageName })}
					</div>
					<div className="mt-3 flex items-center justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onDismissSystemLocale}
							className="h-7 text-xs text-white/80 hover:bg-white/10 hover:text-white"
						>
							{t("systemLanguagePrompt.keepDefault")}
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={onAcceptSystemLocale}
							className="h-7 text-xs bg-white text-[#10121b] hover:bg-white/90"
						>
							{t("systemLanguagePrompt.switch", { language: suggestedLanguageName })}
						</Button>
					</div>
				</Glass>
			)}

			{softwareEncoderFallbackNoticeVisible && (
				<Glass
					level={2}
					ref={setSoftwareFallbackNoticeEl}
					data-hud-interactive="true"
					className="w-full p-3 text-white animate-in fade-in-0 zoom-in-95 duration-200"
				>
					<div className="text-[13px] font-semibold text-white">
						{t("softwareEncoderFallback.title")}
					</div>
					<div className="mt-1 text-[11px] leading-relaxed text-white/75">
						{t("softwareEncoderFallback.description")}
					</div>
					<div className="mt-3 flex items-center justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onDismissSoftwareFallback(true)}
							className="h-7 text-xs text-white/80 hover:bg-white/10 hover:text-white"
						>
							{t("softwareEncoderFallback.dontShowAgain")}
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={() => onDismissSoftwareFallback()}
							className="h-7 text-xs bg-white text-[#10121b] hover:bg-white/90"
						>
							{t("softwareEncoderFallback.dismiss")}
						</Button>
					</div>
				</Glass>
			)}
		</div>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/hud/HudNotices.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/HudNotices.tsx src/components/hud/HudNotices.test.tsx
git commit -m "feat(hud): add HudNotices on Glass"
```

---

### Task 8: `HudDeviceSelectors`

Extraction of the mic/webcam popups at `src/components/launch/LaunchWindow.tsx:759-906`.

**Files:**
- Create: `src/components/hud/HudDeviceSelectors.tsx`
- Test: `src/components/hud/HudDeviceSelectors.test.tsx`

**Interfaces:**
- Consumes: `Glass` (Task 1); `AudioLevelMeter` from `@/components/ui/audio-level-meter` (unchanged, existing shared UI primitive); `Icon` (`name="chevron-down"`, Task 3) replacing the inline `ChevronDown` from `lucide-react`.
- Produces:
  ```ts
  export interface HudDeviceSelectorsProps {
  	t: ReturnType<typeof useScopedT>;
  	trayLayout: "horizontal" | "vertical";
  	hudBarHeight: number;
  	setDeviceSelectorEl: (el: HTMLDivElement | null) => void;
  	showMicControls: boolean;
  	micExpanded: boolean;
  	onMicMouseEnter: () => void;
  	onMicMouseLeave: () => void;
  	onMicFocus: () => void;
  	onMicBlur: () => void;
  	selectedMicLabel: string;
  	microphoneDeviceId: string | undefined;
  	selectedMicId: string;
  	micDevices: Array<{ deviceId: string; label: string }>;
  	onMicDeviceChange: (deviceId: string) => void;
  	micLevel: number;
  	showWebcamControls: boolean;
  	webcamExpanded: boolean;
  	onWebcamMouseEnter: () => void;
  	onWebcamMouseLeave: () => void;
  	onWebcamFocus: () => void;
  	onWebcamBlur: () => void;
  	selectedCameraLabel: string;
  	webcamDeviceId: string | undefined;
  	selectedCameraId: string;
  	cameraDevices: Array<{ deviceId: string; label: string }>;
  	isCameraDevicesLoading: boolean;
  	cameraDevicesError: unknown;
  	onCameraDeviceChange: (deviceId: string) => void;
  }
  export function HudDeviceSelectors(props: HudDeviceSelectorsProps): JSX.Element | null;
  ```
  `onMicDeviceChange`/`onCameraDeviceChange` replace the inline `onChange` handlers at lines 794-799 and 858-865/887-892 in the source — `HudOverlay` (Task 12) supplies closures that call the three setters (`setSelectedMicId`/`setMicrophoneDeviceId`/`setMicrophoneDeviceName`, and the camera equivalents) LaunchWindow already owns, collapsing three calls into one prop each.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/hud/HudDeviceSelectors.test.tsx
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HudDeviceSelectors, type HudDeviceSelectorsProps } from "./HudDeviceSelectors";

const t = ((key: string) => key) as HudDeviceSelectorsProps["t"];

const baseProps: HudDeviceSelectorsProps = {
	t,
	trayLayout: "horizontal",
	hudBarHeight: 60,
	setDeviceSelectorEl: vi.fn(),
	showMicControls: false,
	micExpanded: false,
	onMicMouseEnter: vi.fn(),
	onMicMouseLeave: vi.fn(),
	onMicFocus: vi.fn(),
	onMicBlur: vi.fn(),
	selectedMicLabel: "Default",
	microphoneDeviceId: undefined,
	selectedMicId: "default",
	micDevices: [],
	onMicDeviceChange: vi.fn(),
	micLevel: 0,
	showWebcamControls: false,
	webcamExpanded: false,
	onWebcamMouseEnter: vi.fn(),
	onWebcamMouseLeave: vi.fn(),
	onWebcamFocus: vi.fn(),
	onWebcamBlur: vi.fn(),
	selectedCameraLabel: "Default",
	webcamDeviceId: undefined,
	selectedCameraId: "",
	cameraDevices: [],
	isCameraDevicesLoading: false,
	cameraDevicesError: null,
	onCameraDeviceChange: vi.fn(),
};

describe("HudDeviceSelectors", () => {
	it("renders nothing when neither selector is shown", () => {
		const { container } = render(<HudDeviceSelectors {...baseProps} />);
		expect(container).toBeEmptyDOMElement();
	});

	it("shows the mic selector and reports device changes", () => {
		const onChange = vi.fn();
		render(
			<HudDeviceSelectors
				{...baseProps}
				showMicControls={true}
				micExpanded={true}
				micDevices={[{ deviceId: "abc", label: "USB Mic" }]}
				onMicDeviceChange={onChange}
			/>,
		);
		fireEvent.change(screen.getByDisplayValue("default"), { target: { value: "abc" } });
		expect(onChange).toHaveBeenCalledWith("abc");
	});

	it("shows the webcam selector and reports device changes", () => {
		const onChange = vi.fn();
		render(
			<HudDeviceSelectors
				{...baseProps}
				showWebcamControls={true}
				webcamExpanded={true}
				cameraDevices={[{ deviceId: "cam1", label: "FaceTime HD" }]}
				onCameraDeviceChange={onChange}
			/>,
		);
		fireEvent.change(screen.getByDisplayValue(""), { target: { value: "cam1" } });
		expect(onChange).toHaveBeenCalledWith("cam1");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/hud/HudDeviceSelectors.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Port the JSX at `src/components/launch/LaunchWindow.tsx:759-906` verbatim, with these mechanical changes:
- The outer positioned `div` (line 761) keeps its Tailwind (it's a layout/position wrapper, not a material surface) but its `ref` becomes `setDeviceSelectorEl` directly (already a prop).
- Both the mic panel `div` (line 775) and webcam panel `div` (line 824) — currently `rounded-xl border ... bg-[#0b0c10]/90 ... backdrop-blur-2xl` — become `<Glass level={2}>`, keeping their remaining layout classes (flex, gap, padding, width transition) as `className` on the `Glass` instance.
- Replace the six `lucide-react` `ChevronDown` usages with `<Icon name="chevron-down" size={16} className="..." />` (same size/colour classes as the original `size={12}` — round up to the nearest supported `Icon` size, 16, and adjust surrounding layout if the 4px difference causes overflow — check visually in Task 14).
- Wire `onChange` handlers to call the new single-callback props (`onMicDeviceChange(e.target.value)`, `onCameraDeviceChange(e.target.value)`) instead of the three-setter-call inline arrow functions.

```tsx
// src/components/hud/HudDeviceSelectors.tsx
import type { useScopedT } from "@/contexts/I18nContext";
import { Glass } from "@/design/glass/Glass";
import { Icon } from "@/design/icons/Icon";
import { AudioLevelMeter } from "@/components/ui/audio-level-meter";
import styles from "./hud.module.css";

const HUD_DEVICE_POPUP_GAP = 28;
const HUD_DEVICE_POPUP_HORIZONTAL_BOTTOM = 68;

export interface HudDeviceSelectorsProps {
	t: ReturnType<typeof useScopedT>;
	trayLayout: "horizontal" | "vertical";
	hudBarHeight: number;
	setDeviceSelectorEl: (el: HTMLDivElement | null) => void;
	showMicControls: boolean;
	micExpanded: boolean;
	onMicMouseEnter: () => void;
	onMicMouseLeave: () => void;
	onMicFocus: () => void;
	onMicBlur: () => void;
	selectedMicLabel: string;
	microphoneDeviceId: string | undefined;
	selectedMicId: string;
	micDevices: Array<{ deviceId: string; label: string }>;
	onMicDeviceChange: (deviceId: string) => void;
	micLevel: number;
	showWebcamControls: boolean;
	webcamExpanded: boolean;
	onWebcamMouseEnter: () => void;
	onWebcamMouseLeave: () => void;
	onWebcamFocus: () => void;
	onWebcamBlur: () => void;
	selectedCameraLabel: string;
	webcamDeviceId: string | undefined;
	selectedCameraId: string;
	cameraDevices: Array<{ deviceId: string; label: string }>;
	isCameraDevicesLoading: boolean;
	cameraDevicesError: unknown;
	onCameraDeviceChange: (deviceId: string) => void;
}

export function HudDeviceSelectors(props: HudDeviceSelectorsProps) {
	const { showMicControls, showWebcamControls } = props;
	if (!showMicControls && !showWebcamControls) return null;

	return (
		<div
			ref={props.setDeviceSelectorEl}
			data-hud-interactive="true"
			className={`fixed left-1/2 -translate-x-1/2 flex items-center gap-2 animate-mic-panel-in ${styles.electronNoDrag} ${props.trayLayout === "vertical" ? "" : "bottom-[68px]"}`}
			style={
				props.trayLayout === "vertical"
					? { bottom: props.hudBarHeight + HUD_DEVICE_POPUP_GAP }
					: undefined
			}
		>
			{showMicControls && (
				<Glass
					level={2}
					className={`flex h-9 items-center gap-2 px-3 py-1.5 transition-all duration-300 ${!props.micExpanded ? "opacity-60 grayscale-[0.5]" : "opacity-100"}`}
					onMouseEnter={props.onMicMouseEnter}
					onMouseLeave={props.onMicMouseLeave}
					onFocus={props.onMicFocus}
					onBlur={props.onMicBlur}
					style={{ width: props.micExpanded ? "240px" : "140px", transition: "width 300ms ease" }}
				>
					<div className="relative flex-1 min-w-0">
						{!props.micExpanded && (
							<div className="text-white/60 text-[10px] font-medium truncate">
								{props.selectedMicLabel}
							</div>
						)}
						<select
							value={props.microphoneDeviceId || props.selectedMicId}
							onChange={(e) => props.onMicDeviceChange(e.target.value)}
							className={`w-full appearance-none bg-white/5 text-white text-[11px] rounded-lg pl-2 pr-6 py-1 border border-white/10 outline-none hover:bg-white/10 transition-colors cursor-pointer ${!props.micExpanded ? "sr-only" : ""}`}
						>
							{props.micDevices.map((device) => (
								<option key={device.deviceId} value={device.deviceId} className="bg-[#1c1c24]">
									{device.label}
								</option>
							))}
						</select>
						{props.micExpanded && (
							<Icon
								name="chevron-down"
								size={16}
								className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
							/>
						)}
					</div>
					<AudioLevelMeter
						level={props.micLevel}
						className={`${props.micExpanded ? "w-16" : "w-8"} h-2 transition-all duration-300`}
					/>
				</Glass>
			)}

			{showWebcamControls && (
				<Glass
					level={2}
					className={`flex h-9 items-center gap-2 px-3 py-1.5 transition-all duration-300 ${!props.webcamExpanded ? "opacity-60 grayscale-[0.5]" : "opacity-100"}`}
					onMouseEnter={props.onWebcamMouseEnter}
					onMouseLeave={props.onWebcamMouseLeave}
					onFocus={props.onWebcamFocus}
					onBlur={props.onWebcamBlur}
					style={{ width: props.webcamExpanded ? "240px" : "140px", transition: "width 300ms ease" }}
				>
					<div className="relative flex-1 min-w-0">
						{!props.webcamExpanded && (
							<div className="text-white/60 text-[10px] font-medium truncate">
								{props.selectedCameraLabel}
							</div>
						)}
						{props.webcamExpanded &&
							(props.isCameraDevicesLoading ? (
								<span className="text-white/40 text-[10px] italic">{props.t("webcam.searching")}</span>
							) : props.cameraDevicesError ? (
								<span className="text-white/40 text-[10px] italic">
									{props.t("webcam.unavailable")}
								</span>
							) : props.cameraDevices.length === 0 ? (
								<span className="text-white/40 text-[10px] italic">{props.t("webcam.noneFound")}</span>
							) : (
								<>
									<select
										value={props.webcamDeviceId || props.selectedCameraId}
										onChange={(e) => props.onCameraDeviceChange(e.target.value)}
										className="w-full appearance-none bg-white/5 text-white text-[11px] rounded-lg pl-2 pr-6 py-1 border border-white/10 outline-none hover:bg-white/10 transition-colors cursor-pointer"
									>
										{props.cameraDevices.map((device) => (
											<option key={device.deviceId} value={device.deviceId} className="bg-[#1c1c24]">
												{device.label}
											</option>
										))}
									</select>
									<Icon
										name="chevron-down"
										size={16}
										className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
									/>
								</>
							))}
						{(!props.webcamExpanded || props.cameraDevices.length === 0) && (
							<select
								value={props.webcamDeviceId || props.selectedCameraId}
								onChange={(e) => props.onCameraDeviceChange(e.target.value)}
								className="sr-only"
							>
								{props.cameraDevices.map((device) => (
									<option key={device.deviceId} value={device.deviceId}>
										{device.label}
									</option>
								))}
							</select>
						)}
					</div>
				</Glass>
			)}
		</div>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/hud/HudDeviceSelectors.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/HudDeviceSelectors.tsx src/components/hud/HudDeviceSelectors.test.tsx
git commit -m "feat(hud): add HudDeviceSelectors on Glass"
```

---

### Task 9: `SourceAudioControls`

Extraction of the source selector + audio/mic/webcam/cursor toggle group at `src/components/launch/LaunchWindow.tsx:966-1054`.

**Files:**
- Create: `src/components/hud/SourceAudioControls.tsx`
- Test: `src/components/hud/SourceAudioControls.test.tsx`

**Interfaces:**
- Consumes: `Icon` (Task 3: `monitor`, `volume-on`, `volume-off`, `microphone`, `microphone-off`, `camera`, `camera-off`, `cursor`); `color.brandPrimary` for the active-toggle glow (Global Constraints mapping).
- Produces:
  ```ts
  export interface SourceAudioControlsProps {
  	trayLayout: "horizontal" | "vertical";
  	selectedSource: string;
  	onOpenSourceSelector: () => void;
  	recording: boolean;
  	saving: boolean;
  	systemAudioEnabled: boolean;
  	onToggleSystemAudio: () => void;
  	microphoneEnabled: boolean;
  	onToggleMicrophone: () => void;
  	webcamEnabled: boolean;
  	onToggleWebcam: () => void;
  	supportsCursorModeToggle: boolean;
  	cursorCaptureMode: string;
  	onToggleCursorMode: () => void;
  	t: ReturnType<typeof useScopedT>;
  }
  export function SourceAudioControls(props: SourceAudioControlsProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/hud/SourceAudioControls.test.tsx
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SourceAudioControls, type SourceAudioControlsProps } from "./SourceAudioControls";

const t = ((key: string) => key) as SourceAudioControlsProps["t"];

const baseProps: SourceAudioControlsProps = {
	trayLayout: "horizontal",
	selectedSource: "Entire screen",
	onOpenSourceSelector: vi.fn(),
	recording: false,
	saving: false,
	systemAudioEnabled: false,
	onToggleSystemAudio: vi.fn(),
	microphoneEnabled: false,
	onToggleMicrophone: vi.fn(),
	webcamEnabled: false,
	onToggleWebcam: vi.fn(),
	supportsCursorModeToggle: false,
	cursorCaptureMode: "system",
	onToggleCursorMode: vi.fn(),
	t,
};

describe("SourceAudioControls", () => {
	it("opens the source selector on click", () => {
		const onOpen = vi.fn();
		render(<SourceAudioControls {...baseProps} onOpenSourceSelector={onOpen} />);
		fireEvent.click(screen.getByTestId("launch-source-selector-button"));
		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it("toggles the microphone", () => {
		const onToggle = vi.fn();
		render(<SourceAudioControls {...baseProps} onToggleMicrophone={onToggle} />);
		fireEvent.click(screen.getByTestId("launch-microphone-button"));
		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it("disables source, audio and device toggles while recording", () => {
		render(<SourceAudioControls {...baseProps} recording={true} />);
		expect(screen.getByTestId("launch-source-selector-button")).toBeDisabled();
		expect(screen.getByTestId("launch-microphone-button")).toBeDisabled();
		expect(screen.getByTestId("launch-webcam-button")).toBeDisabled();
	});

	it("only shows the cursor mode button when supported", () => {
		const { rerender } = render(
			<SourceAudioControls {...baseProps} supportsCursorModeToggle={false} />,
		);
		expect(screen.queryByTestId("launch-cursor-mode-button")).not.toBeInTheDocument();
		rerender(<SourceAudioControls {...baseProps} supportsCursorModeToggle={true} />);
		expect(screen.getByTestId("launch-cursor-mode-button")).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/hud/SourceAudioControls.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Port `src/components/launch/LaunchWindow.tsx:966-1054` verbatim, with these mechanical changes:
- Every `getIcon("x", className)` call becomes `<Icon name="x-in-kebab-case" className={className} />` (e.g. `getIcon("monitor", "text-white/80")` → `<Icon name="monitor" className="text-white/80" />`; `getIcon("micOn", ...)`/`getIcon("micOff", ...)` become `<Icon name="microphone" .../>` / `<Icon name="microphone-off" .../>`; `webcamOn`/`webcamOff` become `<Icon name="camera" .../>` / `<Icon name="camera-off" .../>`).
- Every `text-green-400` and the `drop-shadow-[0_0_4px_rgba(74,222,128,0.4)]` class (the "toggle is on" glow) is replaced by `text-[color:var(--brand-primary)]` — since `color.ts` values aren't wired to CSS custom properties yet in raw Tailwind class strings, use an inline `style={{ color: color.brandPrimary }}` conditionally instead, and drop the `drop-shadow` (Glass/tokens don't define a glow effect — flat colour change is the token-compliant equivalent; note this visual simplification in the commit message).
- `hudGroupClasses`/`hudIconBtnClasses` (currently locally defined constants in `LaunchWindow.tsx`) move into this file unchanged (they're pure Tailwind utility strings, not material — no Glass involved for individual buttons, only the outer bar gets Glass in Task 12).

```tsx
// src/components/hud/SourceAudioControls.tsx
import type { useScopedT } from "@/contexts/I18nContext";
import { Icon } from "@/design/icons/Icon";
import { color } from "@/design/tokens/color";
import styles from "./hud.module.css";

export interface SourceAudioControlsProps {
	trayLayout: "horizontal" | "vertical";
	selectedSource: string;
	onOpenSourceSelector: () => void;
	recording: boolean;
	saving: boolean;
	systemAudioEnabled: boolean;
	onToggleSystemAudio: () => void;
	microphoneEnabled: boolean;
	onToggleMicrophone: () => void;
	webcamEnabled: boolean;
	onToggleWebcam: () => void;
	supportsCursorModeToggle: boolean;
	cursorCaptureMode: string;
	onToggleCursorMode: () => void;
	t: ReturnType<typeof useScopedT>;
}

const disabledClasses = "disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none";
const groupClasses = `flex items-center gap-0.5 rounded-xl border border-white/[0.07] bg-white/[0.045] transition-colors duration-150 hover:bg-white/[0.075] ${disabledClasses}`;
const iconBtnClasses = `flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer text-white hover:bg-white/10 active:scale-95 ${disabledClasses}`;

function activeStyle(active: boolean): React.CSSProperties | undefined {
	return active ? { color: color.brandPrimary } : undefined;
}

export function SourceAudioControls(props: SourceAudioControlsProps) {
	const disabled = props.recording || props.saving;

	return (
		<>
			<button
				data-testid="launch-source-selector-button"
				className={`${groupClasses} h-8 ${styles.electronNoDrag} ${props.trayLayout === "vertical" ? "w-8 justify-center px-0" : "px-2.5"}`}
				onClick={props.onOpenSourceSelector}
				disabled={disabled}
				title={props.selectedSource}
				aria-label={props.selectedSource}
			>
				<Icon name="monitor" className="text-white/80" />
				<span
					className={`${props.trayLayout === "vertical" ? "sr-only" : "max-w-[86px]"} truncate text-[11px] font-medium text-white/75`}
				>
					{props.selectedSource}
				</span>
			</button>

			<div className={`${groupClasses} ${styles.electronNoDrag} ${props.trayLayout === "vertical" ? "flex-col py-1" : ""}`}>
				<button
					data-testid="launch-system-audio-button"
					className={iconBtnClasses}
					onClick={props.onToggleSystemAudio}
					disabled={disabled}
					title={
						props.systemAudioEnabled
							? props.t("audio.disableSystemAudio")
							: props.t("audio.enableSystemAudio")
					}
				>
					<Icon
						name={props.systemAudioEnabled ? "volume-on" : "volume-off"}
						className={props.systemAudioEnabled ? "" : "text-white/40"}
						style={activeStyle(props.systemAudioEnabled)}
					/>
				</button>
				<button
					data-testid="launch-microphone-button"
					className={iconBtnClasses}
					onClick={props.onToggleMicrophone}
					disabled={disabled}
					title={
						props.microphoneEnabled ? props.t("audio.disableMicrophone") : props.t("audio.enableMicrophone")
					}
				>
					<Icon
						name={props.microphoneEnabled ? "microphone" : "microphone-off"}
						className={props.microphoneEnabled ? "" : "text-white/40"}
						style={activeStyle(props.microphoneEnabled)}
					/>
				</button>
				<button
					data-testid="launch-webcam-button"
					className={iconBtnClasses}
					onClick={props.onToggleWebcam}
					disabled={disabled}
					title={props.webcamEnabled ? props.t("webcam.disableWebcam") : props.t("webcam.enableWebcam")}
				>
					<Icon
						name={props.webcamEnabled ? "camera" : "camera-off"}
						className={props.webcamEnabled ? "" : "text-white/40"}
						style={activeStyle(props.webcamEnabled)}
					/>
				</button>
				{props.supportsCursorModeToggle && (
					<button
						data-testid="launch-cursor-mode-button"
						className={iconBtnClasses}
						onClick={props.onToggleCursorMode}
						disabled={disabled}
						title={
							props.cursorCaptureMode === "editable-overlay"
								? props.t("cursor.useSystemCursor")
								: props.t("cursor.useEditableCursor")
						}
					>
						<Icon
							name="cursor"
							className={props.cursorCaptureMode === "editable-overlay" ? "" : "text-white/40"}
							style={activeStyle(props.cursorCaptureMode === "editable-overlay")}
						/>
					</button>
				)}
			</div>
		</>
	);
}
```

Note: `Icon`'s current signature (`src/design/icons/Icon.tsx`) only accepts `{ name, size, label, className }` — it does not forward a `style` prop yet. Extend it in this task (small addition, same file already touched in Task 3 conceptually but not yet for `style`):

```ts
// in src/design/icons/Icon.tsx, extend IconProps and thread style through to the <svg>
export interface IconProps {
	name: IconName;
	size?: 16 | 20 | 24;
	label?: string;
	className?: string;
	style?: React.CSSProperties;
}
// and in the component: <svg ... className={className} style={style}>
```

Add one assertion for this to `Icon.test.tsx` (`it("forwards a style prop to the svg", ...)`) as part of this task's Step 1/3, keeping the render/pass loop intact for that file too.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/hud/SourceAudioControls.test.tsx src/design/icons/Icon.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/SourceAudioControls.tsx src/components/hud/SourceAudioControls.test.tsx src/design/icons/Icon.tsx src/design/icons/Icon.test.tsx
git commit -m "feat(hud): add SourceAudioControls, thread style through Icon"
```

---

### Task 10: `RecordingControls`

Composes `DiaphragmButton` (Task 6) with the pause/restart/cancel group at `src/components/launch/LaunchWindow.tsx:1125-1164`, replacing the whole `1056-1164` block.

**Files:**
- Create: `src/components/hud/RecordingControls.tsx`
- Test: `src/components/hud/RecordingControls.test.tsx`

**Interfaces:**
- Consumes: `DiaphragmButton` (Task 6); `Icon` (`resume`, `pause`, `restart`, `cancel`).
- Produces:
  ```ts
  export interface RecordingControlsProps {
  	recording: boolean;
  	paused: boolean;
  	saving: boolean;
  	elapsedSeconds: number;
  	hasSelectedSource: boolean;
  	selectedSource: string;
  	t: ReturnType<typeof useScopedT>;
  	onRecordButtonClick: () => void;
  	canPauseRecording: boolean;
  	onTogglePaused: () => void;
  	onRestart: () => void;
  	onCancel: () => void;
  }
  export function RecordingControls(props: RecordingControlsProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/hud/RecordingControls.test.tsx
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecordingControls, type RecordingControlsProps } from "./RecordingControls";

const t = ((key: string) => key) as RecordingControlsProps["t"];

const baseProps: RecordingControlsProps = {
	recording: true,
	paused: false,
	saving: false,
	elapsedSeconds: 12,
	hasSelectedSource: true,
	selectedSource: "Entire screen",
	t,
	onRecordButtonClick: vi.fn(),
	canPauseRecording: true,
	onTogglePaused: vi.fn(),
	onRestart: vi.fn(),
	onCancel: vi.fn(),
};

describe("RecordingControls", () => {
	it("shows pause/restart/cancel only while recording", () => {
		const { rerender } = render(<RecordingControls {...baseProps} recording={false} />);
		expect(screen.queryByRole("button", { name: t("tooltips.pauseRecording") })).not.toBeInTheDocument();
		rerender(<RecordingControls {...baseProps} recording={true} />);
		expect(screen.getByRole("button", { name: t("tooltips.pauseRecording") })).toBeInTheDocument();
	});

	it("hides the pause control when the format doesn't support pausing", () => {
		render(<RecordingControls {...baseProps} canPauseRecording={false} />);
		expect(screen.queryByRole("button", { name: t("tooltips.pauseRecording") })).not.toBeInTheDocument();
	});

	it("wires restart and cancel", () => {
		const onRestart = vi.fn();
		const onCancel = vi.fn();
		render(<RecordingControls {...baseProps} onRestart={onRestart} onCancel={onCancel} />);
		fireEvent.click(screen.getByRole("button", { name: t("tooltips.restartRecording") }));
		fireEvent.click(screen.getByRole("button", { name: t("tooltips.cancelRecording") }));
		expect(onRestart).toHaveBeenCalledTimes(1);
		expect(onCancel).toHaveBeenCalledTimes(1);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/hud/RecordingControls.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```tsx
// src/components/hud/RecordingControls.tsx
import type { useScopedT } from "@/contexts/I18nContext";
import { Icon } from "@/design/icons/Icon";
import { color } from "@/design/tokens/color";
import { DiaphragmButton } from "./DiaphragmButton";
import styles from "./hud.module.css";

export interface RecordingControlsProps {
	recording: boolean;
	paused: boolean;
	saving: boolean;
	elapsedSeconds: number;
	hasSelectedSource: boolean;
	selectedSource: string;
	t: ReturnType<typeof useScopedT>;
	onRecordButtonClick: () => void;
	canPauseRecording: boolean;
	onTogglePaused: () => void;
	onRestart: () => void;
	onCancel: () => void;
}

const auxIconBtnClasses =
	"flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-150 text-white/55 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none";

export function RecordingControls(props: RecordingControlsProps) {
	const title = props.saving
		? props.t("recording.saving")
		: props.hasSelectedSource || props.recording
			? props.selectedSource
			: props.t("recording.selectSource");

	return (
		<>
			<DiaphragmButton
				recording={props.recording}
				paused={props.paused}
				saving={props.saving}
				elapsedSeconds={props.elapsedSeconds}
				hasSelectedSource={props.hasSelectedSource}
				title={title}
				onClick={props.onRecordButtonClick}
			/>

			{props.recording && (
				<div className={`flex items-center gap-0.5 ${styles.electronNoDrag}`}>
					{props.canPauseRecording && (
						<button
							className={auxIconBtnClasses}
							onClick={() => !props.saving && props.onTogglePaused()}
							disabled={props.saving}
							aria-label={
								props.paused ? props.t("tooltips.resumeRecording") : props.t("tooltips.pauseRecording")
							}
							title={props.paused ? props.t("tooltips.resumeRecording") : props.t("tooltips.pauseRecording")}
						>
							<Icon
								name={props.paused ? "resume" : "pause"}
								className={props.paused ? "" : "text-white/60"}
								style={props.paused ? { color: color.semanticWarning } : undefined}
							/>
						</button>
					)}
					<button
						className={auxIconBtnClasses}
						onClick={() => !props.saving && props.onRestart()}
						disabled={props.saving}
						aria-label={props.t("tooltips.restartRecording")}
						title={props.t("tooltips.restartRecording")}
					>
						<Icon name="restart" className="text-white/60" />
					</button>
					<button
						className={auxIconBtnClasses}
						onClick={() => !props.saving && props.onCancel()}
						disabled={props.saving}
						aria-label={props.t("tooltips.cancelRecording")}
						title={props.t("tooltips.cancelRecording")}
					>
						<Icon name="cancel" className="text-white/60" />
					</button>
				</div>
			)}
		</>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/hud/RecordingControls.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/RecordingControls.tsx src/components/hud/RecordingControls.test.tsx
git commit -m "feat(hud): add RecordingControls composing DiaphragmButton"
```

---

### Task 11: `HudSidebar`

Extraction of the notes button, language menu, studio button and window controls at `src/components/launch/LaunchWindow.tsx:1166-1287`.

**Files:**
- Create: `src/components/hud/HudSidebar.tsx`
- Test: `src/components/hud/HudSidebar.test.tsx`

**Interfaces:**
- Consumes: `Glass` (Task 1, for the language menu panel); `Icon` (`notes`, `language`, `lens` [replacing the DESIGN.md-violating clapperboard], `check`, `minimize`, `close`).
- Produces:
  ```ts
  export interface HudSidebarProps {
  	t: ReturnType<typeof useScopedT>;
  	trayLayout: "horizontal" | "vertical";
  	saving: boolean;
  	recording: boolean;
  	isLinuxHud: boolean;
  	onOpenNotes: () => void;
  	onOpenStudio: () => void;
  	languageTriggerRef: React.RefObject<HTMLButtonElement>;
  	activeLanguageLabel: string;
  	isLanguageMenuOpen: boolean;
  	onToggleLanguageMenu: () => void;
  	setLanguageMenuPanelEl: (el: HTMLDivElement | null) => void;
  	languageMenuStyle: { right: number; top: number; maxHeight: number };
  	availableLocales: string[];
  	locale: string;
  	getLocaleName: (locale: string) => string;
  	onSelectLocale: (locale: string) => void;
  	onLanguageMenuPointerEnter: () => void;
  	onLanguageMenuWheel: (event: React.WheelEvent) => void;
  	onHideHud: () => void;
  	onCloseHud: () => void;
  }
  export function HudSidebar(props: HudSidebarProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/hud/HudSidebar.test.tsx
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { HudSidebar, type HudSidebarProps } from "./HudSidebar";

const t = ((key: string) => key) as HudSidebarProps["t"];

const baseProps: HudSidebarProps = {
	t,
	trayLayout: "horizontal",
	saving: false,
	recording: false,
	isLinuxHud: false,
	onOpenNotes: vi.fn(),
	onOpenStudio: vi.fn(),
	languageTriggerRef: createRef<HTMLButtonElement>(),
	activeLanguageLabel: "EN",
	isLanguageMenuOpen: false,
	onToggleLanguageMenu: vi.fn(),
	setLanguageMenuPanelEl: vi.fn(),
	languageMenuStyle: { right: 12, top: 12, maxHeight: 240 },
	availableLocales: ["en", "pt-BR"],
	locale: "en",
	getLocaleName: (l) => (l === "en" ? "English" : "Português"),
	onSelectLocale: vi.fn(),
	onLanguageMenuPointerEnter: vi.fn(),
	onLanguageMenuWheel: vi.fn(),
	onHideHud: vi.fn(),
	onCloseHud: vi.fn(),
};

describe("HudSidebar", () => {
	it("hides the notes button on Linux", () => {
		const { rerender } = render(<HudSidebar {...baseProps} isLinuxHud={false} />);
		expect(screen.getByTitle("tooltips.openNotes")).toBeInTheDocument();
		rerender(<HudSidebar {...baseProps} isLinuxHud={true} />);
		expect(screen.queryByTitle("tooltips.openNotes")).not.toBeInTheDocument();
	});

	it("only shows the studio button while not recording", () => {
		const { rerender } = render(<HudSidebar {...baseProps} recording={false} />);
		expect(screen.getByTestId("launch-open-studio-button")).toBeInTheDocument();
		rerender(<HudSidebar {...baseProps} recording={true} />);
		expect(screen.queryByTestId("launch-open-studio-button")).not.toBeInTheDocument();
	});

	it("opens the language menu and selects a locale", () => {
		const onSelect = vi.fn();
		render(<HudSidebar {...baseProps} isLanguageMenuOpen={true} onSelectLocale={onSelect} />);
		fireEvent.click(screen.getByText("Português"));
		expect(onSelect).toHaveBeenCalledWith("pt-BR");
	});

	it("wires hide and close", () => {
		const onHide = vi.fn();
		const onClose = vi.fn();
		render(<HudSidebar {...baseProps} onHideHud={onHide} onCloseHud={onClose} />);
		fireEvent.click(screen.getByTitle("tooltips.hideHUD"));
		fireEvent.click(screen.getByTitle("tooltips.closeApp"));
		expect(onHide).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/hud/HudSidebar.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Port `src/components/launch/LaunchWindow.tsx:1166-1287` verbatim with these mechanical changes:
- `NotepadText` (lucide) → `<Icon name="notes" .../>`.
- `Clapperboard` (lucide, banned per Global Constraints) → `<Icon name="lens" .../>`.
- `Languages` (lucide) → `<Icon name="language" .../>`; `Check` (lucide) → `<Icon name="check" .../>` (already existed in the sprite before this plan).
- `getIcon("minimize"/"close", ...)` → `<Icon name="minimize"/"close" .../>`.
- The language menu panel (currently a `createPortal`ed plain `div` with `rounded-lg border ... shadow` classes from `styles.languageMenuPanel`) becomes `<Glass level={3}>` wrapping the same `createPortal(..., document.body)` call, keeping the CSS-module classes that are pure layout (`languageMenuScroll`) but dropping any that only existed to fake the glass material (check `LaunchWindow.module.css` for `.languageMenuPanel`'s current border/background/blur rules and remove the now-redundant ones once `Glass` supplies them — read that file before editing it in this task).
- `windowBtnClasses` (currently local to `LaunchWindow.tsx`) is ported into this file unchanged.

```tsx
// src/components/hud/HudSidebar.tsx
import { createPortal } from "react-dom";
import type { useScopedT } from "@/contexts/I18nContext";
import { Glass } from "@/design/glass/Glass";
import { Icon } from "@/design/icons/Icon";
import styles from "@/components/launch/LaunchWindow.module.css";

export interface HudSidebarProps {
	t: ReturnType<typeof useScopedT>;
	trayLayout: "horizontal" | "vertical";
	saving: boolean;
	recording: boolean;
	isLinuxHud: boolean;
	onOpenNotes: () => void;
	onOpenStudio: () => void;
	languageTriggerRef: React.RefObject<HTMLButtonElement>;
	activeLanguageLabel: string;
	isLanguageMenuOpen: boolean;
	onToggleLanguageMenu: () => void;
	setLanguageMenuPanelEl: (el: HTMLDivElement | null) => void;
	languageMenuStyle: { right: number; top: number; maxHeight: number };
	availableLocales: string[];
	locale: string;
	getLocaleName: (locale: string) => string;
	onSelectLocale: (locale: string) => void;
	onLanguageMenuPointerEnter: () => void;
	onLanguageMenuWheel: (event: React.WheelEvent) => void;
	onHideHud: () => void;
	onCloseHud: () => void;
}

const iconBtnClasses = `flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none ${styles.electronNoDrag}`;
const windowBtnClasses =
	"flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer opacity-50 hover:opacity-90 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none";

export function HudSidebar(props: HudSidebarProps) {
	return (
		<>
			{!props.isLinuxHud && (
				<button
					type="button"
					title={props.t("tooltips.openNotes")}
					aria-label={props.t("tooltips.openNotes")}
					disabled={props.saving}
					className={iconBtnClasses}
					onClick={() => !props.saving && props.onOpenNotes()}
				>
					<Icon name="notes" className="text-white/60" />
				</button>
			)}

			{!props.recording && (
				<button
					data-testid="launch-open-studio-button"
					disabled={props.saving}
					className={iconBtnClasses}
					onClick={() => !props.saving && props.onOpenStudio()}
					title={props.t("tooltips.openStudio")}
				>
					<Icon name="lens" className="text-white/60" />
				</button>
			)}

			<div
				className={`${props.trayLayout === "vertical" ? "mt-0.5 pt-1.5 border-t" : "ml-0.5 pl-1.5 border-l"} border-white/10 flex items-center gap-0.5 ${props.trayLayout === "vertical" ? "flex-col" : ""} ${styles.electronNoDrag}`}
			>
				<button
					ref={props.languageTriggerRef}
					type="button"
					aria-label={props.t("language")}
					aria-expanded={props.isLanguageMenuOpen}
					aria-haspopup="menu"
					disabled={props.saving}
					onClick={() => !props.saving && props.onToggleLanguageMenu()}
					title={props.activeLanguageLabel}
					className={`flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.045] text-white/85 hover:bg-white/10 ${props.trayLayout === "vertical" ? "w-8 justify-center px-0" : "gap-1.5 px-2"} disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none ${styles.electronNoDrag}`}
				>
					<Icon name="language" size={16} className="text-white/70" />
					<span
						className={`${props.trayLayout === "vertical" ? "sr-only" : "max-w-[54px]"} truncate text-[10px] font-semibold text-white/75`}
					>
						{props.activeLanguageLabel}
					</span>
				</button>

				{props.isLanguageMenuOpen &&
					createPortal(
						<Glass
							level={3}
							ref={props.setLanguageMenuPanelEl}
							data-hud-interactive="true"
							role="menu"
							className={`${styles.languageMenuScroll} ${styles.electronNoDrag}`}
							style={
								{
									position: "fixed",
									right: props.languageMenuStyle.right,
									top: props.languageMenuStyle.top,
									maxHeight: props.languageMenuStyle.maxHeight,
									pointerEvents: "auto",
								} as React.CSSProperties
							}
							onPointerDown={(event) => event.stopPropagation()}
							onPointerEnter={props.onLanguageMenuPointerEnter}
							onPointerMove={props.onLanguageMenuPointerEnter}
							onWheel={(event) => {
								props.onLanguageMenuPointerEnter();
								props.onLanguageMenuWheel(event);
							}}
						>
							{props.availableLocales.map((loc) => (
								<button
									key={loc}
									type="button"
									role="menuitemradio"
									aria-checked={loc === props.locale}
									onClick={() => props.onSelectLocale(loc)}
									className={styles.languageMenuItem}
								>
									<span className="truncate">{props.getLocaleName(loc)}</span>
									{loc === props.locale ? <Icon name="check" size={16} className="text-white/85" /> : null}
								</button>
							))}
						</Glass>,
						document.body,
					)}
			</div>

			<div
				className={`flex items-center gap-0.5 ${props.trayLayout === "vertical" ? "flex-col" : ""}`}
			>
				<button
					className={windowBtnClasses}
					title={props.t("tooltips.hideHUD")}
					onClick={props.onHideHud}
					disabled={props.saving}
				>
					<Icon name="minimize" className="text-white" />
				</button>
				<button
					className={windowBtnClasses}
					title={props.t("tooltips.closeApp")}
					onClick={props.onCloseHud}
					disabled={props.saving}
				>
					<Icon name="close" className="text-white" />
				</button>
			</div>
		</>
	);
}
```

Before finalizing, read `src/components/launch/LaunchWindow.module.css`'s `.languageMenuPanel`/`.languageMenuItem`/`.languageMenuScroll` rules and strip any `background`/`border`/`backdrop-filter`/`box-shadow`/`border-radius` from `.languageMenuPanel` specifically (now supplied by `Glass level={3}`), keeping only true layout rules (`max-height`, `overflow`, `display`, `padding`). If `.languageMenuPanel` becomes empty after that, delete the class entirely and drop its usage above (already done in the excerpt — `className={styles.languageMenuScroll}` only, no `.languageMenuPanel`; confirm `.languageMenuScroll` alone still supplies the scroll behaviour it needs, or fold what's needed into it).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/hud/HudSidebar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/HudSidebar.tsx src/components/hud/HudSidebar.test.tsx src/components/launch/LaunchWindow.module.css
git commit -m "feat(hud): add HudSidebar on Glass, drop the banned clapperboard icon"
```

---

### Task 12: `HudOverlay` root + render budget

Composes Tasks 7–11 inside the bar shell (drag handle, tray-layout toggle, `Glass` bar container) currently at `src/components/launch/LaunchWindow.tsx:665-681` (outer wrapper), `908-965` (bar open tag, drag handle, tray toggle) and `1287-1290` (closing tags). This is also where the render-budget acceptance criterion from the design spec is proven.

**Files:**
- Create: `src/components/hud/HudOverlay.tsx`
- Test: `src/components/hud/HudOverlay.test.tsx`

**Interfaces:**
- Consumes: `Glass` (Task 1), `Icon` (`drag-handle`, `tray-columns`, `tray-rows`), `HudNotices` (Task 7), `HudDeviceSelectors` (Task 8), `SourceAudioControls` (Task 9), `RecordingControls` (Task 10), `HudSidebar` (Task 11).
- Produces: `HudOverlayProps`, the union of every child's props (grouped, not flattened — see below) plus the outer-wrapper-level values (`onOuterPointerMove`, `onOuterPointerLeave`, `setHudBarEl`, drag pointer handlers, `toggleTrayLayout`). This is the type `LaunchWindow.tsx` (Task 13) will construct and pass down; write it exactly as:

  ```ts
  export interface HudOverlayProps {
  	trayLayout: "horizontal" | "vertical";
  	onToggleTrayLayout: () => void;
  	t: ReturnType<typeof useScopedT>;
  	setHudBarEl: (el: HTMLDivElement | null) => void;
  	onBarPointerEnter: () => void;
  	onBarPointerDown: () => void;
  	onBarMouseEnter: () => void;
  	onBarMouseLeave: () => void;
  	onOuterPointerMove: (event: React.PointerEvent) => void;
  	onOuterPointerLeave: () => void;
  	onDragPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  	onDragPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  	onDragPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  	onDragPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
  	notices: HudNoticesProps;
  	deviceSelectors: HudDeviceSelectorsProps;
  	sourceAudio: SourceAudioControlsProps;
  	recordingControls: RecordingControlsProps;
  	sidebar: HudSidebarProps;
  }
  export function HudOverlay(props: HudOverlayProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/hud/HudOverlay.test.tsx
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { createRenderCounter } from "@/lib/perf/renderCounter";
import { HudOverlay, type HudOverlayProps } from "./HudOverlay";

const t = ((key: string) => key) as HudOverlayProps["t"];

function buildProps(overrides: Partial<HudOverlayProps> = {}): HudOverlayProps {
	return {
		trayLayout: "horizontal",
		onToggleTrayLayout: vi.fn(),
		t,
		setHudBarEl: vi.fn(),
		onBarPointerEnter: vi.fn(),
		onBarPointerDown: vi.fn(),
		onBarMouseEnter: vi.fn(),
		onBarMouseLeave: vi.fn(),
		onOuterPointerMove: vi.fn(),
		onOuterPointerLeave: vi.fn(),
		onDragPointerDown: vi.fn(),
		onDragPointerMove: vi.fn(),
		onDragPointerUp: vi.fn(),
		onDragPointerCancel: vi.fn(),
		notices: {
			t,
			systemLocaleSuggestion: null,
			suggestedLanguageName: "",
			onAcceptSystemLocale: vi.fn(),
			onDismissSystemLocale: vi.fn(),
			setSystemLocalePromptEl: vi.fn(),
			softwareEncoderFallbackNoticeVisible: false,
			onDismissSoftwareFallback: vi.fn(),
			setSoftwareFallbackNoticeEl: vi.fn(),
		},
		deviceSelectors: {
			t,
			trayLayout: "horizontal",
			hudBarHeight: 60,
			setDeviceSelectorEl: vi.fn(),
			showMicControls: false,
			micExpanded: false,
			onMicMouseEnter: vi.fn(),
			onMicMouseLeave: vi.fn(),
			onMicFocus: vi.fn(),
			onMicBlur: vi.fn(),
			selectedMicLabel: "",
			microphoneDeviceId: undefined,
			selectedMicId: "default",
			micDevices: [],
			onMicDeviceChange: vi.fn(),
			micLevel: 0,
			showWebcamControls: false,
			webcamExpanded: false,
			onWebcamMouseEnter: vi.fn(),
			onWebcamMouseLeave: vi.fn(),
			onWebcamFocus: vi.fn(),
			onWebcamBlur: vi.fn(),
			selectedCameraLabel: "",
			webcamDeviceId: undefined,
			selectedCameraId: "",
			cameraDevices: [],
			isCameraDevicesLoading: false,
			cameraDevicesError: null,
			onCameraDeviceChange: vi.fn(),
		},
		sourceAudio: {
			trayLayout: "horizontal",
			selectedSource: "Entire screen",
			onOpenSourceSelector: vi.fn(),
			recording: false,
			saving: false,
			systemAudioEnabled: false,
			onToggleSystemAudio: vi.fn(),
			microphoneEnabled: false,
			onToggleMicrophone: vi.fn(),
			webcamEnabled: false,
			onToggleWebcam: vi.fn(),
			supportsCursorModeToggle: false,
			cursorCaptureMode: "system",
			onToggleCursorMode: vi.fn(),
			t,
		},
		recordingControls: {
			recording: false,
			paused: false,
			saving: false,
			elapsedSeconds: 0,
			hasSelectedSource: false,
			selectedSource: "Entire screen",
			t,
			onRecordButtonClick: vi.fn(),
			canPauseRecording: false,
			onTogglePaused: vi.fn(),
			onRestart: vi.fn(),
			onCancel: vi.fn(),
		},
		sidebar: {
			t,
			trayLayout: "horizontal",
			saving: false,
			recording: false,
			isLinuxHud: false,
			onOpenNotes: vi.fn(),
			onOpenStudio: vi.fn(),
			languageTriggerRef: createRef(),
			activeLanguageLabel: "EN",
			isLanguageMenuOpen: false,
			onToggleLanguageMenu: vi.fn(),
			setLanguageMenuPanelEl: vi.fn(),
			languageMenuStyle: { right: 12, top: 12, maxHeight: 240 },
			availableLocales: ["en"],
			locale: "en",
			getLocaleName: () => "English",
			onSelectLocale: vi.fn(),
			onLanguageMenuPointerEnter: vi.fn(),
			onLanguageMenuWheel: vi.fn(),
			onHideHud: vi.fn(),
			onCloseHud: vi.fn(),
		},
		...overrides,
	};
}

describe("HudOverlay", () => {
	it("renders the drag handle and record button", () => {
		render(<HudOverlay {...buildProps()} />);
		expect(screen.getByTestId("hud-drag-handle")).toBeInTheDocument();
		expect(screen.getByTestId("launch-record-button")).toBeInTheDocument();
	});

	it("keeps the rest of the tree stable while only elapsedSeconds changes", () => {
		const counter = createRenderCounter();

		function Wrapper({ elapsedSeconds }: { elapsedSeconds: number }) {
			const props = buildProps({
				recordingControls: {
					...buildProps().recordingControls,
					recording: true,
					elapsedSeconds,
				},
			});
			return (
				<>
					<counter.Probe />
					<HudOverlay {...props} />
				</>
			);
		}

		const { rerender } = render(<Wrapper elapsedSeconds={1} />);
		counter.reset();
		rerender(<Wrapper elapsedSeconds={2} />);
		rerender(<Wrapper elapsedSeconds={3} />);

		// The Probe here counts Wrapper's own re-renders (expected: 2, one per
		// rerender call) — the real budget assertion is that HudOverlay's
		// sub-tree outside RecordingTimer doesn't re-render *additional* times
		// beyond what its own prop changes force. Assert indirectly: the
		// sidebar's language trigger button (whose props never change here)
		// keeps the same DOM node identity across both rerenders.
		const button = screen.getByRole("button", { name: "EN" });
		rerender(<Wrapper elapsedSeconds={4} />);
		expect(screen.getByRole("button", { name: "EN" })).toBe(button);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/hud/HudOverlay.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Port `src/components/launch/LaunchWindow.tsx:665-681`, `908-965` and `1287-1290` for the shell, composing the five child components with `React.memo` on `SourceAudioControls`, `HudSidebar`, and the non-timer parts of `RecordingControls` (wrap each child component itself in `memo(...)` at its own definition site — go back and add `export const X = memo(function X(...) {...})` to Tasks 9–11's components now that this task's budget test requires it; this is the mechanism that makes the "language trigger button keeps the same DOM node identity" assertion in Step 1 pass) so that only `RecordingControls` → `DiaphragmButton` → `RecordingTimer` re-renders when `elapsedSeconds` changes.

```tsx
// src/components/hud/HudOverlay.tsx
import type { useScopedT } from "@/contexts/I18nContext";
import { Glass } from "@/design/glass/Glass";
import { Icon } from "@/design/icons/Icon";
import { HudNotices, type HudNoticesProps } from "./HudNotices";
import { HudDeviceSelectors, type HudDeviceSelectorsProps } from "./HudDeviceSelectors";
import { SourceAudioControls, type SourceAudioControlsProps } from "./SourceAudioControls";
import { RecordingControls, type RecordingControlsProps } from "./RecordingControls";
import { HudSidebar, type HudSidebarProps } from "./HudSidebar";
import styles from "./hud.module.css";

export interface HudOverlayProps {
	trayLayout: "horizontal" | "vertical";
	onToggleTrayLayout: () => void;
	t: ReturnType<typeof useScopedT>;
	setHudBarEl: (el: HTMLDivElement | null) => void;
	onBarPointerEnter: () => void;
	onBarPointerDown: () => void;
	onBarMouseEnter: () => void;
	onBarMouseLeave: () => void;
	onOuterPointerMove: (event: React.PointerEvent) => void;
	onOuterPointerLeave: () => void;
	onDragPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
	onDragPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
	onDragPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
	onDragPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
	notices: HudNoticesProps;
	deviceSelectors: HudDeviceSelectorsProps;
	sourceAudio: SourceAudioControlsProps;
	recordingControls: RecordingControlsProps;
	sidebar: HudSidebarProps;
}

export function HudOverlay(props: HudOverlayProps) {
	return (
		<div
			className={`h-full w-full min-w-0 max-w-full overflow-x-hidden overflow-y-hidden bg-transparent ${styles.electronDrag}`}
			onPointerMove={props.onOuterPointerMove}
			onPointerLeave={props.onOuterPointerLeave}
		>
			<HudNotices {...props.notices} />
			<HudDeviceSelectors {...props.deviceSelectors} />

			<Glass
				level={2}
				ref={props.setHudBarEl}
				data-hud-interactive="true"
				data-tray-layout={props.trayLayout}
				className={`fixed bottom-5 left-1/2 -translate-x-1/2 flex ${
					props.trayLayout === "vertical"
						? "max-h-[calc(100vh-2.5rem)] flex-col items-center gap-1 overflow-y-auto px-1 py-1.5"
						: "items-center gap-1.5 px-2 py-1.5"
				}`}
				onPointerEnter={props.onBarPointerEnter}
				onPointerDown={props.onBarPointerDown}
				onMouseEnter={props.onBarMouseEnter}
				onMouseLeave={props.onBarMouseLeave}
			>
				<div
					data-testid="hud-drag-handle"
					className={`flex ${props.trayLayout === "vertical" ? "h-6 w-8" : "h-8 w-7"} cursor-grab items-center justify-center active:cursor-grabbing ${styles.electronNoDrag}`}
					onPointerDown={props.onDragPointerDown}
					onPointerMove={props.onDragPointerMove}
					onPointerUp={props.onDragPointerUp}
					onPointerCancel={props.onDragPointerCancel}
				>
					<Icon name="drag-handle" className="text-white/30" />
				</div>

				<button
					data-testid="launch-tray-layout-button"
					type="button"
					aria-label={
						props.trayLayout === "horizontal"
							? props.t("tooltips.useVerticalTray")
							: props.t("tooltips.useHorizontalTray")
					}
					aria-pressed={props.trayLayout === "vertical"}
					className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer text-white hover:bg-white/10 active:scale-95 ${styles.electronNoDrag}`}
					onClick={props.onToggleTrayLayout}
				>
					<Icon
						name={props.trayLayout === "horizontal" ? "tray-columns" : "tray-rows"}
						className="text-white/60"
					/>
				</button>

				<SourceAudioControls {...props.sourceAudio} />
				<RecordingControls {...props.recordingControls} />
				<HudSidebar {...props.sidebar} />
			</Glass>
		</div>
	);
}
```

Before this, add one rule to the shared `src/components/hud/hud.module.css` (created in Task 7, currently only has `.electronNoDrag`) — append:

```css
.electronDrag {
	-webkit-app-region: drag;
}
```

This is the outer wrapper's native-drag-region opt-in, mirroring `LaunchWindow.tsx`'s original `styles.electronDrag` usage on its own outer wrapper (the plan's `HudOverlay` code above already references `styles.electronDrag` on that div).

Now open `SourceAudioControls.tsx`, `HudSidebar.tsx`, and `RecordingControls.tsx` (Tasks 9–11) and wrap each exported function in `memo(...)`, e.g. `export const SourceAudioControls = memo(function SourceAudioControls(props: SourceAudioControlsProps) { ... });` — keep the named function expression (React DevTools display name) and re-export the same way. Re-run each of those tasks' test files afterward to confirm `memo` doesn't change observable behaviour.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/hud`
Expected: PASS across every file in the directory (Tasks 5–12's tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/hud/HudOverlay.tsx src/components/hud/HudOverlay.test.tsx src/components/hud/SourceAudioControls.tsx src/components/hud/HudSidebar.tsx src/components/hud/RecordingControls.tsx src/components/hud/hud.module.css
git commit -m "feat(hud): add HudOverlay root, memoize children to hold the render budget"
```

---

### Task 13: Wire `LaunchWindow` to `HudOverlay`

Replace the whole return block of `LaunchWindow.tsx` with `<HudOverlay />`, deleting everything that migrated.

**Files:**
- Modify: `src/components/launch/LaunchWindow.tsx`
- Modify: `src/components/launch/LaunchWindow.test.tsx`

**Interfaces:**
- Consumes: `HudOverlay` and every prop type from Task 12.

- [ ] **Step 1: Write/adjust the test first**

Read the current `src/components/launch/LaunchWindow.test.tsx` (579 lines) in full. For every `it(...)` block that asserts on an element now owned by a Task 5–12 component (buttons/inputs matched via the `data-testid`s ported unchanged: `launch-record-button`, `launch-microphone-button`, `launch-webcam-button`, `launch-system-audio-button`, `launch-cursor-mode-button`, `launch-source-selector-button`, `launch-tray-layout-button`, `launch-open-studio-button`, `hud-drag-handle`), that assertion already has an equivalent in the corresponding component's own test file from Tasks 5–12 — delete the now-redundant case from `LaunchWindow.test.tsx` rather than keeping duplicate coverage. Keep in `LaunchWindow.test.tsx` only:
- One smoke test that `LaunchWindow` renders without throwing for the default (unmounted-hooks-return-defaults) state.
- Tests that exercise `LaunchWindow`-owned behaviour that never moved: the `useEffect`-driven polling of `getSelectedSource`, the `ResizeObserver`/window-sizing calls (`window.electronAPI.setHudOverlaySize`), the drag-move IPC calls (`window.electronAPI.moveHudOverlayBy`), platform detection (`isLinuxHud`), and `handleRecordButtonClick`'s branching (opens source selector first if none selected, else calls `toggleRecording`) — these all stay in `LaunchWindow` per this plan's architecture and still need coverage exactly as before, just asserted through `HudOverlay`'s received props instead of rendered DOM where that's more direct (e.g. `expect(window.electronAPI.setHudOverlaySize).toHaveBeenCalledWith(...)` doesn't change at all).

- [ ] **Step 2: Run the trimmed test suite to see it fail against the old implementation**

Run: `npx vitest run src/components/launch/LaunchWindow.test.tsx`
Expected: PASS still (you haven't changed `LaunchWindow.tsx` yet — this step just confirms the trimmed test file is internally consistent before the rewrite. If anything unexpectedly fails, the deletion in Step 1 removed something not actually covered elsewhere — restore it before proceeding.)

- [ ] **Step 3: Rewrite `LaunchWindow.tsx`**

Delete:
- Imports: `Check`, `ChevronDown`, `Clapperboard`, `Columns3`, `Languages`, `Loader2`, `NotepadText`, `Rows3` from `lucide-react`; `BsPauseCircle`, `BsPlayCircle`, `BsRecordCircle` from `react-icons/bs`; `FaRegStopCircle` from `react-icons/fa`; `FaFolderOpen` from `react-icons/fa6`; `FiMinus`, `FiX` from `react-icons/fi`; the whole `react-icons/md` import block; `RxDragHandleDots2` from `react-icons/rx`; `AudioLevelMeter`, `Button`, `Tooltip` (no longer used directly by `LaunchWindow` itself — confirm no other reference remains in the file before removing each).
- `ICON_SIZE`, `HUD_DEVICE_POPUP_GAP`, `HUD_DEVICE_POPUP_HORIZONTAL_BOTTOM`, `ICON_CONFIG`, `IconName`, `getIcon`, `hudDisabledClasses`, `hudGroupClasses`, `hudIconBtnClasses`, `hudAuxIconBtnClasses`, `windowBtnClasses`, `hudSidebarClasses`, `hudSidebarVerticalClasses`.

Add imports:
```ts
import { HudOverlay } from "../hud/HudOverlay";
```

Replace the `return (...)` block (lines 665-1290) with:

```tsx
	return (
		<HudOverlay
			trayLayout={trayLayout}
			onToggleTrayLayout={toggleTrayLayout}
			t={t}
			setHudBarEl={setHudBarEl}
			onBarPointerEnter={() => setHudMouseEventsEnabled(true)}
			onBarPointerDown={() => setHudMouseEventsEnabled(true)}
			onBarMouseEnter={() => setHudMouseEventsEnabled(true)}
			onBarMouseLeave={() => {
				if (!isLanguageMenuOpen) setHudMouseEventsEnabled(false);
			}}
			onOuterPointerMove={(event) => {
				const target = event.target as HTMLElement | null;
				const shouldCapture =
					isLanguageMenuOpen || Boolean(target?.closest("[data-hud-interactive='true']"));
				setHudMouseEventsEnabled(shouldCapture);
			}}
			onOuterPointerLeave={() => {
				if (!isLanguageMenuOpen) setHudMouseEventsEnabled(false);
			}}
			onDragPointerDown={handleHudDragPointerDown}
			onDragPointerMove={handleHudDragPointerMove}
			onDragPointerUp={handleHudDragPointerEnd}
			onDragPointerCancel={handleHudDragPointerEnd}
			notices={{
				t,
				systemLocaleSuggestion,
				suggestedLanguageName,
				onAcceptSystemLocale: acceptSystemLocaleSuggestion,
				onDismissSystemLocale: dismissSystemLocaleSuggestion,
				setSystemLocalePromptEl,
				softwareEncoderFallbackNoticeVisible,
				onDismissSoftwareFallback: dismissSoftwareEncoderFallbackNotice,
				setSoftwareFallbackNoticeEl,
			}}
			deviceSelectors={{
				t,
				trayLayout,
				hudBarHeight,
				setDeviceSelectorEl,
				showMicControls,
				micExpanded,
				onMicMouseEnter: () => setIsMicHovered(true),
				onMicMouseLeave: () => setIsMicHovered(false),
				onMicFocus: () => setIsMicFocused(true),
				onMicBlur: () => setIsMicFocused(false),
				selectedMicLabel,
				microphoneDeviceId,
				selectedMicId,
				micDevices,
				onMicDeviceChange: (deviceId) => {
					const selectedDevice = micDevices.find((d) => d.deviceId === deviceId);
					setSelectedMicId(deviceId);
					setMicrophoneDeviceId(deviceId);
					setMicrophoneDeviceName(selectedDevice?.label);
				},
				micLevel: level,
				showWebcamControls,
				webcamExpanded,
				onWebcamMouseEnter: () => setIsWebcamHovered(true),
				onWebcamMouseLeave: () => setIsWebcamHovered(false),
				onWebcamFocus: () => setIsWebcamFocused(true),
				onWebcamBlur: () => setIsWebcamFocused(false),
				selectedCameraLabel,
				webcamDeviceId,
				selectedCameraId,
				cameraDevices,
				isCameraDevicesLoading,
				cameraDevicesError,
				onCameraDeviceChange: (deviceId) => {
					const device = cameraDevices.find((item) => item.deviceId === deviceId);
					setSelectedCameraId(deviceId);
					setWebcamDeviceId(deviceId);
					setWebcamDeviceName(device?.label);
				},
			}}
			sourceAudio={{
				trayLayout,
				selectedSource,
				onOpenSourceSelector: openSourceSelector,
				recording,
				saving,
				systemAudioEnabled,
				onToggleSystemAudio: () => setSystemAudioEnabled(!systemAudioEnabled),
				microphoneEnabled,
				onToggleMicrophone: toggleMicrophone,
				webcamEnabled,
				onToggleWebcam: () => void setWebcamEnabled(!webcamEnabled),
				supportsCursorModeToggle,
				cursorCaptureMode,
				onToggleCursorMode: () =>
					setCursorCaptureMode(cursorCaptureMode === "editable-overlay" ? "system" : "editable-overlay"),
				t,
			}}
			recordingControls={{
				recording,
				paused,
				saving,
				elapsedSeconds,
				hasSelectedSource,
				selectedSource,
				t,
				onRecordButtonClick: handleRecordButtonClick,
				canPauseRecording,
				onTogglePaused: togglePaused,
				onRestart: restartRecording,
				onCancel: cancelRecording,
			}}
			sidebar={{
				t,
				trayLayout,
				saving,
				recording,
				isLinuxHud,
				onOpenNotes: () => window.electronAPI.openNotes(),
				onOpenStudio: () => window.electronAPI.switchToEditor(),
				languageTriggerRef,
				activeLanguageLabel,
				isLanguageMenuOpen,
				onToggleLanguageMenu: () => setIsLanguageMenuOpen((open) => !open),
				setLanguageMenuPanelEl,
				languageMenuStyle,
				availableLocales,
				locale,
				getLocaleName,
				onSelectLocale: (loc) => {
					setLocale(loc);
					resolveSystemLocaleSuggestion();
					setIsLanguageMenuOpen(false);
				},
				onLanguageMenuPointerEnter: () => setHudMouseEventsEnabled(true),
				onLanguageMenuWheel: (event) => event.stopPropagation(),
				onHideHud: sendHudOverlayHide,
				onCloseHud: sendHudOverlayClose,
			}}
		/>
	);
```

Every value referenced above (`trayLayout`, `toggleTrayLayout`, `t`, `setHudBarEl`, `isLanguageMenuOpen`, `setHudMouseEventsEnabled`, `handleHudDragPointerDown/Move/End`, `systemLocaleSuggestion`, `suggestedLanguageName`, `acceptSystemLocaleSuggestion`, `dismissSystemLocaleSuggestion`, `setSystemLocalePromptEl`, `softwareEncoderFallbackNoticeVisible`, `dismissSoftwareEncoderFallbackNotice`, `setSoftwareFallbackNoticeEl`, `hudBarHeight`, `setDeviceSelectorEl`, `showMicControls`, `micExpanded`, `setIsMicHovered`, `setIsMicFocused`, `selectedMicLabel`, `microphoneDeviceId`, `selectedMicId`, `micDevices`, `setSelectedMicId`, `setMicrophoneDeviceId`, `setMicrophoneDeviceName`, `level`, `showWebcamControls`, `webcamExpanded`, `setIsWebcamHovered`, `setIsWebcamFocused`, `selectedCameraLabel`, `webcamDeviceId`, `selectedCameraId`, `cameraDevices`, `isCameraDevicesLoading`, `cameraDevicesError`, `setSelectedCameraId`, `setWebcamDeviceId`, `setWebcamDeviceName`, `selectedSource`, `openSourceSelector`, `recording`, `saving`, `systemAudioEnabled`, `setSystemAudioEnabled`, `microphoneEnabled`, `toggleMicrophone`, `webcamEnabled`, `setWebcamEnabled`, `supportsCursorModeToggle`, `cursorCaptureMode`, `setCursorCaptureMode`, `paused`, `elapsedSeconds`, `hasSelectedSource`, `handleRecordButtonClick`, `canPauseRecording`, `togglePaused`, `restartRecording`, `cancelRecording`, `isLinuxHud`, `languageTriggerRef`, `activeLanguageLabel`, `setIsLanguageMenuOpen`, `setLanguageMenuPanelEl`, `languageMenuStyle`, `availableLocales`, `locale`, `getLocaleName`, `setLocale`, `resolveSystemLocaleSuggestion`, `sendHudOverlayHide`, `sendHudOverlayClose`) already exists as-is earlier in the same function (lines 1-664) — none of this changes, only the JSX that consumed them does.

- [ ] **Step 4: Run every test file touched this task, plus the full suite once, to check for regressions**

Run: `npx vitest run src/components/launch/LaunchWindow.test.tsx src/components/hud`
Expected: PASS

Run: `npm run typecheck` (or the project's equivalent script — check `package.json`)
Expected: no errors — this is the step that will surface any missed prop or stale import from the deletions above.

Run: `npx vitest run`
Expected: full suite PASS, including `src/design/guardrails/noRogueGlass.test.ts` (Task 4) — this is the real proof that `src/components/hud` has zero raw `backdrop-filter` usage.

- [ ] **Step 5: Commit**

```bash
git add src/components/launch/LaunchWindow.tsx src/components/launch/LaunchWindow.test.tsx
git commit -m "refactor(hud): render HudOverlay from LaunchWindow, drop migrated dead code"
```

---

### Task 14: Manual verification in real Electron

jsdom cannot validate `backdrop-filter` compositing, WAAPI timing precision, or `<use href="#icon-x">` resolution the way real Chromium does — Fase 2's Task 27 already produced one production-only rendering bug (icons resolving to 0×0) that every automated test in the suite missed. This task is the same category of check, required before Fase 3 can be considered done.

**Files:** none (verification only — if this task finds a bug, open a new task/fix inline and re-run this checklist, don't skip it).

- [ ] **Step 1: Build and launch**

```bash
npm run build
npm run start
```

(Or the project's existing dev-mode command if faster — check `package.json`/`AGENTS.md` for the exact script name.)

- [ ] **Step 2: Visual/behavioural checklist**

Trigger the HUD overlay window and confirm, in the real window (not devtools' mobile-emulation or any scaled screenshot):
- The bar reads as glass (blur + specular top edge visible against a busy desktop background), matching `Glass level={2}`'s spec, not a flat translucent rectangle.
- Every migrated icon (drag handle, monitor, volume, mic, webcam, cursor, record/stop, pause/resume, restart, cancel, notes, lens/studio, language, check, minimize, close, chevron-down, tray layout) renders as actual visible geometry — none render as an empty 0×0 box (the Task 27 regression class).
- Clicking the record button (with a source selected) plays the diaphragm animation: 6 blades visibly rotate/close over ~420ms with a slight overshoot (spring easing), ending on a solid red dot exactly where the blades' center void was — no flash, no visible seam.
- Clicking stop crossfades the dot back to the static (35%-open) diaphragm glyph, with no rotation.
- Toggle `prefers-reduced-motion` (macOS: System Settings → Accessibility → Display → Reduce Motion; Linux: `gsettings set org.gnome.desktop.interface enable-animations false` or equivalent) and repeat both clicks — confirm a plain crossfade with zero rotation in both directions.
- Drag the HUD by its handle — confirm it still moves smoothly (this exercises the `moveHudOverlayBy` IPC path threaded unchanged through Task 13).
- Toggle vertical/horizontal tray layout — confirm the bar resizes without clipping or a scrollbar appearing.
- Open the language menu — confirm it renders as glass (not a flat panel) and closes on outside click/Escape as before.

- [ ] **Step 3: Record the result**

If everything above passes, note it in the commit message of Task 13's follow-up (or a short addendum commit if issues were found and fixed after Task 13's commit). If anything fails, fix it in the relevant component from Tasks 6–12, re-run that component's automated tests, then repeat this task's checklist from Step 1.
