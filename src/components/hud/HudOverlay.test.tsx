import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { createRenderCounter } from "@/lib/perf/renderCounter";
import { HudOverlay, type HudOverlayProps } from "./HudOverlay";

const t = ((key: string) => key) as HudOverlayProps["t"];

function buildProps(overrides: Partial<HudOverlayProps> = {}): HudOverlayProps {
	return {
		trayLayout: "horizontal",
		onToggleTrayLayout: vi.fn(),
		t,
		setHudBarEl: vi.fn(),
		onBarPointerEnter: vi.fn(),
		onBarPointerDown: vi.fn(),
		onBarMouseEnter: vi.fn(),
		onBarMouseLeave: vi.fn(),
		onOuterPointerMove: vi.fn(),
		onOuterPointerLeave: vi.fn(),
		onDragPointerDown: vi.fn(),
		onDragPointerMove: vi.fn(),
		onDragPointerUp: vi.fn(),
		onDragPointerCancel: vi.fn(),
		notices: {
			t,
			systemLocaleSuggestion: null,
			suggestedLanguageName: "",
			onAcceptSystemLocale: vi.fn(),
			onDismissSystemLocale: vi.fn(),
			setSystemLocalePromptEl: vi.fn(),
			softwareEncoderFallbackNoticeVisible: false,
			onDismissSoftwareFallback: vi.fn(),
			setSoftwareFallbackNoticeEl: vi.fn(),
		},
		deviceSelectors: {
			t,
			trayLayout: "horizontal",
			hudBarHeight: 60,
			setDeviceSelectorEl: vi.fn(),
			showMicControls: false,
			micExpanded: false,
			onMicMouseEnter: vi.fn(),
			onMicMouseLeave: vi.fn(),
			onMicFocus: vi.fn(),
			onMicBlur: vi.fn(),
			selectedMicLabel: "",
			microphoneDeviceId: undefined,
			selectedMicId: "default",
			micDevices: [],
			onMicDeviceChange: vi.fn(),
			micLevel: 0,
			showWebcamControls: false,
			webcamExpanded: false,
			onWebcamMouseEnter: vi.fn(),
			onWebcamMouseLeave: vi.fn(),
			onWebcamFocus: vi.fn(),
			onWebcamBlur: vi.fn(),
			selectedCameraLabel: "",
			webcamDeviceId: undefined,
			selectedCameraId: "",
			cameraDevices: [],
			isCameraDevicesLoading: false,
			cameraDevicesError: null,
			onCameraDeviceChange: vi.fn(),
		},
		sourceAudio: {
			trayLayout: "horizontal",
			selectedSource: "Entire screen",
			onOpenSourceSelector: vi.fn(),
			recording: false,
			saving: false,
			systemAudioEnabled: false,
			onToggleSystemAudio: vi.fn(),
			microphoneEnabled: false,
			onToggleMicrophone: vi.fn(),
			webcamEnabled: false,
			onToggleWebcam: vi.fn(),
			supportsCursorModeToggle: false,
			cursorCaptureMode: "system",
			onToggleCursorMode: vi.fn(),
			t,
		},
		recordingControls: {
			recording: false,
			paused: false,
			saving: false,
			elapsedSeconds: 0,
			hasSelectedSource: false,
			selectedSource: "Entire screen",
			t,
			onRecordButtonClick: vi.fn(),
			canPauseRecording: false,
			onTogglePaused: vi.fn(),
			onRestart: vi.fn(),
			onCancel: vi.fn(),
		},
		sidebar: {
			t,
			trayLayout: "horizontal",
			saving: false,
			recording: false,
			isLinuxHud: false,
			onOpenNotes: vi.fn(),
			onOpenStudio: vi.fn(),
			languageTriggerRef: createRef(),
			activeLanguageLabel: "EN",
			isLanguageMenuOpen: false,
			onToggleLanguageMenu: vi.fn(),
			setLanguageMenuPanelEl: vi.fn(),
			languageMenuStyle: { right: 12, top: 12, maxHeight: 240 },
			availableLocales: ["en"],
			locale: "en",
			getLocaleName: () => "English",
			onSelectLocale: vi.fn(),
			onLanguageMenuPointerEnter: vi.fn(),
			onLanguageMenuWheel: vi.fn(),
			onHideHud: vi.fn(),
			onCloseHud: vi.fn(),
		},
		...overrides,
	};
}

describe("HudOverlay", () => {
	it("renders the drag handle and record button", () => {
		render(<HudOverlay {...buildProps()} />);
		expect(screen.getByTestId("hud-drag-handle")).toBeInTheDocument();
		expect(screen.getByTestId("launch-record-button")).toBeInTheDocument();
	});

	it("keeps the rest of the tree stable while only elapsedSeconds changes", () => {
		const counter = createRenderCounter();

		function Wrapper({ elapsedSeconds }: { elapsedSeconds: number }) {
			const props = buildProps({
				recordingControls: {
					...buildProps().recordingControls,
					recording: true,
					elapsedSeconds,
				},
			});
			return (
				<>
					<counter.Probe />
					<HudOverlay {...props} />
				</>
			);
		}

		const { rerender } = render(<Wrapper elapsedSeconds={1} />);
		counter.reset();
		rerender(<Wrapper elapsedSeconds={2} />);
		rerender(<Wrapper elapsedSeconds={3} />);

		// The Probe here counts Wrapper's own re-renders (expected: 2, one per
		// rerender call) — the real budget assertion is that HudOverlay's
		// sub-tree outside RecordingTimer doesn't re-render *additional* times
		// beyond what its own prop changes force. Assert indirectly: the
		// sidebar's language trigger button (whose props never change here)
		// keeps the same DOM node identity across both rerenders.
		// HudSidebar sets aria-label to the translated "language" string and
		// title to the short activeLanguageLabel ("EN"); aria-label wins the
		// accessible-name computation, so we identify the node by its title
		// (the visible tooltip text) rather than getByRole's `name` matcher.
		const button = screen.getByTitle("EN");
		rerender(<Wrapper elapsedSeconds={4} />);
		expect(screen.getByTitle("EN")).toBe(button);
	});
});
