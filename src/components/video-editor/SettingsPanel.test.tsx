import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SHORTCUTS } from "@/lib/shortcuts";
import { SettingsPanel } from "./SettingsPanel";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock("@/contexts/ShortcutsContext", () => ({
	useShortcuts: () => ({
		shortcuts: DEFAULT_SHORTCUTS,
		isMac: false,
		openConfig: vi.fn(),
	}),
}));

const baseProps = {
	selected: "wallpaper.png",
	onWallpaperChange: vi.fn(),
	aspectRatio: 16 / 9,
};

describe("SettingsPanel", () => {
	it("renders the background panel on the design layer", () => {
		const { container } = render(<SettingsPanel {...baseProps} />);
		expect(screen.getAllByText("settings.background.title").length).toBeGreaterThan(0);
		expect(container.querySelector("[class*='#34B27B']")).toBeNull();
	});

	it("exports through the brand-primary button", () => {
		const onExport = vi.fn();
		render(<SettingsPanel {...baseProps} exportFormat="mp4" onExport={onExport} />);
		fireEvent.click(screen.getByTestId("testId-export-panel-button"));
		const exportButton = screen.getByTestId("testId-export-button");
		expect(exportButton.className).toContain("bg-[#5E5CE6]");
		fireEvent.click(exportButton);
		expect(onExport).toHaveBeenCalled();
	});
});
