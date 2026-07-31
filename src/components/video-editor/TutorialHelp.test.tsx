import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TutorialHelp } from "./TutorialHelp";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

describe("TutorialHelp", () => {
	it("renders the trigger button with a Phosphor icon", () => {
		const { container } = render(<TutorialHelp />);
		const trigger = screen.getByRole("button", { name: /dialogs.tutorial.triggerLabel/ });
		expect(trigger).toBeInTheDocument();
		expect(container.querySelector("svg")).not.toBeNull();
		expect(container.querySelector("[class*='#34B27B']")).toBeNull();
	});

	it("opens the tutorial dialog with the explanatory content", async () => {
		const user = userEvent.setup();
		render(<TutorialHelp />);
		await user.click(screen.getByRole("button", { name: /dialogs.tutorial.triggerLabel/ }));
		expect(screen.getByText("dialogs.tutorial.title")).toBeInTheDocument();
		expect(screen.getByText("dialogs.tutorial.description")).toBeInTheDocument();
	});
});
