import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import styles from "@/components/launch/LaunchWindow.module.css";
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

	it("keeps the panel's layout box and passes the dynamic max-height to the scrolling element", () => {
		render(
			<HudSidebar
				{...baseProps}
				isLanguageMenuOpen={true}
				languageMenuStyle={{ right: 12, top: 12, maxHeight: 240 }}
			/>,
		);
		const menu = screen.getByRole("menu");
		const panel = menu.parentElement as HTMLElement;
		// The outer wrapper still carries `.languageMenuPanel` (width/padding/box-sizing).
		expect(panel.className).toBe(styles.languageMenuPanel);
		// The dynamic max-height is threaded through as a CSS custom property so it can
		// override `.languageMenuScroll`'s hardcoded fallback on the actual scrolling node.
		expect(panel.style.getPropertyValue("--language-menu-max-height")).toBe("240px");
		expect(menu.className).toContain(styles.languageMenuScroll);
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

	it("carries electronNoDrag on the hide and close buttons so the drag region can't swallow their clicks", () => {
		render(<HudSidebar {...baseProps} />);
		// The whole HUD tree sits inside HudOverlay's `-webkit-app-region: drag`
		// root; without the opt-out Chromium treats these as native window-drag
		// gestures and the click never reaches React.
		expect(screen.getByTitle("tooltips.hideHUD").className).toContain(styles.electronNoDrag);
		expect(screen.getByTitle("tooltips.closeApp").className).toContain(styles.electronNoDrag);
	});

	it("highlights the active locale's menu item, not just its checkmark", () => {
		render(<HudSidebar {...baseProps} isLanguageMenuOpen={true} locale="pt-BR" />);

		const active = screen.getByText("Português").closest("button") as HTMLElement;
		const inactive = screen.getByText("English").closest("button") as HTMLElement;
		expect(active.className).toContain(styles.languageMenuItemActive);
		expect(inactive.className).not.toContain(styles.languageMenuItemActive);
		expect(inactive.className).toContain(styles.languageMenuItem);
	});
});
