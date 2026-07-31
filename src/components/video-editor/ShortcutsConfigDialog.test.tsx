import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SHORTCUTS } from "@/lib/shortcuts";
import { ShortcutsConfigDialog } from "./ShortcutsConfigDialog";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock("@/contexts/ShortcutsContext", () => ({
	useShortcuts: () => ({
		shortcuts: DEFAULT_SHORTCUTS,
		isMac: false,
		setShortcuts: vi.fn(),
		persistShortcuts: vi.fn(async () => true),
		isConfigOpen: true,
		closeConfig: vi.fn(),
	}),
}));

describe("ShortcutsConfigDialog", () => {
	it("renders the shortcut list inside the dialog Glass surface", () => {
		render(<ShortcutsConfigDialog />);
		const title = screen.getByText("shortcuts.title");
		const glassSurface = title.closest("[data-iris-glass]");
		expect(glassSurface).not.toBeNull();
		expect(glassSurface).toHaveAttribute("data-iris-glass", "3");
	});

	it("uses brand-primary for the save action, not the legacy green", () => {
		render(<ShortcutsConfigDialog />);
		const saveButton = screen.getByText("common.actions.save").closest("button");
		expect(saveButton?.className).toContain("#5E5CE6");
		expect(saveButton?.className).not.toContain("#34B27B");
	});

	it("switches the capture chip to brand-primary while capturing", () => {
		render(<ShortcutsConfigDialog />);
		const chip = screen.getAllByTitle("shortcuts.clickToChange")[0];
		fireEvent.click(chip);
		expect(chip.className).toContain("#5E5CE6");
		expect(chip.className).toContain("bg-[#5E5CE6]/20");
		expect(chip.className).not.toContain("#34B27B");
	});
});
