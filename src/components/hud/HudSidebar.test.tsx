import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { HudSidebar, type HudSidebarProps } from "./HudSidebar";

const t = ((key: string) => key) as HudSidebarProps["t"];

const baseProps: HudSidebarProps = {
	t,
	trayLayout: "horizontal",
	saving: false,
	recording: false,
	isLinuxHud: false,
	onOpenNotes: vi.fn(),
	onOpenStudio: vi.fn(),
	languageTriggerRef: createRef<HTMLButtonElement>(),
	activeLanguageLabel: "EN",
	isLanguageMenuOpen: false,
	onToggleLanguageMenu: vi.fn(),
	setLanguageMenuPanelEl: vi.fn(),
	languageMenuStyle: { right: 12, top: 12, maxHeight: 240 },
	availableLocales: ["en", "pt-BR"],
	locale: "en",
	getLocaleName: (l) => (l === "en" ? "English" : "Português"),
	onSelectLocale: vi.fn(),
	onLanguageMenuPointerEnter: vi.fn(),
	onLanguageMenuWheel: vi.fn(),
	onHideHud: vi.fn(),
	onCloseHud: vi.fn(),
};

describe("HudSidebar", () => {
	it("hides the notes button on Linux", () => {
		const { rerender } = render(<HudSidebar {...baseProps} isLinuxHud={false} />);
		expect(screen.getByTitle("tooltips.openNotes")).toBeInTheDocument();
		rerender(<HudSidebar {...baseProps} isLinuxHud={true} />);
		expect(screen.queryByTitle("tooltips.openNotes")).not.toBeInTheDocument();
	});

	it("only shows the studio button while not recording", () => {
		const { rerender } = render(<HudSidebar {...baseProps} recording={false} />);
		expect(screen.getByTestId("launch-open-studio-button")).toBeInTheDocument();
		rerender(<HudSidebar {...baseProps} recording={true} />);
		expect(screen.queryByTestId("launch-open-studio-button")).not.toBeInTheDocument();
	});

	it("opens the language menu and selects a locale", () => {
		const onSelect = vi.fn();
		render(<HudSidebar {...baseProps} isLanguageMenuOpen={true} onSelectLocale={onSelect} />);
		fireEvent.click(screen.getByText("Português"));
		expect(onSelect).toHaveBeenCalledWith("pt-BR");
	});

	it("wires hide and close", () => {
		const onHide = vi.fn();
		const onClose = vi.fn();
		render(<HudSidebar {...baseProps} onHideHud={onHide} onCloseHud={onClose} />);
		fireEvent.click(screen.getByTitle("tooltips.hideHUD"));
		fireEvent.click(screen.getByTitle("tooltips.closeApp"));
		expect(onHide).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
