import "@testing-library/jest-dom";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HudSidebar } from "../hud/HudSidebar";
import { SourceAudioControls } from "../hud/SourceAudioControls";
import { TooltipProvider } from "../ui/tooltip";
import { LaunchWindow } from "./LaunchWindow";

type SelectedSourceChangedListener = Parameters<
	Window["electronAPI"]["onSelectedSourceChanged"]
>[0];

const platformState = vi.hoisted(() => ({ value: "darwin" }));
const resizeCallbacks = vi.hoisted(() => [] as Array<ResizeObserverCallback>);

class StubResizeObserver {
	observe() {
		return undefined;
	}
	unobserve() {
		return undefined;
	}
	disconnect() {
		return undefined;
	}
}

class CapturingResizeObserver extends StubResizeObserver {
	constructor(callback: ResizeObserverCallback) {
		super();
		resizeCallbacks.push(callback);
	}
}

const recorderState = vi.hoisted(() => ({
	value: {
		recording: false,
		paused: false,
		saving: false,
		elapsedSeconds: 0,
		toggleRecording: vi.fn(),
		togglePaused: vi.fn(),
		canPauseRecording: false,
		restartRecording: vi.fn(),
		cancelRecording: vi.fn(),
		microphoneEnabled: false,
		setMicrophoneEnabled: vi.fn(),
		microphoneDeviceId: undefined,
		setMicrophoneDeviceId: vi.fn(),
		setMicrophoneDeviceName: vi.fn(),
		webcamEnabled: false,
		setWebcamEnabled: vi.fn(async () => true),
		webcamDeviceId: undefined,
		setWebcamDeviceId: vi.fn(),
		setWebcamDeviceName: vi.fn(),
		systemAudioEnabled: false,
		setSystemAudioEnabled: vi.fn(),
		cursorCaptureMode: "editable-overlay",
		setCursorCaptureMode: vi.fn(),
		softwareEncoderFallbackNoticeVisible: false,
		dismissSoftwareEncoderFallbackNotice: vi.fn(),
	},
}));

let selectedSourceChangedListeners: SelectedSourceChangedListener[] = [];
let sourceSelectorClosedListeners: Array<() => void> = [];

const recorderSubscribers = vi.hoisted(() => new Set<() => void>());

// A real subscribable mock, not a constant: the render-budget test needs to
// change one recorder field (elapsedSeconds) and have LaunchWindow re-render
// exactly the way the real hook's state update would, without touching any
// other prop.
vi.mock("../../hooks/useScreenRecorder", async () => {
	const { useEffect, useReducer } = await vi.importActual<typeof import("react")>("react");
	return {
		useScreenRecorder: () => {
			const [, forceRender] = useReducer((n: number) => n + 1, 0);
			useEffect(() => {
				recorderSubscribers.add(forceRender);
				return () => {
					recorderSubscribers.delete(forceRender);
				};
			}, []);
			return recorderState.value;
		},
	};
});

function setRecorderState(patch: Partial<(typeof recorderState)["value"]>) {
	recorderState.value = { ...recorderState.value, ...patch };
	act(() => {
		for (const notify of recorderSubscribers) notify();
	});
}

vi.mock("../../hooks/useMicrophoneDevices", () => ({
	useMicrophoneDevices: () => ({
		devices: [],
		selectedDeviceId: "default",
		setSelectedDeviceId: vi.fn(),
	}),
}));

vi.mock("../../hooks/useCameraDevices", () => ({
	useCameraDevices: () => ({
		devices: [],
		selectedDeviceId: "",
		setSelectedDeviceId: vi.fn(),
		isLoading: false,
		error: null,
	}),
}));

vi.mock("../../hooks/useAudioLevelMeter", () => ({
	useAudioLevelMeter: () => ({ level: 0 }),
}));

vi.mock("../../lib/requestCameraAccess", () => ({
	requestCameraAccess: vi.fn(async () => ({ success: true, granted: true, status: "granted" })),
}));

