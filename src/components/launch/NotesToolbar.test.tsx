import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotesToolbar } from "./NotesToolbar";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: () => (key: string) => key,
}));

function renderToolbar() {
	return render(
		<TooltipProvider>
			<NotesToolbar editor={null} />
		</TooltipProvider>,
	);
}

describe("NotesToolbar", () => {
	it("renders its controls inside a Glass surface, not a raw background", () => {
		const { container } = renderToolbar();
		const glassSurface = container.querySelector("[data-iris-glass]");
		expect(glassSurface).not.toBeNull();
		expect(glassSurface).toHaveAttribute("data-iris-glass", "2");
	});

	it("renders every formatting control with a real icon", () => {
		renderToolbar();
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBeGreaterThan(0);
		for (const button of buttons) {
			expect(button.querySelector("svg")).not.toBeNull();
		}
	});
});
