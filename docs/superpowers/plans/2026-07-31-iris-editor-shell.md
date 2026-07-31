# Íris Editor — sub-fase 1 (moldura + barra de menu) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `EditorMenuBar.tsx`, `EditorEmptyState.tsx`, and the two shared Radix primitives they depend on (`dialog.tsx`, `dropdown-menu.tsx`) onto the Fase 0-2 design system (`Glass`, colour tokens, `@phosphor-icons/react`), so every future Editor sub-phase's dialogs/menus inherit the correct material for free.

**Architecture:** `dialog.tsx`/`dropdown-menu.tsx` keep their Radix positioning/animation elements exactly as-is (Radix owns focus trap, portal, viewport-aware sizing via CSS custom properties) but stop building their own material — each wraps its content in `Glass` instead of `bg-background`/`bg-popover`/`border`/`shadow-*`, matching the wrapper-element-plus-inner-Glass pattern already proven in Fase 3 (`HudSidebar.tsx`'s language menu). `EditorMenuBar`/`EditorEmptyState` then stop re-implementing material locally and switch their raw colours/icons to tokens/Phosphor.

**Tech Stack:** React 18 + TypeScript, Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`), `@phosphor-icons/react`, Vitest + Testing Library.

## Global Constraints

- `Glass` (`src/design/glass/Glass.tsx`) is the only place allowed to construct `backdrop-filter`. It does **not** accept a `style` prop (`GlassProps` explicitly omits it) — any dynamic positioning/sizing that isn't a `className` must live on a plain wrapping element, never passed to `Glass` itself.
- Elevation levels (`src/design/tokens/space.ts`, `elevation`): `1` (blur 12px), `2` (blur 24px), `3` (blur 40px). Fase 3 precedent: surfaces anchored near their trigger and positioned inline with the rest of a persistent panel (the HUD bar itself, its notices, its device-selector popups) got `level={2}`; the one surface that portals fully independently to `document.body` and floats above everything (the language dropdown menu) got `level={3}`. `DialogContent` and `DropdownMenuContent`/`DropdownMenuSubContent` are both exactly that second category — Radix-portaled overlays with no anchored parent context — so both use `level={3}` in this plan, not a modal-vs-menu split.
- Colour values come from `src/design/tokens/color.ts`. No hardcoded hex outside that file. Where a static (non-prop-driven) Tailwind hover/focus class needs a token colour, use Tailwind's arbitrary-value bracket syntax with the token's literal hex/rgba (e.g. `text-[#FF9F0A]`), never a different approximate colour — `color.brandPrimary = "#5E5CE6"`, `color.brandPrimaryHover = "#8886F0"`, `color.semanticWarning = "#FF9F0A"`, `color.textPrimary = "#F5F5F7"`, `color.textSecondary = "rgba(245,245,247,0.62)"`.
- Motion durations only from `src/design/tokens/motion.ts` (`duration.fast/standard/slow` = 150/280/420ms). Radix's `tailwindcss-animate` open/close classes need an explicit `duration-[280ms]` (matching `duration.standard`) wherever a bare `duration-200` or an implicit/default duration currently exists.
- Icons: only `@phosphor-icons/react`, per-icon deep imports (`@phosphor-icons/react/dist/csr/<Name>`) for tree-shaking — no `lucide-react` remaining in any file this plan touches.
- `src/design/guardrails/noRogueGlass.test.ts` must end this plan still passing, and must actually cover the two files this plan adds `Glass` to (not silently exempted by the existing `components/ui` blanket skip).

---

### Task 1: Migrate `dialog.tsx` to `Glass` + Phosphor

**Files:**
- Modify: `src/components/ui/dialog.tsx`
- Test: `src/components/ui/dialog.test.tsx` (new)

**Interfaces:**
- Consumes: `Glass` (`level`, `className`, ref/DOM props — from `src/design/glass/Glass.tsx`, already forwards both); `XIcon` from `@phosphor-icons/react/dist/csr/X`.
- Produces: `DialogContent`'s exported public API (props, ref type) is unchanged — every existing call site (`ExportDialog`, `ShortcutsConfigDialog`, `UnsavedChangesDialog`, `AddCustomFontDialog`, `EditorEmptyState`, and any other consumer) keeps working with zero changes to how they call `<DialogContent>`. Only the internal rendering changes.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/dialog.test.tsx
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

describe("DialogContent", () => {
	it("renders its content inside a Glass surface, not a raw background", () => {
		render(
			<Dialog open={true}>
				<DialogContent>
					<DialogTitle>Example</DialogTitle>
					<p>Body</p>
				</DialogContent>
			</Dialog>,
		);
		const title = screen.getByText("Example");
		const glassSurface = title.closest("[data-iris-glass]");
		expect(glassSurface).not.toBeNull();
		expect(glassSurface).toHaveAttribute("data-iris-glass", "3");
	});

	it("uses a Phosphor icon for the built-in close button, not lucide-react", () => {
		render(
			<Dialog open={true}>
				<DialogContent>
					<DialogTitle>Example</DialogTitle>
				</DialogContent>
			</Dialog>,
		);
		const closeButton = screen.getByRole("button", { name: /close/i });
		// Phosphor icons render a real <path>-based <svg>, not lucide's icon set —
		// this is a smoke check that some svg child exists and the button still works.
		expect(closeButton.querySelector("svg")).not.toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/dialog.test.tsx`
Expected: FAIL — no `data-iris-glass` attribute exists yet (current `DialogContent` renders a plain `bg-background` div).

- [ ] **Step 3: Implement**

Replace `DialogContent` in `src/components/ui/dialog.tsx`. Full new file:

```tsx
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import * as React from "react";

import { Glass } from "@/design/glass/Glass";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		ref={ref}
		className={cn(
			"fixed inset-0 z-[9999] bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
			className,
		)}
		{...props}
	/>
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
	<DialogPortal>
		<DialogOverlay />
		<DialogPrimitive.Content
			ref={ref}
			className="fixed left-[50%] top-[50%] z-[10000] translate-x-[-50%] translate-y-[-50%] duration-[280ms] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
			{...props}
		>
			<Glass
				level={3}
				radius="md"
				className={cn("relative grid w-full max-w-lg gap-4 p-6", className)}
			>
				{children}
				<DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
					<XIcon size={16} weight="regular" />
					<span className="sr-only">Close</span>
				</DialogPrimitive.Close>
			</Glass>
		</DialogPrimitive.Content>
	</DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
		{...props}
	/>
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		ref={ref}
		className={cn("text-lg font-semibold leading-none tracking-tight", className)}
		{...props}
	/>
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description
		ref={ref}
		className={cn("text-sm text-muted-foreground", className)}
		{...props}
	/>
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
```

Notes on the diff from the original:
- `bg-background p-6 shadow-lg border sm:rounded-lg gap-4 grid w-full max-w-lg` moved off `DialogPrimitive.Content` and onto the new `<Glass level={3} radius="md" className="relative grid w-full max-w-lg gap-4 p-6">` wrapper — `relative` is required so the close button's `absolute right-4 top-4` anchors to the card, not the fixed viewport-positioned outer element. `DialogPrimitive.Content` itself keeps only positioning/animation classes and no longer receives the consumer's `className` — instead, `className` is now merged (via `cn`/`twMerge`) onto the `Glass` wrapper. This preserves the original's behaviour exactly: every existing consumer already only ever overrode card-appearance properties (background, border, padding, gap, max-width) through this prop, never the fixed positioning, so redirecting `className` to the actual card is a transparent, backward-compatible change — a consumer passing `className="max-w-sm"` (like `EditorEmptyState`, Task 5) still shrinks the card exactly as before, `twMerge` resolves the `max-w-lg`/`max-w-sm` conflict correctly.
- The original's `sm:rounded-lg` (Tailwind's own `lg` radius, 8px, applied only from the `sm:` breakpoint up — a mobile-full-bleed pattern) is replaced by `radius="md"` (14px, this project's token) applied unconditionally. Íris is desktop-only Electron; the responsive distinction never mattered here. This is a deliberate simplification, not an oversight.
- `ring-offset-background` dropped from the close button's className (no longer meaningful without the flat background it referenced); the remaining focus-ring classes (`focus:ring-2 focus:ring-ring focus:ring-offset-2`) still work against `--ring`, a CSS variable this file doesn't own — leave as-is, out of scope for this plan.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/dialog.test.tsx`
Expected: PASS

- [ ] **Step 5: Run every existing consumer's tests to confirm no regression**

Run: `npx vitest run src/components/video-editor/UnsavedChangesDialog.test.tsx src/components/video-editor/ShortcutsConfigDialog.test.tsx src/components/video-editor/ExportDialog.test.tsx src/components/video-editor/AddCustomFontDialog.test.tsx` (skip any path that doesn't exist — check with `ls` first; not every one of these may have a test file, that's fine, just run whichever do)

Expected: PASS — if anything fails, read the failure: a `DialogContent` consumer passing a `className` that assumed the old flat background (e.g. `bg-[#09090b]`) will now visually double up with `Glass`'s own tint, which is a real, in-scope bug to fix by removing that consumer's now-redundant background/border override (but do NOT touch that file's other content in this task — only the minimal className fix, and only if a test actually fails because of it, not preemptively).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/dialog.tsx src/components/ui/dialog.test.tsx
git commit -m "feat(ui): rebuild DialogContent on Glass, drop lucide-react"
```

---

### Task 2: Migrate `dropdown-menu.tsx` to `Glass` + Phosphor

**Files:**
- Modify: `src/components/ui/dropdown-menu.tsx`
- Test: `src/components/ui/dropdown-menu.test.tsx` (new)

**Interfaces:**
- Consumes: `Glass`; `CheckIcon` (`@phosphor-icons/react/dist/csr/Check`), `CaretRightIcon` (`@phosphor-icons/react/dist/csr/CaretRight`), `CircleIcon` (`@phosphor-icons/react/dist/csr/Circle`).
- Produces: `DropdownMenuContent`/`DropdownMenuSubContent`'s public props/ref API unchanged — `EditorMenuBar` (Task 4) and any other consumer keep calling them exactly as before.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/dropdown-menu.test.tsx
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./dropdown-menu";

describe("DropdownMenuContent", () => {
	beforeAll(() => {
		// Radix relies on pointer-capture / scroll APIs jsdom does not implement.
		Element.prototype.hasPointerCapture = () => false;
		Element.prototype.releasePointerCapture = () => {};
		Element.prototype.scrollIntoView = () => {};
	});

	it("renders its items inside a Glass surface, not a raw background", async () => {
		render(
			<DropdownMenu open={true}>
				<DropdownMenuTrigger>Open</DropdownMenuTrigger>
				<DropdownMenuContent>
					<DropdownMenuItem>Example item</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>,
		);
		const item = await screen.findByText("Example item");
		const glassSurface = item.closest("[data-iris-glass]");
		expect(glassSurface).not.toBeNull();
		expect(glassSurface).toHaveAttribute("data-iris-glass", "3");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/dropdown-menu.test.tsx`
Expected: FAIL — no `data-iris-glass` attribute (current `DropdownMenuContent` renders `bg-popover`).

- [ ] **Step 3: Implement**

Replace `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuContent`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem` in `src/components/ui/dropdown-menu.tsx`. Full new file:

```tsx
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { CircleIcon } from "@phosphor-icons/react/dist/csr/Circle";
import * as React from "react";

import { Glass } from "@/design/glass/Glass";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
		inset?: boolean;
	}
>(({ className, inset, children, ...props }, ref) => (
	<DropdownMenuPrimitive.SubTrigger
		ref={ref}
		className={cn(
			"flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
			inset && "pl-8",
			className,
		)}
		{...props}
	>
		{children}
		<CaretRightIcon size={16} weight="regular" className="ml-auto" />
	</DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, children, ...props }, ref) => (
	<DropdownMenuPrimitive.SubContent
		ref={ref}
		className={cn(
			"z-50 min-w-[8rem] overflow-hidden duration-[280ms] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
			className,
		)}
		{...props}
	>
		<Glass level={3} radius="sm" className="w-full h-full p-1">
			{children}
		</Glass>
	</DropdownMenuPrimitive.SubContent>
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> & {
		portalled?: boolean;
	}
>(({ className, children, sideOffset = 4, portalled = true, ...props }, ref) => {
	const content = (
		<DropdownMenuPrimitive.Content
			ref={ref}
			sideOffset={sideOffset}
			className={cn(
				"z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden duration-[280ms]",
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-dropdown-menu-content-transform-origin]",
				className,
			)}
			{...props}
		>
			<Glass level={3} radius="sm" className="w-full h-full p-1">
				{children}
			</Glass>
		</DropdownMenuPrimitive.Content>
	);

	if (!portalled) {
		return content;
	}

	return <DropdownMenuPrimitive.Portal>{content}</DropdownMenuPrimitive.Portal>;
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
		inset?: boolean;
	}
>(({ className, inset, ...props }, ref) => (
	<DropdownMenuPrimitive.Item
		ref={ref}
		className={cn(
			"relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
			inset && "pl-8",
			className,
		)}
		{...props}
	/>
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
	<DropdownMenuPrimitive.CheckboxItem
		ref={ref}
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			className,
		)}
		checked={checked}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<DropdownMenuPrimitive.ItemIndicator>
				<CheckIcon size={16} weight="regular" />
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
		{children}
	</DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
	<DropdownMenuPrimitive.RadioItem
		ref={ref}
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			className,
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<DropdownMenuPrimitive.ItemIndicator>
				<CircleIcon size={8} weight="fill" />
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
		{children}
	</DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
		inset?: boolean;
	}
>(({ className, inset, ...props }, ref) => (
	<DropdownMenuPrimitive.Label
		ref={ref}
		className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
		{...props}
	/>
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.Separator
		ref={ref}
		className={cn("-mx-1 my-1 h-px bg-muted", className)}
		{...props}
	/>
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
	);
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
};
```

Notes on the diff:
- `overflow-y-auto overflow-x-hidden` stay on the outer Radix `Content`/`SubContent` (Radix's `--radix-dropdown-menu-content-available-height` CSS var must apply directly to the element Radix measures — moving sizing onto the inner `Glass` would break viewport-aware clamping). Only `border`/`bg-popover`/`shadow-*`/`p-1`/`rounded-md` move onto the inner `Glass`.
- `Circle` (radio indicator) used `fill-current h-2 w-2` (8px) in the original; Phosphor's `weight="fill"` is the equivalent filled variant, `size={8}` keeps the same physical size.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/dropdown-menu.test.tsx`
Expected: PASS

- [ ] **Step 5: Run EditorMenuBar's existing test suite to confirm no regression**

Run: `npx vitest run src/components/video-editor/EditorMenuBar.test.tsx`
Expected: PASS unchanged (this file's tests exercise `DropdownMenuContent` through `EditorMenuBar` already — they must keep passing before Task 4 touches `EditorMenuBar.tsx` itself, to isolate whether any later failure came from this task or from Task 4).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/dropdown-menu.tsx src/components/ui/dropdown-menu.test.tsx
git commit -m "feat(ui): rebuild DropdownMenuContent/SubContent on Glass, drop lucide-react"
```

---

### Task 3: Guardrail coverage for the two migrated `components/ui` primitives

**Files:**
- Modify: `src/design/guardrails/noRogueGlass.test.ts`

**Interfaces:**
- Produces: the guardrail now walks into exactly `src/components/ui/dialog.tsx` and `src/components/ui/dropdown-menu.tsx`, while every other file under `src/components/ui/` and every other subdirectory of `src/components/` (except the already-carved-out `components/hud`) stays exempt.

- [ ] **Step 1: Write the failing test**

Temporarily prove the current walk doesn't reach these two files, the same way Task 4 of the Fase 3 HUD plan did — create a throwaway offender, confirm the guardrail doesn't catch it yet:

```bash
echo 'export const x = "backdrop-filter: blur(4px)";' >> src/components/ui/dialog.tsx
npx vitest run src/design/guardrails/noRogueGlass.test.ts
```

Expected: PASS (the walk doesn't reach `components/ui` at all yet — this confirms the baseline before the fix).

- [ ] **Step 2: Revert the throwaway line, then implement the walk change**

```bash
git checkout -- src/components/ui/dialog.tsx
```

Edit `src/design/guardrails/noRogueGlass.test.ts`'s `sourceFiles` function:

```ts
function sourceFiles(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		const relative = path.relative(SRC, full);

		if (entry.isDirectory()) {
			// components/hud is rebuilt on the design layer (Íris Fase 3) — always walk it.
			if (relative === path.join("components", "hud")) return sourceFiles(full);

			// components/ui hosts shared primitives migrated one at a time (Íris Editor
			// sub-fase 1) — walk it so already-migrated files can be picked up below, even
			// though most of its siblings are still legacy.
			if (relative === path.join("components", "ui")) return sourceFiles(full);

			// Skip subdirectories of components except hud/ui, and walk components itself.
			if (relative === "components") return sourceFiles(full);

			// Every other subdirectory of components/ is still legacy — skip it.
			if (relative.startsWith("components" + path.sep)) return [];

			return LEGACY_ALLOWLIST.includes(relative) ? [] : sourceFiles(full);
		}

		// Inside components/ui specifically, only already-migrated primitives are
		// checked — the rest of that directory is still legacy Tailwind/shadcn.
		const inComponentsUi = relative.startsWith(path.join("components", "ui") + path.sep);
		if (inComponentsUi) {
			const MIGRATED_UI_PRIMITIVES = ["dialog.tsx", "dropdown-menu.tsx"];
			if (!MIGRATED_UI_PRIMITIVES.includes(entry.name)) return [];
		}

		return /\.(ts|tsx|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
	});
}
```

- [ ] **Step 3: Re-run the offender proof, then clean up and verify green**

```bash
echo 'export const x = "backdrop-filter: blur(4px)";' >> src/components/ui/dialog.tsx
npx vitest run src/design/guardrails/noRogueGlass.test.ts
```

Expected: FAIL — `dialog.tsx` now reported as an offender.

```bash
git checkout -- src/components/ui/dialog.tsx
npx vitest run src/design/guardrails/noRogueGlass.test.ts
```

Expected: PASS (clean again, and now genuinely covering both migrated files without any temporary changes left in the tree — confirm with `git status`).

- [ ] **Step 4: Commit**

```bash
git add src/design/guardrails/noRogueGlass.test.ts
git commit -m "chore(guardrails): cover the migrated dialog/dropdown-menu primitives"
```

---

### Task 4: Migrate `EditorMenuBar.tsx` to tokens

**Files:**
- Modify: `src/components/video-editor/EditorMenuBar.tsx`
- Modify: `src/components/video-editor/EditorMenuBar.test.tsx`

**Interfaces:**
- Consumes: literal hex/rgba values from `src/design/tokens/color.ts` (`textSecondary`, `textPrimary`, `semanticWarning`) applied as Tailwind arbitrary-value classes per the Global Constraints — no runtime import of the `color` module needed, since every usage here is a static hover/focus class, not a prop-driven inline style. `DropdownMenuContent`/`DropdownMenuItem`/etc. from `@/components/ui/dropdown-menu` (Task 2, unchanged public API).
- Produces: `EditorMenuBarProps`, `EditorMenu`, `EditorMenuItem`, `buildEditorMenuModel`, `formatShortcut`, `formatShiftShortcut` — all unchanged, this task only touches the JSX inside `EditorMenuBar`.

- [ ] **Step 1: Read the current file and confirm the exact lines to change**

Run: `cat src/components/video-editor/EditorMenuBar.tsx` — confirm lines 159-198 (the `EditorMenuBar` function's JSX) still match what's quoted below; if `buildEditorMenuModel`/types above it changed since this plan was written, this task's JSX-only edit is unaffected either way.

- [ ] **Step 2: Write the failing test (append to the existing file)**

```tsx
// append to src/components/video-editor/EditorMenuBar.test.tsx, inside the existing
// describe("<EditorMenuBar />", ...) block
it("renders the Quit item in the warning colour, not red", async () => {
	const user = userEvent.setup();
	render(<EditorMenuBar {...makeProps()} />);

	await user.click(screen.getByRole("button", { name: "File" }));
	const quitItem = await screen.findByRole("menuitem", { name: /Quit/ });

	// color.semanticWarning from src/design/tokens/color.ts — DESIGN.md reserves red
	// exclusively for the recording state, so destructive-ish-but-not-data-loss menu
	// items (Quit) use the warning tone instead.
	expect(quitItem.className).toContain("text-[#FF9F0A]");
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/video-editor/EditorMenuBar.test.tsx`
Expected: FAIL — current `danger` styling uses `text-red-400`, not `text-[#FF9F0A]`.

- [ ] **Step 4: Implement**

In `src/components/video-editor/EditorMenuBar.tsx`, replace the `EditorMenuBar` function's return block (currently lines 155-198):

```tsx
export function EditorMenuBar(props: EditorMenuBarProps) {
	const menus = buildEditorMenuModel(props);

	return (
		<div className={`flex items-center gap-0.5 ${props.isMac ? "ml-14" : "ml-2"}`}>
			{menus.map((menu) => (
				<DropdownMenu key={menu.id}>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-[rgba(245,245,247,0.62)] hover:text-[#F5F5F7] hover:bg-white/[0.08] transition-all duration-150 outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:bg-white/[0.08]"
						>
							{menu.label}
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className={menu.minWidthClass}>
						{menu.items.map((item) => (
							<Fragment key={item.id}>
								{item.separatorBefore && <DropdownMenuSeparator className="bg-white/[0.08]" />}
								<DropdownMenuItem
									onSelect={() => item.onSelect()}
									disabled={item.disabled}
									className={
										item.danger
											? "hover:bg-[#FF9F0A]/20 focus:bg-[#FF9F0A]/20 focus:text-[#FF9F0A] text-[#FF9F0A] cursor-pointer justify-between"
											: "hover:bg-white/[0.08] focus:bg-white/[0.08] focus:text-[#F5F5F7] text-[#F5F5F7] cursor-pointer justify-between"
									}
								>
									<span>{item.label}</span>
									{item.shortcut && (
										<DropdownMenuShortcut className="ml-2">{item.shortcut}</DropdownMenuShortcut>
									)}
								</DropdownMenuItem>
							</Fragment>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			))}
		</div>
	);
}
```

Changes from the original:
- Trigger button: `text-slate-300` → `text-[rgba(245,245,247,0.62)]` (literal `color.textSecondary`), `hover:text-white` → `hover:text-[#F5F5F7]` (literal `color.textPrimary`).
- `DropdownMenuContent`'s `className` drops `bg-[#09090b]/95 backdrop-blur-md border border-white/[0.08] text-slate-200` entirely — `Glass` (Task 2) now supplies the material, and `text-slate-200` is redundant with the item-level text colours added below. Only `menu.minWidthClass` remains.
- Non-danger `DropdownMenuItem`: added `focus:text-[#F5F5F7] text-[#F5F5F7]` (was relying on the now-removed `text-slate-200` from the parent).
- Danger `DropdownMenuItem`: `red-500`/`red-400` → `#FF9F0A` (literal `color.semanticWarning`) throughout.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/video-editor/EditorMenuBar.test.tsx`
Expected: PASS — all tests, including the pre-existing ones (menu rendering, shortcut wiring, disabled states) and the new Quit-colour test.

- [ ] **Step 6: Commit**

```bash
git add src/components/video-editor/EditorMenuBar.tsx src/components/video-editor/EditorMenuBar.test.tsx
git commit -m "feat(editor): move EditorMenuBar onto design tokens"
```

---

### Task 5: Migrate `EditorEmptyState.tsx` to tokens + Phosphor

**Files:**
- Modify: `src/components/video-editor/EditorEmptyState.tsx`
- Test: `src/components/video-editor/EditorEmptyState.test.tsx` (new — this component has no existing test file)

**Interfaces:**
- Consumes: `color` from `@/design/tokens/color` (`brandPrimary`); Phosphor icons (`FilmIcon`, `FolderOpenIcon`, `UploadIcon`, `XIcon`, `WarningCircleIcon` — note: Phosphor's closest equivalent to lucide's `AlertCircle` is `WarningCircle`, verify this exists via `ls node_modules/@phosphor-icons/react/dist/csr/ | grep -i warningcircle` before writing the import, and substitute the exact matching name if different).
- Produces: `EditorEmptyStateProps`, `EditorEmptyState` — public API unchanged.

- [ ] **Step 1: Confirm the exact Phosphor icon name for the alert glyph**

Run: `ls /home/eduardoaugusto/Documentos/www/projetos/iris/node_modules/@phosphor-icons/react/dist/csr/ | grep -i warning`
Expected: a `WarningCircle.*` entry exists (used by other Phosphor consumers in this codebase's ecosystem for this exact "circle with exclamation" glyph). If the exact name differs from `WarningCircleIcon`, use whatever the deep-import path actually exports (check the matching `.d.ts` for the named export, same way Task 3 of the Fase 3 HUD plan verified `ApertureIcon`).

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/video-editor/EditorEmptyState.test.tsx
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorEmptyState } from "./EditorEmptyState";

const originalElectronAPI = window.electronAPI;

afterEach(() => {
	vi.restoreAllMocks();
	Object.defineProperty(window, "electronAPI", { value: originalElectronAPI, configurable: true });
});

function mockElectronAPI(overrides: Partial<typeof window.electronAPI> = {}) {
	Object.defineProperty(window, "electronAPI", {
		configurable: true,
		value: {
			openVideoFilePicker: vi.fn(async () => ({ canceled: true })),
			getPathForFile: vi.fn(() => ""),
			loadProjectFileFromPath: vi.fn(async () => ({ success: false })),
			...overrides,
		},
	});
}

vi.mock("@/native", () => ({
	nativeBridgeClient: {
		project: {
			setCurrentVideoPath: vi.fn(async () => ({ success: true })),
			loadProjectFile: vi.fn(async () => ({ canceled: true })),
		},
	},
}));

describe("EditorEmptyState", () => {
	it("renders the import-video and load-project actions", () => {
		mockElectronAPI();
		render(
			<EditorEmptyState onVideoImported={vi.fn()} onProjectOpened={vi.fn()} />,
		);
		expect(screen.getByText("emptyState.importVideoButton")).toBeInTheDocument();
		expect(screen.getByText("emptyState.loadProjectButton")).toBeInTheDocument();
	});

	it("calls onVideoImported after a successful file pick", async () => {
		const onVideoImported = vi.fn();
		mockElectronAPI({
			openVideoFilePicker: vi.fn(async () => ({
				canceled: false,
				success: true,
				path: "/tmp/video.mp4",
			})),
		});
		render(<EditorEmptyState onVideoImported={onVideoImported} onProjectOpened={vi.fn()} />);

		fireEvent.click(screen.getByText("emptyState.importVideoButton"));

		await vi.waitFor(() => expect(onVideoImported).toHaveBeenCalledWith("/tmp/video.mp4"));
	});

	it("shows the unsupported-format error dialog when a non-.iris file is dropped", () => {
		mockElectronAPI();
		render(<EditorEmptyState onVideoImported={vi.fn()} onProjectOpened={vi.fn()} />);

		const dropZone = screen.getByText("emptyState.title").closest("div[class*='h-full']");
		expect(dropZone).not.toBeNull();

		const file = new File(["data"], "not-a-project.txt", { type: "text/plain" });
		fireEvent.drop(dropZone as Element, { dataTransfer: { files: [file] } });

		expect(screen.getByText("emptyState.dropErrors.unsupportedFormatTitle")).toBeInTheDocument();
	});

	it("uses the brand-primary colour for the primary action, not the legacy green", () => {
		mockElectronAPI();
		render(<EditorEmptyState onVideoImported={vi.fn()} onProjectOpened={vi.fn()} />);
		const importButton = screen.getByText("emptyState.importVideoButton").closest("button");
		expect(importButton?.className).toContain("#5E5CE6");
		expect(importButton?.className).not.toContain("#34B27B");
	});
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/video-editor/EditorEmptyState.test.tsx`
Expected: FAIL — file doesn't exist as a passing target yet (component still uses `#34B27B`, and `useScopedT`/`i18n` isn't mocked, so labels won't resolve to the raw keys asserted above — this is expected at this step; Step 4 below is implementation-only, but if this specific test's `t()` calls need mocking to resolve to the literal namespaced key text, add a `vi.mock("@/contexts/I18nContext", ...)` returning the identity function, mirroring the pattern in `LaunchWindow.test.tsx`'s i18n mock, before re-running).

Actually, add this mock before the first `describe` block, since `EditorEmptyState` calls `useScopedT("editor")`/`useScopedT("common")` directly (not injected via props):

```tsx
vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));
```

This makes `te("emptyState.importVideoButton")` resolve to the literal string `"editor.emptyState.importVideoButton"` — adjust every `screen.getByText(...)` string above to include the `editor.`/`common.` namespace prefix this mock produces (e.g. `screen.getByText("editor.emptyState.importVideoButton")`, `screen.getByText("editor.emptyState.title")`, `screen.getByText("editor.emptyState.dropErrors.unsupportedFormatTitle")`).

- [ ] **Step 4: Implement**

Replace `src/components/video-editor/EditorEmptyState.tsx` in full:

```tsx
import { FilmIcon } from "@phosphor-icons/react/dist/csr/Film";
import { FolderOpenIcon } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { UploadIcon } from "@phosphor-icons/react/dist/csr/Upload";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { useCallback, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";
import { color } from "@/design/tokens/color";
import { getProjectFolder, parentDirectoryOf, saveUserPreferences } from "@/lib/userPreferences";
import { nativeBridgeClient } from "@/native";

interface EditorEmptyStateProps {
	onVideoImported: (videoPath: string) => void;
	/** Called with the loaded project data; handles both button click and drag-drop */
	onProjectOpened: (project: unknown, path: string | null) => void;
}

type DropError = "unsupported-format" | "load-failed" | null;

export function EditorEmptyState({ onVideoImported, onProjectOpened }: EditorEmptyStateProps) {
	const te = useScopedT("editor");
	const tc = useScopedT("common");
	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const [dropError, setDropError] = useState<DropError>(null);
	// Freeze the last non-null error type so dialog content doesn't snap to the else-branch
	// during the closing animation (same pattern as UnsavedChangesDialog).
	const lastDropErrorRef = useRef<Exclude<DropError, null>>("unsupported-format");
	if (dropError !== null) {
		lastDropErrorRef.current = dropError;
	}

	const handleImportVideo = useCallback(async () => {
		const result = await window.electronAPI.openVideoFilePicker();
		if (result.canceled || !result.success || !result.path) return;

		const setResult = await nativeBridgeClient.project.setCurrentVideoPath(result.path);
		if (!setResult.success) return;

		onVideoImported(result.path);
	}, [onVideoImported]);

	const handleLoadProject = useCallback(async () => {
		const result = await nativeBridgeClient.project.loadProjectFile(getProjectFolder());
		if (result.canceled || !result.success || !result.project) return;
		if (result.path) {
			const folder = parentDirectoryOf(result.path);
			if (folder) {
				saveUserPreferences({ projectFolder: folder });
			}
		}
		onProjectOpened(result.project, result.path ?? null);
	}, [onProjectOpened]);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		if (e.dataTransfer.items.length > 0) {
			setIsDraggingOver(true);
		}
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			setIsDraggingOver(false);
		}
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			setIsDraggingOver(false);

			const files = Array.from(e.dataTransfer.files);
			if (files.length === 0) return;

			const projectFile = files.find((f) => f.name.endsWith(".iris"));
			if (!projectFile) {
				setDropError("unsupported-format");
				return;
			}

			// Use Electron's webUtils.getPathForFile; File.path was removed in Electron 32+
			let filePath: string;
			try {
				filePath = window.electronAPI.getPathForFile(projectFile);
			} catch {
				setDropError("load-failed");
				return;
			}
			if (!filePath) {
				setDropError("load-failed");
				return;
			}

			let result: Awaited<ReturnType<typeof window.electronAPI.loadProjectFileFromPath>>;
			try {
				result = await window.electronAPI.loadProjectFileFromPath(filePath);
			} catch {
				setDropError("load-failed");
				return;
			}
			if (!result.success || !result.project) {
				setDropError("load-failed");
				return;
			}

			onProjectOpened(result.project, result.path ?? null);
		},
		[onProjectOpened],
	);

	return (
		<div
			className="flex h-full w-full flex-col items-center justify-center bg-[#09090b]"
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{/* Drop overlay */}
			{isDraggingOver && (
				<div
					className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl border-2 border-dashed"
					style={{ borderColor: color.brandPrimary, backgroundColor: `${color.brandPrimary}1A` }}
				>
					<UploadIcon
						size={40}
						weight="regular"
						className="mb-3"
						style={{ color: color.brandPrimary }}
					/>
					<p className="text-base font-semibold" style={{ color: color.brandPrimary }}>
						{te("emptyState.dropOverlay")}
					</p>
				</div>
			)}

			{/* Drop error dialog */}
			<Dialog open={dropError !== null} onOpenChange={(open) => !open && setDropError(null)}>
				<DialogContent className="max-w-sm gap-0">
					<DialogHeader className="mb-4">
						<div className="flex items-center gap-3">
							<img
								src="./iris.png"
								alt=""
								aria-hidden="true"
								className="w-9 h-9 rounded-xl flex-shrink-0"
							/>
							<DialogTitle className="text-base font-semibold text-slate-200 leading-tight">
								{lastDropErrorRef.current === "unsupported-format"
									? te("emptyState.dropErrors.unsupportedFormatTitle")
									: te("emptyState.dropErrors.couldNotOpenTitle")}
							</DialogTitle>
						</div>
					</DialogHeader>

					<div className="flex flex-col items-center gap-3 mb-6 text-center">
						<div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 ring-1 ring-white/10">
							<WarningCircleIcon size={20} weight="regular" className="text-slate-400 flex-shrink-0" />
						</div>
						<p className="text-sm text-slate-400 leading-relaxed">
							{lastDropErrorRef.current === "unsupported-format"
								? te("emptyState.dropErrors.unsupportedFormatMessage")
								: te("emptyState.dropErrors.couldNotOpenMessage")}
						</p>
					</div>

					<button
						type="button"
						onClick={() => setDropError(null)}
						className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
					>
						<XIcon size={16} weight="regular" />
						{tc("actions.close")}
					</button>
				</DialogContent>
			</Dialog>

			<div className="relative flex flex-col items-center gap-8 px-6 text-center">
				{/* Logo */}
				<img
					src="./iris.png"
					alt=""
					aria-hidden="true"
					className="h-16 w-16 rounded-2xl opacity-90"
				/>

				<div className="flex flex-col gap-2">
					<h2 className="text-xl font-semibold text-slate-200">{te("emptyState.title")}</h2>
					<p className="max-w-sm text-sm leading-relaxed text-slate-500">
						{te("emptyState.description")}
					</p>
				</div>

				{/* Actions */}
				<div className="flex flex-col gap-3 w-full max-w-xs">
					<button
						type="button"
						onClick={handleImportVideo}
						className="flex items-center justify-center gap-2.5 w-full px-4 py-3 rounded-xl text-white font-medium text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] bg-[#5E5CE6] hover:bg-[#8886F0] active:bg-[#5E5CE6] focus-visible:ring-[#5E5CE6]"
					>
						<FilmIcon size={16} weight="regular" />
						{te("emptyState.importVideoButton")}
					</button>
					<button
						type="button"
						onClick={handleLoadProject}
						className="flex items-center justify-center gap-2.5 w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
					>
						<FolderOpenIcon size={16} weight="regular" />
						{te("emptyState.loadProjectButton")}
					</button>
				</div>

				<div className="flex flex-col items-center gap-2">
					<p className="text-xs text-slate-600">{te("emptyState.supportedFormats")}</p>
					<div className="flex items-center gap-1.5 text-xs text-slate-700 mt-4">
						<UploadIcon size={12} weight="regular" />
						<span>{te("emptyState.dragDropHint")}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
```

Changes from the original:
- `lucide-react` import removed entirely; every icon is now a Phosphor deep import.
- Drag-over overlay: `border-[#34B27B] bg-[#34B27B]/10` → `color.brandPrimary` via inline `style` (border colour + a manually-composed `1A` alpha suffix on the hex for the ~10% tint, since this is a dynamically-conditional element already using inline styling patterns elsewhere in this codebase's HUD components, not a static Tailwind class); icon and text colour also switch to `color.brandPrimary` via `style`.
- `DialogContent`'s `className` drops `bg-[#09090b] border-white/10 rounded-2xl p-6` — `Glass` (Task 1) supplies the material and default `p-6` now. `max-w-sm gap-0` survives (per Task 1's redesign, `className` passed to `DialogContent` reaches the `Glass` card, so `twMerge` correctly overrides the default `max-w-lg`/`gap-4` with this dialog's original `max-w-sm`/`gap-0` — exact spacing preserved, not a "check and see" — `gap-0` was in the original and stays explicit here).
- Primary "Import video" button: `#34B27B`/`#2d9e6c`/`#27885c` (green, three manually-tuned shades for rest/hover/active) → `color.brandPrimary`/`color.brandPrimaryHover` for rest/hover, `color.brandPrimary` again for active (no separate "active" tone exists in the token set — reusing the base colour for the pressed state is the correct simplification, matching how other migrated components in this codebase handle states without a dedicated token).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/video-editor/EditorEmptyState.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/video-editor/EditorEmptyState.tsx src/components/video-editor/EditorEmptyState.test.tsx
git commit -m "feat(editor): move EditorEmptyState onto design tokens and Phosphor"
```

---

### Task 6: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Full suite, typecheck, guardrails**

```bash
npx tsc --noEmit -p .
npx vitest run
npx vitest run src/design/guardrails
```

Expected: all clean. If `tsc` reports an error about a `DialogContent`/`DropdownMenuContent` consumer's `className` prop conflicting with the new internal structure (e.g. a consumer passing `style` where `Glass` doesn't accept one — check every file that imports these two primitives, listed in this plan's Global Constraints discovery: `grep -rln 'from "@/components/ui/dialog"' src/` and the `dropdown-menu` equivalent), fix that specific consumer's prop usage — do not weaken `Glass`'s `style`-less contract to work around it.

- [ ] **Step 2: Bundle budget**

```bash
npx vite build
npm run bench:bundle
```

Expected: within budget. If not (e.g. more Phosphor icons pushed `react-vendor.js` further over its already-adjusted budget from the HUD migration), re-derive that specific budget with the same 5%-headroom approach already used twice in this project's history (`perf-budgets.json`), and note the new measured value in the commit message.

- [ ] **Step 3: Manual check in a running app**

```bash
npm run dev
```

Open the editor (import any video or load an existing `.iris` project) and confirm: the File/Edit/View menus open with a visible glass material (blurred, translucent, not a flat dark rectangle) and every icon renders as real geometry (not an empty box — the same regression class Fase 2's Task 27 and Fase 3's Task 14 both checked for). Trigger the empty-state's drop-error dialog (drag a non-`.iris` file onto the editor before loading anything) and confirm it also renders as glass. If this environment has no display available to actually verify, say so explicitly rather than claiming success — do not skip reporting this step's outcome.

- [ ] **Step 4: No commit for this task** — it's verification-only. If Step 1 or Step 2 required a fix, that fix gets its own commit as described in those steps.
