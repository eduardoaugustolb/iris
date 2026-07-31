import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { Slider } from "./slider";

describe("Slider", () => {
	beforeAll(() => {
		// Radix Slider measures its track with ResizeObserver, which jsdom lacks.
		class ResizeObserverStub {
			observe() {
				/* jsdom lacks ResizeObserver */
			}
			unobserve() {
				/* jsdom lacks ResizeObserver */
			}
			disconnect() {
				/* jsdom lacks ResizeObserver */
			}
		}
		globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
	});
	it("paints the filled range and thumb with the brand token, not the legacy green", () => {
		const { container } = render(
			<Slider defaultValue={[50]} max={100} step={1} aria-label="volume" />,
		);
		const thumb = container.querySelector("[role=slider]");
		expect(thumb).not.toBeNull();
		expect(thumb?.className).toContain("border-[#5E5CE6]");
		expect(thumb?.className).toContain("bg-[#5E5CE6]");
		expect(thumb?.className).not.toContain("#34B27B");

		// The filled range shares the same brand token.
		const range = container.querySelector(".bg-\\[\\#5E5CE6\\]");
		expect(range).not.toBeNull();
	});

	it("lays the track on the translucent white surface token", () => {
		const { container } = render(
			<Slider defaultValue={[50]} max={100} step={1} aria-label="volume" />,
		);
		const track = container.querySelector(".bg-white\\/10");
		expect(track).not.toBeNull();
	});
});
