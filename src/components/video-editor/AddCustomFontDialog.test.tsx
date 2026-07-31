import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddCustomFontDialog } from "./AddCustomFontDialog";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

describe("AddCustomFontDialog", () => {
	it("uses brand-primary for the add action, not a blue utility colour", () => {
		render(<AddCustomFontDialog onFontAdded={vi.fn()} />);
		fireEvent.click(screen.getByText("settings.customFont.dialogTitle"));
		const addButton = screen.getByText("settings.customFont.addButton").closest("button");
		expect(addButton?.className).toContain("#5E5CE6");
		expect(addButton?.className).not.toContain("blue-600");
		expect(addButton?.className).not.toContain("#34B27B");
	});

	it("renders the form fields on the migrated Input/Label tokens", () => {
		render(<AddCustomFontDialog onFontAdded={vi.fn()} />);
		fireEvent.click(screen.getByText("settings.customFont.dialogTitle"));
		const urlInput = screen.getByPlaceholderText("settings.customFont.urlPlaceholder");
		expect(urlInput.className).toContain("bg-[#141416]");
		expect(urlInput.className).not.toContain("slate");
		// Helper text uses the text-secondary token.
		const help = screen.getByText("settings.customFont.urlHelp");
		expect(help.className).toContain("text-[var(--text-secondary)]");
	});
});
