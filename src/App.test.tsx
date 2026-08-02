import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const fonts = vi.hoisted(() => ({ loadAllCustomFonts: vi.fn() }));

vi.mock("@/lib/customFonts", () => ({
	loadAllCustomFonts: fonts.loadAllCustomFonts,
}));

vi.mock("@/i18n/loader", () => ({
	getAvailableLocales: () => ["en"],
	getLocaleName: () => "English",
}));

vi.mock("@/contexts/I18nContext", () => ({
	useI18n: () => ({ locale: "en" }),
	useScopedT: () => (key: string) => key,
}));

vi.mock("@/components/video-editor/VideoEditor", () => ({
	default: () => <div>VideoEditor</div>,
}));

vi.mock("@/components/video-editor/ShortcutsConfigDialog", () => ({
	ShortcutsConfigDialog: () => null,
}));

vi.mock("@/components/launch/SourceSelector", () => ({
	SourceSelector: () => <div>SourceSelector</div>,
}));

vi.mock("@/components/launch/CountdownOverlay", () => ({
	CountdownOverlay: () => null,
}));

vi.mock("@/components/launch/NotesWindow", () => ({
	NotesWindow: () => null,
}));

vi.mock("@/components/ui/sonner", () => ({
	Toaster: () => null,
}));

describe("App", () => {
	beforeEach(() => {
		fonts.loadAllCustomFonts.mockReset();
		fonts.loadAllCustomFonts.mockResolvedValue(undefined);
		window.electronAPI = {
			getShortcuts: vi.fn(async () => null),
			saveShortcuts: vi.fn(async () => {}),
			updateGlobalShortcut: vi.fn(async () => {}),
			getPlatform: vi.fn(async () => "linux"),
			setLocale: vi.fn(async () => {}),
		} as unknown as Window["electronAPI"];
	});

	afterEach(() => {
		window.history.replaceState(null, "", "/");
	});

	it("loads custom fonts only in the editor window", () => {
		window.history.replaceState(null, "", "/?windowType=editor");
		render(<App />);
		expect(fonts.loadAllCustomFonts).toHaveBeenCalledTimes(1);
	});

	it("does not load custom fonts in light windows", () => {
		window.history.replaceState(null, "", "/?windowType=source-selector");
		render(<App />);
		expect(fonts.loadAllCustomFonts).not.toHaveBeenCalled();
	});

	it("does not load custom fonts in the default window", () => {
		window.history.replaceState(null, "", "/");
		render(<App />);
		expect(fonts.loadAllCustomFonts).not.toHaveBeenCalled();
	});
});
