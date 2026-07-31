import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

describe("UnsavedChangesDialog", () => {
	const baseProps = {
		isOpen: true,
		onSaveAndClose: vi.fn(),
		onDiscardAndClose: vi.fn(),
		onCancel: vi.fn(),
	};

	it("renders inside the dialog Glass surface", () => {
		render(<UnsavedChangesDialog {...baseProps} />);
		const title = screen.getByText("dialogs.unsavedChanges.title");
		const glassSurface = title.closest("[data-iris-glass]");
		expect(glassSurface).not.toBeNull();
		expect(glassSurface).toHaveAttribute("data-iris-glass", "3");
	});

	it("uses brand-primary for the save action, not the legacy green", () => {
		render(<UnsavedChangesDialog {...baseProps} />);
		const saveButton = screen.getByText("dialogs.unsavedChanges.saveAndClose").closest("button");
		expect(saveButton?.className).toContain("#5E5CE6");
		expect(saveButton?.className).not.toContain("#34B27B");
		// Save action carries a Phosphor icon.
		expect(saveButton?.querySelector("svg")).not.toBeNull();
	});

	it("renders the discard action in the destructive token", () => {
		render(<UnsavedChangesDialog {...baseProps} />);
		const discardButton = screen
			.getByText("dialogs.unsavedChanges.discardAndClose")
			.closest("button");
		expect(discardButton?.className).toContain("#FF453A");
	});
});
