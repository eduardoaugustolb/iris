import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SHORTCUTS } from "@/lib/shortcuts";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";

const openConfig = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock("@/contexts/ShortcutsContext", () => ({
	useShortcuts: () => ({
		shortcuts: DEFAULT_SHORTCUTS,
		isMac: false,
		openConfig,
	}),
}));

describe("KeyboardShortcutsHelp", () => {
	it("renders the popover on a Glass level-3 surface", () => {
		const { container } = render(<KeyboardShortcutsHelp />);
		const glass = container.querySelector("[data-iris-glass='3']");
		expect(glass).not.toBeNull();
	});

	it("lists shortcut bindings inside kbd chips on the design layer", () => {
		const { container } = render(<KeyboardShortcutsHelp />);
		expect(container.querySelectorAll("kbd")).not.toHaveLength(0);
		expect(container.querySelector("[class*='#34B27B']")).toBeNull();
	});

	it("opens the shortcuts configurator from the customize action", () => {
		render(<KeyboardShortcutsHelp />);
		screen.getByRole("button", { name: "shortcuts.customize" }).click();
		expect(openConfig).toHaveBeenCalled();
	});
});
