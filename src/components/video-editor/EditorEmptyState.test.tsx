import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorEmptyState } from "./EditorEmptyState";

vi.mock("@/contexts/I18nContext", () => ({
	useScopedT: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

const originalElectronAPI = window.electronAPI;

afterEach(() => {
	vi.restoreAllMocks();
	Object.defineProperty(window, "electronAPI", { value: originalElectronAPI, configurable: true });
});

function mockElectronAPI(overrides: Partial<typeof window.electronAPI> = {}) {
	Object.defineProperty(window, "electronAPI", {
		configurable: true,
		value: {
			openVideoFilePicker: vi.fn(async () => ({ canceled: true })),
			getPathForFile: vi.fn(() => ""),
			loadProjectFileFromPath: vi.fn(async () => ({ success: false })),
			...overrides,
		},
	});
}

vi.mock("@/native", () => ({
	nativeBridgeClient: {
		project: {
			setCurrentVideoPath: vi.fn(async () => ({ success: true })),
			loadProjectFile: vi.fn(async () => ({ canceled: true })),
		},
	},
}));

describe("EditorEmptyState", () => {
	it("renders the import-video and load-project actions", () => {
		mockElectronAPI();
		render(<EditorEmptyState onVideoImported={vi.fn()} onProjectOpened={vi.fn()} />);
		expect(screen.getByText("editor.emptyState.importVideoButton")).toBeInTheDocument();
		expect(screen.getByText("editor.emptyState.loadProjectButton")).toBeInTheDocument();
	});

	it("calls onVideoImported after a successful file pick", async () => {
		const onVideoImported = vi.fn();
		mockElectronAPI({
			openVideoFilePicker: vi.fn(async () => ({
				canceled: false,
				success: true,
				path: "/tmp/video.mp4",
			})),
		});
		render(<EditorEmptyState onVideoImported={onVideoImported} onProjectOpened={vi.fn()} />);

		fireEvent.click(screen.getByText("editor.emptyState.importVideoButton"));

		await vi.waitFor(() => expect(onVideoImported).toHaveBeenCalledWith("/tmp/video.mp4"));
	});

	it("shows the unsupported-format error dialog when a non-.iris file is dropped", () => {
		mockElectronAPI();
		render(<EditorEmptyState onVideoImported={vi.fn()} onProjectOpened={vi.fn()} />);

		const dropZone = screen.getByText("editor.emptyState.title").closest("div[class*='h-full']");
		expect(dropZone).not.toBeNull();

		const file = new File(["data"], "not-a-project.txt", { type: "text/plain" });
		fireEvent.drop(dropZone as Element, { dataTransfer: { files: [file] } });

		expect(
			screen.getByText("editor.emptyState.dropErrors.unsupportedFormatTitle"),
		).toBeInTheDocument();
	});

	it("uses the brand-primary colour for the primary action, not the legacy green", () => {
		mockElectronAPI();
		render(<EditorEmptyState onVideoImported={vi.fn()} onProjectOpened={vi.fn()} />);
		const importButton = screen.getByText("editor.emptyState.importVideoButton").closest("button");
		expect(importButton?.className).toContain("#5E5CE6");
		expect(importButton?.className).not.toContain("#34B27B");
	});
});
