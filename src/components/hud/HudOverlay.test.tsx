import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { HudOverlay, type HudOverlayProps } from "./HudOverlay";
import { HudSidebar } from "./HudSidebar";
import { RecordingControls } from "./RecordingControls";
import { SourceAudioControls } from "./SourceAudioControls";

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

	it("does not re-render the memoized SourceAudioControls/HudSidebar subtree when only elapsedSeconds changes", () => {
		// React.Profiler's onRender fires once per commit that merely *includes*
		// the profiled subtree, even when a memoized descendant fully bails out
		// (verified empirically: a memo child's render body ran 0 times while a
		// Profiler wrapped directly around it still fired onRender on every
		// unrelated sibling update). DOM node identity is equally unreliable —
		// React reuses a DOM node across a re-render regardless of memoization.
		// The only thing that actually distinguishes "React called this
		// component's render function again" from "React reused prior output"
		// is whether the function itself ran. `memo(Component)` stores the
		// unwrapped render function on `.type`; spying on it observes real
		// invocations directly, independent of commits or DOM diffing.
		const sidebarTypeSpy = vi.spyOn(HudSidebar, "type" as never);
		const sourceAudioTypeSpy = vi.spyOn(SourceAudioControls, "type" as never);
		const recordingControlsTypeSpy = vi.spyOn(RecordingControls, "type" as never);

		function Wrapper() {
			const [elapsedSeconds, setElapsedSeconds] = useState(1);
			// Mirrors how LaunchWindow (Task 13) will pass these down: the
			// notices/deviceSelectors/sourceAudio/sidebar prop objects are built
			// once and stay referentially stable across re-renders — only
			// recordingControls changes shape every tick. Rebuilding them fresh
			// on every render (as a naive test would) hands memoized children a
			// brand-new prop object every time and defeats memo regardless of
			// whether it's actually wired up.
			const stableProps = useRef(buildProps()).current;
			const props: HudOverlayProps = {
				...stableProps,
				recordingControls: {
					...stableProps.recordingControls,
					recording: true,
					elapsedSeconds,
				},
			};
			return (
				<>
					<button type="button" onClick={() => setElapsedSeconds((s) => s + 1)}>
						tick
					</button>
					<HudOverlay {...props} />
				</>
			);
		}

		render(<Wrapper />);
		const sidebarBaseline = sidebarTypeSpy.mock.calls.length;
		const sourceAudioBaseline = sourceAudioTypeSpy.mock.calls.length;
		const recordingControlsBaseline = recordingControlsTypeSpy.mock.calls.length;

		fireEvent.click(screen.getByText("tick"));
		fireEvent.click(screen.getByText("tick"));

		expect(sidebarTypeSpy.mock.calls.length - sidebarBaseline).toBe(0);
		expect(sourceAudioTypeSpy.mock.calls.length - sourceAudioBaseline).toBe(0);

		// Positive control, in the same test run: the timer's own container
		// (RecordingControls) IS expected to re-render every tick, since its
		// elapsedSeconds prop genuinely changes — that's the whole point of
		// isolating it. Measured the same way as the assertions above, so the two
		// zeroes can't be passing vacuously because the harness never re-rendered
		// anything at all.
		expect(recordingControlsTypeSpy.mock.calls.length - recordingControlsBaseline).toBe(2);
		expect(screen.getByTestId("launch-record-button")).toBeInTheDocument();
	});
});
