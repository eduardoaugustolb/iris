/**
 * Test-only helper. Mount `Probe` inside the subtree under test and assert on
 * `count()` to pin down how often that subtree re-renders. Used by the render
 * budgets: the playback path is meant to reach zero React renders per frame.
 */
export function createRenderCounter() {
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
