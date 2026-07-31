import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormatSelector } from "./FormatSelector";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

describe("FormatSelector", () => {
	it("renders MP4 and GIF options with Phosphor icons", () => {
		const { container } = render(<FormatSelector selectedFormat="mp4" onFormatChange={vi.fn()} />);
		expect(screen.getAllByRole("button")).toHaveLength(2);
		expect(container.querySelectorAll("svg")).toHaveLength(2);
	});

	it("highlights the selected format with the brand primary, not the legacy green", () => {
		const { container } = render(<FormatSelector selectedFormat="gif" onFormatChange={vi.fn()} />);
		expect(container.querySelector("[class*='bg-[#5E5CE6]']")).not.toBeNull();
		expect(container.querySelector("[class*='#34B27B']")).toBeNull();
	});

	it("calls onFormatChange when clicking the other option", () => {
		const onChange = vi.fn();
		render(<FormatSelector selectedFormat="mp4" onFormatChange={onChange} />);
		screen.getAllByRole("button")[1].click();
		expect(onChange).toHaveBeenCalledWith("gif");
	});

	it("disables the options when disabled is set", () => {
		render(<FormatSelector selectedFormat="mp4" onFormatChange={vi.fn()} disabled />);
		for (const button of screen.getAllByRole("button")) {
			expect(button).toBeDisabled();
		}
	});
});