vi.mock("@/native", () => ({
	nativeBridgeClient: {
		system: {
			getPlatform: vi.fn(async () => platformState.value),
		},
		cursor: {
			getCapabilities: vi.fn(async () => ({
				telemetry: true,
				systemAssets: false,
				provider: "none",
			})),
		},
	},
}));

const i18nState = vi.hoisted(() => ({
	value: {
		locale: "en",
		setLocale: vi.fn(),
		systemLocaleSuggestion: null as string | null,
		acceptSystemLocaleSuggestion: vi.fn(),
		dismissSystemLocaleSuggestion: vi.fn(),
		resolveSystemLocaleSuggestion: vi.fn(),
	},
}));

vi.mock("@/i18n/loader", () => ({
	getAvailableLocales: () => ["en"],
	getLocaleName: () => "English",
}));

vi.mock("@/contexts/I18nContext", () => {
	// The real useScopedT is a useCallback, i.e. referentially stable for a given
	// locale. The mock must be too, or `t` alone invalidates every memoised
	// child on every render and the render-budget test measures nothing.
	const scopedT = (key: string) => {
		const translations: Record<string, string> = {
			"sourceSelector.defaultSourceName": "Screen",
			"recording.selectSource": "Please select a source to record",
			"tooltips.useVerticalTray": "Use vertical tray",
			"tooltips.useHorizontalTray": "Use horizontal tray",
			"audio.enableSystemAudio": "Enable system audio",
			"audio.disableSystemAudio": "Disable system audio",
			"audio.enableMicrophone": "Enable microphone",
			"audio.disableMicrophone": "Disable microphone",
			"audio.defaultMicrophone": "Default Microphone",
			"webcam.enableWebcam": "Enable webcam",
			"webcam.disableWebcam": "Disable webcam",
			"webcam.defaultCamera": "Default Camera",
			"webcam.searching": "Searching...",
			"webcam.noneFound": "No camera found",
			"webcam.unavailable": "Camera unavailable",
			"cursor.useEditableCursor": "Use editable cursor",
			"cursor.useSystemCursor": "Use system cursor",
			"tooltips.openStudio": "Open Studio",
			"tooltips.hideHUD": "Hide HUD",
			"tooltips.closeApp": "Close App",
			language: "Language",
			"systemLanguagePrompt.title": "Use your system language?",
			"systemLanguagePrompt.description":
				"We detected English as your system language. Do you want to switch Íris to English?",
			"systemLanguagePrompt.keepDefault": "Keep current language",
			"systemLanguagePrompt.switch": "Switch to English",
			"softwareEncoderFallback.title": "Switched to software encoding",
			"softwareEncoderFallback.description":
				"The default GPU encoder failed to start, so Íris fell back to software H.264 encoding. Recording should continue as normal, but CPU usage may be higher.",
			"softwareEncoderFallback.dismiss": "Got it",
			"softwareEncoderFallback.dontShowAgain": "Don't show again",
		};
		return translations[key] ?? key;
	};
	return {
		useI18n: () => i18nState.value,
		useScopedT: () => scopedT,
	};
});

function renderLaunchWindow() {
	return render(
		<TooltipProvider>
			<LaunchWindow />
		</TooltipProvider>,
	);
}

