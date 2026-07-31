import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { BlurSettingsPanel } from "./BlurSettingsPanel";
import {
	type AnnotationRegion,
	DEFAULT_ANNOTATION_POSITION,
	DEFAULT_ANNOTATION_SIZE,
	DEFAULT_ANNOTATION_STYLE,
	DEFAULT_BLUR_DATA,
} from "./types";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

beforeAll(() => {
	class ResizeObserverStub {
		observe() {
			/* jsdom lacks ResizeObserver */
		}
		unobserve() {
			/* jsdom lacks ResizeObserver */
		}
		disconnect() {
			/* jsdom lacks ResizeObserver */
		}
	}
	globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
});

const blurRegion: AnnotationRegion = {
	id: "blur-1",
	startMs: 0,
	endMs: 5000,
	type: "blur",
	content: "",
	position: DEFAULT_ANNOTATION_POSITION,
	size: DEFAULT_ANNOTATION_SIZE,
	style: DEFAULT_ANNOTATION_STYLE,
	zIndex: 1,
	blurData: DEFAULT_BLUR_DATA,
};

describe("BlurSettingsPanel", () => {
	it("renders the shape and color options with the active one in brand primary", () => {
		const { container } = render(
			<BlurSettingsPanel blurRegion={blurRegion} onBlurDataChange={vi.fn()} onDelete={vi.fn()} />,
		);
		expect(screen.getByText("settings.annotation.typeBlur")).toBeInTheDocument();
		expect(container.querySelector("[class*='bg-[#5E5CE6]']")).not.toBeNull();
		expect(container.querySelector("[class*='#34B27B']")).toBeNull();
	});

	it("switches the blur shape and commits the change", () => {
		const onBlurDataChange = vi.fn();
		render(
			<BlurSettingsPanel
				blurRegion={blurRegion}
				onBlurDataChange={onBlurDataChange}
				onDelete={vi.fn()}
			/>,
		);
		const ovalButton = screen.getByRole("button", { name: "settings.annotation.blurShapeOval" });
		ovalButton.click();
		expect(onBlurDataChange).toHaveBeenCalledWith(expect.objectContaining({ shape: "oval" }));
	});

	it("deletes the annotation through the destructive button", () => {
		const onDelete = vi.fn();
		const { container } = render(
			<BlurSettingsPanel blurRegion={blurRegion} onBlurDataChange={vi.fn()} onDelete={onDelete} />,
		);
		screen.getByRole("button", { name: "settings.annotation.deleteAnnotation" }).click();
		expect(onDelete).toHaveBeenCalled();
		expect(container.querySelector("[class*='red-500']")).toBeNull();
	});
});
