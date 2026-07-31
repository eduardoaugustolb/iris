import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnnotationSettingsPanel } from "./AnnotationSettingsPanel";
import {
	type AnnotationRegion,
	DEFAULT_ANNOTATION_POSITION,
	DEFAULT_ANNOTATION_SIZE,
	DEFAULT_ANNOTATION_STYLE,
} from "./types";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

const annotation: AnnotationRegion = {
	id: "note-1",
	startMs: 0,
	endMs: 5000,
	type: "text",
	content: "Hello",
	position: DEFAULT_ANNOTATION_POSITION,
	size: DEFAULT_ANNOTATION_SIZE,
	style: DEFAULT_ANNOTATION_STYLE,
	zIndex: 1,
};

describe("AnnotationSettingsPanel", () => {
	it("renders the text editor and style controls on the design layer", () => {
		const { container } = render(
			<AnnotationSettingsPanel
				annotation={annotation}
				onContentChange={vi.fn()}
				onTypeChange={vi.fn()}
				onStyleChange={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		expect(screen.getByDisplayValue("Hello")).toBeInTheDocument();
		expect(container.querySelector("svg")).not.toBeNull();
		expect(container.querySelector("[class*='#34B27B']")).toBeNull();
	});

	it("publishes text edits through onContentChange", () => {
		const onContentChange = vi.fn();
		render(
			<AnnotationSettingsPanel
				annotation={annotation}
				onContentChange={onContentChange}
				onTypeChange={vi.fn()}
				onStyleChange={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		screen.getByRole("textbox").click();
		fireEvent.change(screen.getByRole("textbox"), { target: { value: "Edited" } });
		expect(onContentChange).toHaveBeenCalledWith("Edited");
	});
});
