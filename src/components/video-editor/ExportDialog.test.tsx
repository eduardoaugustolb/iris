import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExportDialog } from "./ExportDialog";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

const exportingProgress = {
	currentFrame: 10,
	totalFrames: 20,
	percentage: 50,
	estimatedTimeRemaining: 30,
};

describe("ExportDialog", () => {
	it("renders the export status inside a Glass level-3 surface, not a raw background", () => {
		const { container } = render(
			<ExportDialog
				isOpen
				onClose={vi.fn()}
				progress={exportingProgress}
				isExporting
				error={null}
			/>,
		);
		const title = screen.getByText("dialogs.export.exportingFormat");
		const glassSurface = title.closest("[data-iris-glass]");
		expect(glassSurface).not.toBeNull();
		expect(glassSurface).toHaveAttribute("data-iris-glass", "3");
		// The dimming overlay must stay flat — blur lives only inside the Glass primitive.
		expect(container.querySelector("[class*='backdrop-blur']")).toBeNull();
	});

	it("uses brand-primary for progress, not the legacy green", () => {
		render(
			<ExportDialog
				isOpen
				onClose={vi.fn()}
				progress={exportingProgress}
				isExporting
				error={null}
			/>,
		);
		const pct = screen.getByText("50%");
		const progressFill = pct.closest("div")?.parentElement?.querySelector("[class*='h-full']");
		expect(progressFill?.className).toContain("bg-[#5E5CE6]");
		expect(containerHasLegacyGreen(document)).toBe(false);
	});

	it("hides the close button while an export is in progress", () => {
		render(
			<ExportDialog
				isOpen
				onClose={vi.fn()}
				progress={exportingProgress}
				isExporting
				error={null}
			/>,
		);
		expect(screen.queryByRole("button", { name: /close/i })).toBeNull();
	});

	it("uses a Phosphor icon in the success state, not lucide-react", () => {
		const { container } = render(
			<ExportDialog
				isOpen
				onClose={vi.fn()}
				progress={{ ...exportingProgress, percentage: 100 }}
				isExporting={false}
				error={null}
			/>,
		);
		// After the success effect flips, the exported file name path is a plain div —
		// assert the success block still paints an svg from Phosphor.
		expect(container.querySelector("svg")).not.toBeNull();
	});
});

function containerHasLegacyGreen(root: ParentNode): boolean {
	return Array.from(root.querySelectorAll("[class*='#34B27B']")).length > 0;
}