function stubElectronAPI(getSelectedSource: Window["electronAPI"]["getSelectedSource"]) {
	window.electronAPI = {
		...window.electronAPI,
		getSelectedSource,
		openSourceSelector: vi.fn(async () => ({ opened: true })),
		requestScreenAccess: vi.fn(async () => ({
			success: true,
			granted: true,
			status: "granted",
		})),
		getPlatform: vi.fn(async () => "darwin"),
		setHudOverlaySize: vi.fn(),
		setHudOverlayIgnoreMouseEvents: vi.fn(),
		hudOverlayHide: vi.fn(),
		hudOverlayClose: vi.fn(),
		switchToEditor: vi.fn(async () => undefined),
		onSelectedSourceChanged: vi.fn((callback) => {
			selectedSourceChangedListeners.push(callback);
			return () => {
				selectedSourceChangedListeners = selectedSourceChangedListeners.filter(
					(listener) => listener !== callback,
				);
			};
		}),
		onSourceSelectorClosed: vi.fn((callback) => {
			sourceSelectorClosedListeners.push(callback);
			return () => {
				sourceSelectorClosedListeners = sourceSelectorClosedListeners.filter(
					(listener) => listener !== callback,
				);
			};
		}),
	} as typeof window.electronAPI;
}

const displayOneSource = {
	id: "screen:1:0",
	name: "Display 1",
	display_id: "1",
	thumbnail: null,
	appIcon: null,
} satisfies ProcessedDesktopSource;

async function waitForSourceSelectionSubscription() {
	await waitFor(() => {
		expect(selectedSourceChangedListeners.length).toBeGreaterThan(0);
	});
}

function emitSelectedSourceChanged(source: ProcessedDesktopSource) {
	act(() => {
		selectedSourceChangedListeners.forEach((listener) => listener(source));
	});
}

function emitSourceSelectorClosed() {
	act(() => {
		sourceSelectorClosedListeners.forEach((listener) => listener());
	});
}

function resetLaunchMocks() {
	vi.stubGlobal("ResizeObserver", StubResizeObserver);
	// setRecorderState() swaps the whole object, so restore the fields it may have changed.
	recorderState.value.recording = false;
	recorderState.value.elapsedSeconds = 0;
	recorderState.value.toggleRecording.mockClear();
	recorderState.value.softwareEncoderFallbackNoticeVisible = false;
	recorderState.value.dismissSoftwareEncoderFallbackNotice.mockClear();
	selectedSourceChangedListeners = [];
	sourceSelectorClosedListeners = [];
	i18nState.value.systemLocaleSuggestion = null;
	i18nState.value.acceptSystemLocaleSuggestion.mockClear();
	i18nState.value.dismissSystemLocaleSuggestion.mockClear();
	i18nState.value.resolveSystemLocaleSuggestion.mockClear();
	stubElectronAPI(vi.fn(async () => null));
}

