# CLAUDE.md

This file gives Claude project-specific rules for Íris. For setup commands, project layout, and general engineering conventions, see [`AGENTS.md`](./AGENTS.md) — that file applies too; this one adds the design mandate on top of it.

## Design is not optional

Any UI work — a new component, a restyle, a single color/spacing tweak — MUST follow these two files literally, not approximately:

- **[`DESIGN.md`](./DESIGN.md)** — the single source of visual truth: color tokens, typography scale, glass material spec, spacing scale, motion curves/durations, logo usage, component states, copy voice, accessibility floor. Numeric values in there are exact, not suggestions. Where a choice isn't covered, the more restrictive/sober/"Apple" interpretation wins.
- **[`UX-PRINCIPLES.md`](./UX-PRINCIPLES.md)** — the reasoning behind `DESIGN.md`'s decisions (real Apple Liquid Glass technical documentation, HCI laws with citations). Read it when a `DESIGN.md` rule seems arbitrary or when a new UI decision isn't covered by `DESIGN.md` yet — it tells you which principle to reason from instead of guessing.

Before considering any UI change done, run `DESIGN.md`'s own checklist (section 12).

If a request conflicts with either file, say so explicitly and ask rather than silently picking one side — these documents took real design effort and aren't meant to be quietly overridden by an ad hoc implementation choice.

## Rebrand context

Íris is a fork of OpenScreen, macOS-only, with different goals: lighter, more stable, more visually refined (see `README.md`'s "Why this fork exists"). OpenScreen's own roadmap, AI Edition direction, and cross-platform (Windows/Linux) scope do **not** carry over — don't reintroduce them or reference them as this project's plans. `ROADMAP.md` is currently a placeholder pending Íris's own direction.
