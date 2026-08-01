import type { ReactElement, ReactNode } from "react";
import { Profiler, type ProfilerOnRenderCallback } from "react";

/**
 * Test-only helper. Mount `Probe` inside the subtree under test and assert on
 * `count()` to pin down how often that subtree re-renders. Used by the render
 * budgets: the playback path is meant to reach zero React renders per frame.
 *
 * Counting happens during render, so under `StrictMode` React's development
 * double-invocation doubles every count. Never mount `Probe` inside a
 * `StrictMode` boundary when asserting a render budget.
 */
export function createRenderCounter(): {
	count: () => number;
	reset: () => void;
	Probe: () => null;
} {
	let renders = 0;

	return {
		count: () => renders,
		reset: () => {
			renders = 0;
		},
		Probe: function Probe() {
			renders += 1;

			return null;
		},
	};
}

/**
 * Test-only helper for the render bench (browser mode). Wraps a subtree in
 * React's `<Profiler>` and counts how many commits the subtree performs; each
 * commit is one render pass of that subtree. `Probe` can't be mounted inside an
 * opaque component like `TimelineEditor`, so the bench measures commits of the
 * real component instead of instrumenting its internals. Reset before the
 * interaction under test and read `count()` after it settles.
 */
export function createRenderProfiler(): {
	count: () => number;
	reset: () => void;
	onRender: ProfilerOnRenderCallback;
	Profiler: (props: { children: ReactNode }) => ReactElement;
} {
	let commits = 0;

	const onRender: ProfilerOnRenderCallback = () => {
		commits += 1;
	};

	return {
		count: () => commits,
		reset: () => {
			commits = 0;
		},
		onRender,
		Profiler: function RenderProfiler({ children }: { children: ReactNode }) {
			return (
				<Profiler id="render-budget" onRender={onRender}>
					{children}
				</Profiler>
			);
		},
	};
}
