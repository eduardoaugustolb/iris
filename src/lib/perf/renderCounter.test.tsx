import { act, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { createRenderCounter } from "./renderCounter";

describe("createRenderCounter", () => {
	it("counts the initial render", () => {
		const counter = createRenderCounter();

		render(<counter.Probe />);

		expect(counter.count()).toBe(1);
	});

	it("counts a re-render caused by a parent state change", () => {
		const counter = createRenderCounter();
		let setValue: (value: number) => void = () => {};

		function Parent() {
			const [value, set] = useState(0);
			setValue = set;

			return (
				<div data-value={value}>
					<counter.Probe />
				</div>
			);
		}

		render(<Parent />);
		expect(counter.count()).toBe(1);

		act(() => setValue(1));
		expect(counter.count()).toBe(2);
	});

	it("resets back to zero", () => {
		const counter = createRenderCounter();

		render(<counter.Probe />);
		counter.reset();

		expect(counter.count()).toBe(0);
	});
});