describe("LaunchWindow record button", () => {
	beforeEach(() => {
		platformState.value = "darwin";
		resetLaunchMocks();
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("opens the source selector instead of disabling the primary action when no source is selected", async () => {
		renderLaunchWindow();

		const recordButton = await screen.findByTestId("launch-record-button");

		expect(recordButton).toBeEnabled();
		expect(recordButton).toHaveAttribute("title", "Please select a source to record");

		fireEvent.click(recordButton);

		await waitFor(() => {
			expect(window.electronAPI.openSourceSelector).toHaveBeenCalledTimes(1);
		});
		expect(recorderState.value.toggleRecording).not.toHaveBeenCalled();
	});

	it("records immediately after source selection when the record button opened the picker", async () => {
		renderLaunchWindow();
		await waitForSourceSelectionSubscription();

		fireEvent.click(await screen.findByTestId("launch-record-button"));
		emitSelectedSourceChanged(displayOneSource);

		await waitFor(() => {
			expect(recorderState.value.toggleRecording).toHaveBeenCalledTimes(1);
		});
		expect(screen.getByTestId("launch-record-button")).toHaveAttribute("title", "Display 1");
	});

	it("does not record after manual source selection", async () => {
		renderLaunchWindow();
		await waitForSourceSelectionSubscription();

		emitSelectedSourceChanged(displayOneSource);

		await waitFor(() => {
			expect(screen.getByTestId("launch-record-button")).toHaveAttribute("title", "Display 1");
		});
		expect(recorderState.value.toggleRecording).not.toHaveBeenCalled();
	});

	it("clears record-after-selection intent when the source picker closes without a selection", async () => {
		renderLaunchWindow();
		await waitForSourceSelectionSubscription();

		fireEvent.click(await screen.findByTestId("launch-record-button"));
		emitSourceSelectorClosed();
		emitSelectedSourceChanged(displayOneSource);

		await waitFor(() => {
			expect(screen.getByTestId("launch-record-button")).toHaveAttribute("title", "Display 1");
		});
		expect(recorderState.value.toggleRecording).not.toHaveBeenCalled();
	});

	it("clears record-after-selection intent when opening the source picker fails", async () => {
		window.electronAPI.openSourceSelector = vi.fn(async () => {
			throw new Error("source selector failed");
		});

		renderLaunchWindow();
		await waitForSourceSelectionSubscription();

		fireEvent.click(await screen.findByTestId("launch-record-button"));

		await waitFor(() => {
			expect(window.electronAPI.openSourceSelector).toHaveBeenCalledTimes(1);
		});

		await act(async () => {
			await Promise.resolve();
		});

		emitSelectedSourceChanged(displayOneSource);

		await waitFor(() => {
			expect(screen.getByTestId("launch-record-button")).toHaveAttribute("title", "Display 1");
		});
		expect(recorderState.value.toggleRecording).not.toHaveBeenCalled();
	});

	it("handles selected source polling failures", async () => {
		const error = new Error("selected source unavailable");
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		stubElectronAPI(
			vi.fn(async () => {
				throw error;
			}),
		);

		renderLaunchWindow();

		await waitFor(() => {
			expect(warnSpy).toHaveBeenCalledWith("Failed to refresh selected source:", error);
		});

		warnSpy.mockRestore();
	});

	it("starts recording when a source is already selected", async () => {
		stubElectronAPI(vi.fn(async () => displayOneSource));

		renderLaunchWindow();

		const recordButton = await screen.findByTestId("launch-record-button");
		await waitFor(() => {
			expect(recordButton).toHaveAttribute("title", "Display 1");
		});

		fireEvent.click(recordButton);

		expect(recorderState.value.toggleRecording).toHaveBeenCalledTimes(1);
		expect(window.electronAPI.openSourceSelector).not.toHaveBeenCalled();
	});

	it("keeps the HUD interactive on Linux so the drag handle can receive pointer events", async () => {
		platformState.value = "linux";

		renderLaunchWindow();

		await waitFor(() => {
			expect(window.electronAPI.setHudOverlayIgnoreMouseEvents).toHaveBeenLastCalledWith(false);
		});
	});
});

describe("LaunchWindow system language prompt", () => {
	beforeEach(() => {
		platformState.value = "darwin";
		resetLaunchMocks();
		resizeCallbacks.length = 0;
		vi.stubGlobal("ResizeObserver", CapturingResizeObserver);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("grows the HUD overlay tall enough to fit the prompt so its buttons stay clickable", async () => {
		i18nState.value.systemLocaleSuggestion = "zh-CN";

		renderLaunchWindow();

		const prompt = await screen.findByText("Use your system language?");
		expect(prompt).toBeInTheDocument();

		// jsdom reports zero layout, so stub both the bar and the prompt to mimic a real HUD.
		const viewportHeight = 800;
		const barHeight = 56;
		const bottomMargin = 20;
		const barBottom = viewportHeight - bottomMargin;
		const bar = prompt.parentElement?.parentElement?.querySelector(
			"[data-tray-layout]",
		) as HTMLElement | null;
		if (bar) {
			vi.spyOn(bar, "getBoundingClientRect").mockReturnValue({
				top: barBottom - barHeight,
				left: 200,
				right: 600,
				bottom: barBottom,
				width: 400,
				height: barHeight,
				x: 200,
				y: barBottom - barHeight,
				toJSON: () => ({}),
			});
			Object.defineProperty(bar, "scrollHeight", { value: barHeight, configurable: true });
			Object.defineProperty(bar, "scrollWidth", { value: 400, configurable: true });
		}

		const promptBox = { width: 480, height: 130 };
		const promptPanel = prompt.parentElement as HTMLElement;
		vi.spyOn(promptPanel, "getBoundingClientRect").mockReturnValue({
			top: 32,
			left: 60,
			right: 60 + promptBox.width,
			bottom: 32 + promptBox.height,
			width: promptBox.width,
			height: promptBox.height,
			x: 60,
			y: 32,
			toJSON: () => ({}),
		});

		// Fire any observers attached during render so the spied rect is actually consumed.
		await act(async () => {
			for (const callback of resizeCallbacks) {
				callback([], {} as ResizeObserver);
			}
		});

		await waitFor(() => {
			expect(window.electronAPI.setHudOverlaySize).toHaveBeenCalled();
		});

		const sizeMock = window.electronAPI.setHudOverlaySize as unknown as {
			mock: { calls: Array<[number, number]> };
		};
		const [, height] = sizeMock.mock.calls[sizeMock.mock.calls.length - 1];
		// Must at least cover the prompt plus the TOP_MARGIN slack (24).
		expect(height).toBeGreaterThanOrEqual(32 + promptBox.height + 24);
		// And must be less than the full viewport — guards against regressions that always
		// grow to the full viewport because of a missed bottom anchor.
		expect(height).toBeLessThan(viewportHeight + 24);
	});
});

describe("LaunchWindow HUD drag", () => {
	beforeEach(() => {
		platformState.value = "darwin";
		resetLaunchMocks();
		resizeCallbacks.length = 0;
		vi.stubGlobal("ResizeObserver", CapturingResizeObserver);
		// jsdom doesn't implement the Pointer Capture API; stub it so the drag handlers
		// (which call set/has/releasePointerCapture) don't throw.
		HTMLElement.prototype.setPointerCapture = vi.fn();
		HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
		HTMLElement.prototype.releasePointerCapture = vi.fn();
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("suppresses ResizeObserver-driven measurement while dragging, and measures once on release", async () => {
		renderLaunchWindow();

		const dragHandle = await screen.findByTestId("hud-drag-handle");

		// Give the bar a non-zero, changing size so a resize observation would actually
		// trigger a `setHudOverlaySize` call if it weren't suppressed during the drag.
		const bar = dragHandle.closest("[data-tray-layout]") as HTMLElement | null;
		if (bar) {
			vi.spyOn(bar, "getBoundingClientRect").mockReturnValue({
				top: 700,
				left: 200,
				right: 600,
				bottom: 756,
				width: 400,
				height: 56,
				x: 200,
				y: 700,
				toJSON: () => ({}),
			});
			Object.defineProperty(bar, "scrollHeight", { value: 56, configurable: true });
			Object.defineProperty(bar, "scrollWidth", { value: 400, configurable: true });
		}

		const sizeMock = window.electronAPI.setHudOverlaySize as unknown as {
			mockClear: () => void;
		};
		sizeMock.mockClear();

		fireEvent.pointerDown(dragHandle, { screenX: 100, screenY: 100 });

		// Simulate a ResizeObserver firing mid-drag (e.g. transient reflow) -- this must
		// NOT reposition/resize the HUD while the user's pointer is still down.
		await act(async () => {
			for (const callback of resizeCallbacks) {
				callback([], {} as ResizeObserver);
			}
		});
		expect(window.electronAPI.setHudOverlaySize).not.toHaveBeenCalled();

		fireEvent.pointerMove(dragHandle, { screenX: 140, screenY: 130 });
		fireEvent.pointerUp(dragHandle, { screenX: 140, screenY: 130 });

		// Content is re-measured once the drag ends, so a real size change made mid-drag
		// still gets picked up promptly.
		await waitFor(() => {
			expect(window.electronAPI.setHudOverlaySize).toHaveBeenCalled();
		});
	});
});

describe("LaunchWindow software encoder fallback notice", () => {
	beforeEach(() => {
		platformState.value = "darwin";
		resetLaunchMocks();
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("stays hidden while the recorder reports no fallback", () => {
		renderLaunchWindow();

		expect(screen.queryByText("Switched to software encoding")).not.toBeInTheDocument();
	});

	it("shows the notice when the recorder reports a software fallback", async () => {
		recorderState.value.softwareEncoderFallbackNoticeVisible = true;

		renderLaunchWindow();

		expect(await screen.findByText("Switched to software encoding")).toBeInTheDocument();
		expect(screen.getByText(/fell back to software H\.264 encoding/)).toBeInTheDocument();
	});

	it("dismisses the notice without persisting when Got it is clicked", async () => {
		recorderState.value.softwareEncoderFallbackNoticeVisible = true;

		renderLaunchWindow();

		fireEvent.click(await screen.findByRole("button", { name: "Got it" }));

		expect(recorderState.value.dismissSoftwareEncoderFallbackNotice).toHaveBeenCalledTimes(1);
		expect(recorderState.value.dismissSoftwareEncoderFallbackNotice).toHaveBeenCalledWith();
	});

	it("persists the suppression when Don't show again is clicked", async () => {
		recorderState.value.softwareEncoderFallbackNoticeVisible = true;

		renderLaunchWindow();

		fireEvent.click(await screen.findByRole("button", { name: "Don't show again" }));

		expect(recorderState.value.dismissSoftwareEncoderFallbackNotice).toHaveBeenCalledTimes(1);
		expect(recorderState.value.dismissSoftwareEncoderFallbackNotice).toHaveBeenCalledWith(true);
	});
});

describe("LaunchWindow render budget", () => {
	beforeEach(() => {
		platformState.value = "darwin";
		resetLaunchMocks();
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("does not re-render the memoized SourceAudioControls/HudSidebar subtrees on a timer tick", async () => {
		// The equivalent HudOverlay test hand-freezes its prop objects with a
		// useRef, so it only proves a property of a hypothetical caller. This one
		// renders the real LaunchWindow → HudOverlay path, which is where the
		// memoization actually has to hold: LaunchWindow re-renders once a second
		// while recording, and a fresh prop-object literal per render would make
		// every React.memo below it a no-op.
		// `memo(Component)` stores the unwrapped render function on `.type`;
		// spying on it observes real invocations, independent of commits or DOM
		// diffing (see the note in HudOverlay.test.tsx). It must be installed
		// BEFORE the first render: React resolves a simple-memo fiber's inner
		// type once at mount and reuses it, so a later spy is never called.
		const sidebarTypeSpy = vi.spyOn(HudSidebar, "type" as never);
		const sourceAudioTypeSpy = vi.spyOn(SourceAudioControls, "type" as never);

		recorderState.value = { ...recorderState.value, recording: true, elapsedSeconds: 1 };
		renderLaunchWindow();
		await screen.findByTestId("launch-record-button");

		const sidebarBaseline = sidebarTypeSpy.mock.calls.length;
		const sourceAudioBaseline = sourceAudioTypeSpy.mock.calls.length;
		expect(sidebarBaseline).toBeGreaterThan(0);
		expect(sourceAudioBaseline).toBeGreaterThan(0);

		setRecorderState({ elapsedSeconds: 2 });
		setRecorderState({ elapsedSeconds: 3 });
		setRecorderState({ elapsedSeconds: 4 });

		// Positive control: the ticks really did reach the DOM.
		expect(screen.getByText("00:04")).toBeInTheDocument();
		expect(sidebarTypeSpy.mock.calls.length - sidebarBaseline).toBe(0);
		expect(sourceAudioTypeSpy.mock.calls.length - sourceAudioBaseline).toBe(0);
	});
});
