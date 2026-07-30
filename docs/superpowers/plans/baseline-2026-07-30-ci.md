# Íris performance baseline — first real CI run — 2026-07-30

This document is historical. It records the first time `perf-budgets.json`'s
budgets were actually validated against GitHub Actions, superseding the
local-machine-derived runtime numbers from `baseline-2026-07-29.md`. It is not
updated after future runs — new baselines get a new dated file.

## Why this exists

Every runtime budget before this point was derived from a local developer
machine (see `baseline-2026-07-29.md`) and had never been observed passing on
real CI — flagged explicitly by the final whole-branch review of the
2026-07-29 foundation plan. The first push to the new `eduardoaugustolb/iris`
repository's `main` branch triggered CI for real and confirmed the concern.

## Environment

- Runner: GitHub-hosted `ubuntu-latest`, under `xvfb-run`
- Repo: `eduardoaugustolb/iris` (fresh, non-fork repository)
- Commits measured: `4b9a02f2` (run 30510132317) and its immediate predecessor
  `6aadd6e7` (run 30509808095) — two consecutive runs, same runner image class

## What happened

**Run 1** (`6aadd6e7`, budgets still local-machine-derived):

| metric | measured | budget at the time | result |
| --- | --- | --- | --- |
| bundle.total | 3436670 | 3600941 | pass |
| startup.hudFirstFrame | 1045 | 1155 | pass |
| memory.idle.total | 514816 | 615977 | pass |
| memory.idle.Browser | 228624 | 218350 | **fail** |

`memory.idle.Browser` failed even though `memory.idle.total` was well under
budget and lower than any local measurement — CI's per-process memory split
differs from a local `xvfb` session (more memory attributed to `Browser`,
less to `GPU`), even when the aggregate is better. Runtime budgets were
re-derived from this run's real numbers (measured × 1.05) and pushed as
`4b9a02f2`.

**Run 2** (`4b9a02f2`, budgets re-derived from Run 1):

| metric | measured | budget | result |
| --- | --- | --- | --- |
| bundle.total | 3436670 | 3600941 | pass |
| startup.hudFirstFrame | 3261 | 1098 | **fail** |
| memory.idle.total | 505436 | 540557 | pass |
| memory.idle.Browser | 221860 | 240056 | pass |
| memory.idle.Utility | 89124 | 93816 | pass |
| memory.idle.Tab | 134208 | 143506 | pass |
| memory.idle.GPU | 60244 | 63181 | pass |

`startup.hudFirstFrame` swung 1045 → 3261 ms (3.1×) between two consecutive
runs on the same runner class, while every `memory.idle.*` metric stayed
within ~2% across the same two runs. This is the same noise pattern already
documented for this metric on a local developer machine throughout the
2026-07-29 plan's ledger (Task 17: 2,579–1,279,305 ms across 6 local runs) —
`startup.hudFirstFrame` is measured as a single cold-start sample with no
retry/percentile logic in `scripts/bench/runtime.ts`, so it inherits whatever
scheduling jitter the host (local or CI) has at that exact moment.

## Decision

- **`memory.idle.*` budgets**: kept at Run 1's measured × 1.05 (see table
  above) — these were stable within ~2% across both runs, a normal headroom
  regime is appropriate.
- **`startup.hudFirstFrame`**: set to a flat `5000` ms ceiling instead of the
  usual 5%-headroom regime. Two consecutive same-runner samples spanning
  1045–3261 ms make a tight budget actively harmful (it would fail on noise,
  not regressions). 5000 ms comfortably clears both observed samples with
  real margin while still catching an actual large regression (e.g. a bug
  that made the HUD take 10+ seconds to paint).
- **Follow-up worth doing later, not done here**: have `scripts/bench/runtime.ts`
  take multiple samples and budget against a percentile (e.g. p90) rather than
  a single cold-start number. That would let `startup.hudFirstFrame` return to
  a tight, meaningful budget instead of a generous safety net. Out of scope for
  this fix — flagging so it isn't mistaken for solved.

See `perf-budgets.json` for the authoritative current values.
