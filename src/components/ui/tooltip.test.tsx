import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip, TooltipProvider } from "./tooltip";

describe("TooltipContent", () => {
	it("renders its content inside a Glass surface at level 3 with the sm radius", async () => {
		render(
			<TooltipProvider>
				<Tooltip content="Hint text">
					<button>Target</button>
				</Tooltip>
			</TooltipProvider>,
		);
		// Focus opens the tooltip after the provider's delay.
		screen.getByRole("button", { name: "Target" }).focus();

		// Radix also renders a visually-hidden aria clone of the content for screen
		// readers — assert against the visible [data-slot="tooltip-content"] node.
		const content = (await screen.findAllByText("Hint text"))[0].closest(
			'[data-slot="tooltip-content"]',
		) as HTMLElement;
		expect(content).not.toBeNull();

		const glassSurface = content.querySelector("[data-iris-glass]") as HTMLElement;
		expect(glassSurface).not.toBeNull();
		expect(glassSurface).toHaveAttribute("data-iris-glass", "3");
		// Tooltips are small transient chips — sm radius, not the lg default.
		expect(glassSurface.style.borderRadius).toBe("8px");
	});
});
