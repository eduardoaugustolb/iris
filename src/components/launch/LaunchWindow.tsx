import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n, useScopedT } from "@/contexts/I18nContext";
import { getAvailableLocales, getLocaleName } from "@/i18n/loader";
import { loadUserPreferences, saveUserPreferences } from "@/lib/userPreferences";
import { nativeBridgeClient } from "@/native";
import { useAudioLevelMeter } from "../../hooks/useAudioLevelMeter";
import { useCameraDevices } from "../../hooks/useCameraDevices";
import { useMicrophoneDevices } from "../../hooks/useMicrophoneDevices";
import { useScreenRecorder } from "../../hooks/useScreenRecorder";
import { requestCameraAccess } from "../../lib/requestCameraAccess";
import { HudOverlay } from "../hud/HudOverlay";
import { openSourceSelectorWithPermissionRetry } from "./openSourceSelectorFlow";

// Vertical tray gap (px): bar's `bottom-5` (20px) plus an 8px gap.
const HUD_DEVICE_POPUP_GAP = 28;
// Horizontal layout: mirrors the `bottom-[68px]` class on the popup element.
const HUD_DEVICE_POPUP_HORIZONTAL_BOTTOM = 68;

/** Launches the floating recording HUD and its recorder controls. */
export function LaunchWindow() {
	const t = useScopedT("launch");
	const availableLocales = getAvailableLocales();
	const {
		locale,
		setLocale,
		systemLocaleSuggestion,
		acceptSystemLocaleSuggestion,
		dismissSystemLocaleSuggestion,
		resolveSystemLocaleSuggestion,
	} = useI18n();
	const suggestedLanguageName = systemLocaleSuggestion ? getLocaleName(systemLocaleSuggestion) : "";
	const activeLanguageLabel = getLocaleName(locale).split(/\s+/)[0] || locale.toUpperCase();

	const {
		recording,
		paused,
		saving,
		elapsedSeconds,
		toggleRecording,
		togglePaused,
		canPauseRecording,
		restartRecording,
		cancelRecording,
		microphoneEnabled,
		setMicrophoneEnabled,
		microphoneDeviceId,
		setMicrophoneDeviceId,
		setMicrophoneDeviceName,
		systemAudioEnabled,
		setSystemAudioEnabled,
		webcamEnabled,
		setWebcamEnabled,
		webcamDeviceId,
		setWebcamDeviceId,
		setWebcamDeviceName,
		cursorCaptureMode,
		setCursorCaptureMode,
		softwareEncoderFallbackNoticeVisible,
		dismissSoftwareEncoderFallbackNotice,
	} = useScreenRecorder();

	const showMicControls = microphoneEnabled && !recording;
	const showWebcamControls = webcamEnabled && !recording;

	const [isMicHovered, setIsMicHovered] = useState(false);
	const [isMicFocused, setIsMicFocused] = useState(false);
	const micExpanded = isMicHovered || isMicFocused;

	const [isWebcamHovered, setIsWebcamHovered] = useState(false);
	const [isWebcamFocused, setIsWebcamFocused] = useState(false);
	const webcamExpanded = isWebcamHovered || isWebcamFocused;
	const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
	const [trayLayout, setTrayLayout] = useState<"horizontal" | "vertical">(
		() => loadUserPreferences().trayLayout,
	);
	const [supportsCursorModeToggle, setSupportsCursorModeToggle] = useState(false);
	const [isLinuxHud, setIsLinuxHud] = useState(false);
	const languageTriggerRef = useRef<HTMLButtonElement | null>(null);
	const languageMenuPanelRef = useRef<HTMLDivElement | null>(null);
	const hudBarRef = useRef<HTMLDivElement | null>(null);
	const deviceSelectorRef = useRef<HTMLDivElement | null>(null);
	const systemLocalePromptRef = useRef<HTMLDivElement | null>(null);
	const softwareFallbackNoticeRef = useRef<HTMLDivElement | null>(null);
	// Measured bar height, anchors the popups above the tall vertical tray so they don't overlap it.
	const [hudBarHeight, setHudBarHeight] = useState(0);
	const [languageMenuStyle, setLanguageMenuStyle] = useState<{
		right: number;
		top: number;
		maxHeight: number;
	}>({
		right: 12,
		top: 12,
		maxHeight: 240,
	});

	const {
		devices: micDevices,
		selectedDeviceId: selectedMicId,
		setSelectedDeviceId: setSelectedMicId,
	} = useMicrophoneDevices(microphoneEnabled);
	const {
		devices: cameraDevices,
		selectedDeviceId: selectedCameraId,
		setSelectedDeviceId: setSelectedCameraId,
		isLoading: isCameraDevicesLoading,
		error: cameraDevicesError,
	} = useCameraDevices(webcamEnabled);

	const selectedMicLabel =
		micDevices.find((d) => d.deviceId === (microphoneDeviceId || selectedMicId))?.label ||
		t("audio.defaultMicrophone");
	const selectedCameraDevice = cameraDevices.find(
		(d) => d.deviceId === (webcamDeviceId || selectedCameraId),
	);
	const selectedCameraLabel = isCameraDevicesLoading
		? t("webcam.searching")
		: cameraDevicesError
			? t("webcam.unavailable")
			: cameraDevices.length === 0
				? t("webcam.noneFound")
				: selectedCameraDevice?.label || t("webcam.defaultCamera");

	const { level } = useAudioLevelMeter({
		enabled: showMicControls,
		deviceId: microphoneDeviceId,
	});

	useEffect(() => {
		if (selectedMicId && selectedMicId !== "default") {
			setMicrophoneDeviceId(selectedMicId);
			setMicrophoneDeviceName(micDevices.find((d) => d.deviceId === selectedMicId)?.label);
		}
	}, [selectedMicId, micDevices, setMicrophoneDeviceId, setMicrophoneDeviceName]);

	useEffect(() => {
		if (selectedCameraId) {
			setWebcamDeviceId(selectedCameraId);
			setWebcamDeviceName(cameraDevices.find((d) => d.deviceId === selectedCameraId)?.label);
		}
	}, [selectedCameraId, cameraDevices, setWebcamDeviceId, setWebcamDeviceName]);

	useEffect(() => {
		let cancelled = false;
		nativeBridgeClient.system
			.getPlatform()
			.then((platform) => {
				if (!cancelled) {
					setSupportsCursorModeToggle(platform === "win32" || platform === "darwin");
					setIsLinuxHud(platform === "linux");
				}
			})
			.catch(() => {
				if (!cancelled) {
					setSupportsCursorModeToggle(false);
					setIsLinuxHud(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!import.meta.env.DEV) {
			return;
		}

		void requestCameraAccess().catch((error) => {
			console.warn("Failed to trigger camera access request during development:", error);
		});
	}, []);

	useEffect(() => {
		if (!isLanguageMenuOpen) return;

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node;
			const clickedTrigger = languageTriggerRef.current?.contains(target);
			const clickedMenu = languageMenuPanelRef.current?.contains(target);
			if (!clickedTrigger && !clickedMenu) {
				setIsLanguageMenuOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsLanguageMenuOpen(false);
			}
		};

		window.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleEscape);

		return () => {
			window.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleEscape);
		};
	}, [isLanguageMenuOpen]);

	useEffect(() => {
		if (!isLanguageMenuOpen || !languageTriggerRef.current) return;

		const updatePosition = () => {
			if (!languageTriggerRef.current) return;
			const rect = languageTriggerRef.current.getBoundingClientRect();
			const gap = 8;
			const viewportPadding = 8;
			const availableHeight = Math.max(80, rect.top - viewportPadding - gap);
			const top = Math.max(viewportPadding, rect.top - gap - availableHeight);

			setLanguageMenuStyle({
				right: Math.max(viewportPadding, window.innerWidth - rect.right),
				top,
				maxHeight: availableHeight,
			});
		};

		updatePosition();
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);

		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
		};
	}, [isLanguageMenuOpen]);

	useEffect(() => {
		if (!isLanguageMenuOpen || !languageMenuPanelRef.current) return;
		const id = requestAnimationFrame(() => {
			if (languageMenuPanelRef.current) {
				languageMenuPanelRef.current.scrollTop = 0;
			}
		});
		return () => cancelAnimationFrame(id);
	}, [isLanguageMenuOpen]);

	// Resize the overlay window to fit content, else the taller vertical tray gets clipped
	// and scrolls. Measure from the window's bottom-centre (the anchor the main process
	// preserves) so fixed bottom/centre offsets keep this stable and it doesn't oscillate.
	const lastHudSizeRef = useRef({ width: 0, height: 0 });
	const isDraggingHudRef = useRef(false);
	const measureHudSize = useCallback(() => {
		const barEl = hudBarRef.current;
		if (!barEl || !window.electronAPI?.setHudOverlaySize) return;
		// While the user is dragging the HUD, ignore content-size measurements. A
		// ResizeObserver-driven resize (hud-overlay-set-size) re-centres the window from
		// its own bottom-centre anchor, which fights the position "hud-overlay-move-by" is
		// actively applying frame-by-frame -- the two IPC channels racing is what produces
		// the reported drift. Content size is re-measured once the drag ends instead.
		if (isDraggingHudRef.current) return;

		// Breathing room so the drop shadow isn't clipped. TOP_MARGIN must also exceed the
		// slack in the bar's `max-h: calc(100vh - 2.5rem)` cap (40px reserved - 20px bottom
		// gap = 20px) so the window stays tall enough that the cap never engages and adds a scrollbar.
		const SIDE_MARGIN = 24;
		const TOP_MARGIN = 24;
		// Wide enough that the language menu (11rem) never clips, even when the bar is narrow.
		const MIN_WIDTH = 220;

		const viewportHeight = window.innerHeight;
		const centerX = window.innerWidth / 2;

		// Use natural (scroll) size, not the clipped box: vertical mode's max-h cap is a
		// small-screen fallback, and reading clipped height would pin the window to it.
		// scrollHeight gives full content height; the cap only engages when the main process clamps to screen.
		let topFromBottom = viewportHeight - barEl.getBoundingClientRect().bottom + barEl.scrollHeight;
		let halfWidth = barEl.scrollWidth / 2;

		// Popups drive both dimensions too. Their vertical anchor depends on bar height,
		// which is fed back through React state and lags by a frame, so derive their top
		// edge from the bar's natural height instead of the stale rendered position. Keeps
		// one measurement pass authoritative and avoids a feedback re-measure.
		if (deviceSelectorRef.current) {
			const rect = deviceSelectorRef.current.getBoundingClientRect();
			if (rect.width !== 0 || rect.height !== 0) {
				const popupBottomOffset =
					trayLayout === "vertical"
						? barEl.scrollHeight + HUD_DEVICE_POPUP_GAP
						: HUD_DEVICE_POPUP_HORIZONTAL_BOTTOM;
				topFromBottom = Math.max(topFromBottom, popupBottomOffset + rect.height);
				halfWidth = Math.max(halfWidth, rect.width / 2);
			}
		}

		// The language menu scrolls within available height, so it only influences width.
		// Its presence in the DOM means it's open.
		if (languageMenuPanelRef.current) {
			const rect = languageMenuPanelRef.current.getBoundingClientRect();
			halfWidth = Math.max(halfWidth, centerX - rect.left, rect.right - centerX);
		}

		// Prompt sits at `fixed top-8`; grow the window to fit it so its buttons don't clip (issue #30).
		if (systemLocalePromptRef.current) {
			const rect = systemLocalePromptRef.current.getBoundingClientRect();
			const promptHeight = rect.height || systemLocalePromptRef.current.scrollHeight;
			if (promptHeight > 0) {
				topFromBottom = Math.max(topFromBottom, rect.top + promptHeight);
			}
			halfWidth = Math.max(halfWidth, centerX - rect.left, rect.right - centerX);
		}

		// The software-encoder fallback notice shares the prompt's fixed top-8 slot and needs
		// the same treatment so its buttons stay clickable.
		if (softwareFallbackNoticeRef.current) {
			const rect = softwareFallbackNoticeRef.current.getBoundingClientRect();
			const noticeHeight = rect.height || softwareFallbackNoticeRef.current.scrollHeight;
			if (noticeHeight > 0) {
				topFromBottom = Math.max(topFromBottom, rect.top + noticeHeight);
			}
			halfWidth = Math.max(halfWidth, centerX - rect.left, rect.right - centerX);
		}

		setHudBarHeight((prev) => {
			const next = Math.round(barEl.scrollHeight);
			return Math.abs(prev - next) > 1 ? next : prev;
		});

		const width = Math.max(MIN_WIDTH, Math.ceil(halfWidth * 2) + SIDE_MARGIN);
		const height = Math.ceil(topFromBottom) + TOP_MARGIN;
		if (width === lastHudSizeRef.current.width && height === lastHudSizeRef.current.height) {
			return;
		}
		lastHudSizeRef.current = { width, height };
		window.electronAPI.setHudOverlaySize(width, height);
	}, [trayLayout]);

	// One persistent observer; elements wire themselves up via callback refs as they
	// mount/unmount so measurement re-runs without recreating it or threading mount state through deps.
	const hudResizeObserverRef = useRef<ResizeObserver | null>(null);
	useEffect(() => {
		const observer = new ResizeObserver(() => measureHudSize());
		hudResizeObserverRef.current = observer;
		if (hudBarRef.current) observer.observe(hudBarRef.current);
		if (deviceSelectorRef.current) observer.observe(deviceSelectorRef.current);
		// Backfill refs set before the observer existed (e.g. the prompt or language menu).
		if (systemLocalePromptRef.current) observer.observe(systemLocalePromptRef.current);
		if (softwareFallbackNoticeRef.current) observer.observe(softwareFallbackNoticeRef.current);
		if (languageMenuPanelRef.current) observer.observe(languageMenuPanelRef.current);
		measureHudSize();
		return () => {
			observer.disconnect();
			hudResizeObserverRef.current = null;
		};
	}, [measureHudSize]);

	const observeHudElement = useCallback(
		<T extends HTMLElement>(el: T | null, ref: React.MutableRefObject<T | null>) => {
			const observer = hudResizeObserverRef.current;
			if (ref.current && observer) observer.unobserve(ref.current);
			ref.current = el;
			if (el && observer) observer.observe(el);
			measureHudSize();
		},
		[measureHudSize],
	);
	const setHudBarEl = useCallback(
		(el: HTMLDivElement | null) => observeHudElement(el, hudBarRef),
		[observeHudElement],
	);
	const setDeviceSelectorEl = useCallback(
		(el: HTMLDivElement | null) => observeHudElement(el, deviceSelectorRef),
		[observeHudElement],
	);
	const setLanguageMenuPanelEl = useCallback(
		(el: HTMLDivElement | null) => observeHudElement(el, languageMenuPanelRef),
		[observeHudElement],
	);
	const setSystemLocalePromptEl = useCallback(
		(el: HTMLDivElement | null) => observeHudElement(el, systemLocalePromptRef),
		[observeHudElement],
	);
	const setSoftwareFallbackNoticeEl = useCallback(
		(el: HTMLDivElement | null) => observeHudElement(el, softwareFallbackNoticeRef),
		[observeHudElement],
	);

	const hudIgnoreMouseEventsRef = useRef<boolean | undefined>(undefined);
	const setHudMouseEventsEnabled = useCallback(
		(enabled: boolean) => {
			const shouldIgnoreMouseEvents = !enabled && !isLinuxHud;
			if (hudIgnoreMouseEventsRef.current === shouldIgnoreMouseEvents) {
				return;
			}
			hudIgnoreMouseEventsRef.current = shouldIgnoreMouseEvents;
			window.electronAPI?.setHudOverlayIgnoreMouseEvents?.(shouldIgnoreMouseEvents);
		},
		[isLinuxHud],
	);

	useEffect(() => {
		setHudMouseEventsEnabled(false);
		return () => {
			window.electronAPI?.setHudOverlayIgnoreMouseEvents?.(false);
		};
	}, [setHudMouseEventsEnabled]);

	useEffect(() => {
		setHudMouseEventsEnabled(isLanguageMenuOpen);
	}, [isLanguageMenuOpen, setHudMouseEventsEnabled]);

	const defaultSourceName = t("sourceSelector.defaultSourceName");
	const [selectedSource, setSelectedSource] = useState(defaultSourceName);
	const [hasSelectedSource, setHasSelectedSource] = useState(false);
	const recordAfterSourceSelectionRef = useRef(false);

	const applySelectedSource = useCallback(
		(source: ProcessedDesktopSource | null) => {
			if (source) {
				setSelectedSource(source.name);
				setHasSelectedSource(true);
				return;
			}

			setSelectedSource(defaultSourceName);
			setHasSelectedSource(false);
		},
		[defaultSourceName],
	);

	useEffect(() => {
		const checkSelectedSource = async () => {
			if (!window.electronAPI) {
				return;
			}

			try {
				const source = await window.electronAPI.getSelectedSource();
				applySelectedSource(source);
			} catch (error) {
				console.warn("Failed to refresh selected source:", error);
			}
		};

		checkSelectedSource();

		const interval = setInterval(checkSelectedSource, 500);
		return () => clearInterval(interval);
	}, [applySelectedSource]);

	useEffect(() => {
		const cleanupSourceChanged = window.electronAPI?.onSelectedSourceChanged?.((source) => {
			applySelectedSource(source);
			if (!recordAfterSourceSelectionRef.current || recording) {
				return;
			}

			recordAfterSourceSelectionRef.current = false;
			toggleRecording();
		});
		const cleanupSelectorClosed = window.electronAPI?.onSourceSelectorClosed?.(() => {
			recordAfterSourceSelectionRef.current = false;
		});

		return () => {
			cleanupSourceChanged?.();
			cleanupSelectorClosed?.();
		};
	}, [applySelectedSource, recording, toggleRecording]);

	const openSourceSelector = async () => {
		if (window.electronAPI) {
			return await openSourceSelectorWithPermissionRetry({
				openSourceSelector: () => window.electronAPI.openSourceSelector(),
				requestScreenAccess: () => window.electronAPI.requestScreenAccess(),
			});
		}

		return { opened: false, reason: "electron-api-unavailable" };
	};

	const handleRecordButtonClick = () => {
		if (saving) {
			return;
		}
		if (!hasSelectedSource && !recording) {
			recordAfterSourceSelectionRef.current = true;
			void openSourceSelector()
				.then((result) => {
					if (!result.opened) {
						recordAfterSourceSelectionRef.current = false;
					}
				})
				.catch(() => {
					recordAfterSourceSelectionRef.current = false;
				});
			return;
		}

		toggleRecording();
	};

	const sendHudOverlayHide = () => {
		if (window.electronAPI && window.electronAPI.hudOverlayHide) {
			window.electronAPI.hudOverlayHide();
		}
	};
	const sendHudOverlayClose = () => {
		if (window.electronAPI && window.electronAPI.hudOverlayClose) {
			window.electronAPI.hudOverlayClose();
		}
	};
	/** Switches the HUD between horizontal and vertical tray layouts. */
	const toggleTrayLayout = () => {
		const nextLayout = trayLayout === "horizontal" ? "vertical" : "horizontal";
		setTrayLayout(nextLayout);
		saveUserPreferences({ trayLayout: nextLayout });
	};

	const toggleMicrophone = () => {
		if (!recording && !saving) {
			setMicrophoneEnabled(!microphoneEnabled);
		}
	};
	const dragLastPositionRef = useRef<{ x: number; y: number } | null>(null);
	const dragAnimationFrameRef = useRef<number | null>(null);
	const pendingDragDeltaRef = useRef({ x: 0, y: 0 });
	const flushHudDragMove = useCallback(() => {
		dragAnimationFrameRef.current = null;
		const { x, y } = pendingDragDeltaRef.current;
		pendingDragDeltaRef.current = { x: 0, y: 0 };
		if (x === 0 && y === 0) return;
		window.electronAPI?.moveHudOverlayBy?.(x, y);
	}, []);
	const scheduleHudDragMove = useCallback(
		(deltaX: number, deltaY: number) => {
			pendingDragDeltaRef.current = {
				x: pendingDragDeltaRef.current.x + deltaX,
				y: pendingDragDeltaRef.current.y + deltaY,
			};

			if (dragAnimationFrameRef.current === null) {
				dragAnimationFrameRef.current = window.requestAnimationFrame(flushHudDragMove);
			}
		},
		[flushHudDragMove],
	);
	const flushPendingHudDragMove = useCallback(() => {
		if (dragAnimationFrameRef.current !== null) {
			window.cancelAnimationFrame(dragAnimationFrameRef.current);
			dragAnimationFrameRef.current = null;
		}
		const { x, y } = pendingDragDeltaRef.current;
		pendingDragDeltaRef.current = { x: 0, y: 0 };
		if (x === 0 && y === 0) return;
		window.electronAPI?.moveHudOverlayBy?.(x, y);
	}, []);
	useEffect(() => {
		return () => {
			if (dragAnimationFrameRef.current !== null) {
				window.cancelAnimationFrame(dragAnimationFrameRef.current);
			}
		};
	}, []);
	const handleHudDragPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setHudMouseEventsEnabled(true);
		event.currentTarget.setPointerCapture(event.pointerId);
		dragLastPositionRef.current = { x: event.screenX, y: event.screenY };
		isDraggingHudRef.current = true;
	};
	const handleHudDragPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		const lastPosition = dragLastPositionRef.current;
		if (!lastPosition) return;
		const deltaX = event.screenX - lastPosition.x;
		const deltaY = event.screenY - lastPosition.y;
		dragLastPositionRef.current = { x: event.screenX, y: event.screenY };
		scheduleHudDragMove(deltaX, deltaY);
	};
	const handleHudDragPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
		dragLastPositionRef.current = null;
		flushPendingHudDragMove();
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		setHudMouseEventsEnabled(false);
		isDraggingHudRef.current = false;
		measureHudSize();
	};

	return (
		<HudOverlay
			trayLayout={trayLayout}
			onToggleTrayLayout={toggleTrayLayout}
			t={t}
			setHudBarEl={setHudBarEl}
			onBarPointerEnter={() => setHudMouseEventsEnabled(true)}
			onBarPointerDown={() => setHudMouseEventsEnabled(true)}
			onBarMouseEnter={() => setHudMouseEventsEnabled(true)}
			onBarMouseLeave={() => {
				if (!isLanguageMenuOpen) setHudMouseEventsEnabled(false);
			}}
			onOuterPointerMove={(event) => {
				const target = event.target as HTMLElement | null;
				const shouldCapture =
					isLanguageMenuOpen || Boolean(target?.closest("[data-hud-interactive='true']"));
				setHudMouseEventsEnabled(shouldCapture);
			}}
			onOuterPointerLeave={() => {
				if (!isLanguageMenuOpen) setHudMouseEventsEnabled(false);
			}}
			onDragPointerDown={handleHudDragPointerDown}
			onDragPointerMove={handleHudDragPointerMove}
			onDragPointerUp={handleHudDragPointerEnd}
			onDragPointerCancel={handleHudDragPointerEnd}
			notices={{
				t,
				systemLocaleSuggestion,
				suggestedLanguageName,
				onAcceptSystemLocale: acceptSystemLocaleSuggestion,
				onDismissSystemLocale: dismissSystemLocaleSuggestion,
				setSystemLocalePromptEl,
				softwareEncoderFallbackNoticeVisible,
				onDismissSoftwareFallback: dismissSoftwareEncoderFallbackNotice,
				setSoftwareFallbackNoticeEl,
			}}
			deviceSelectors={{
				t,
				trayLayout,
				hudBarHeight,
				setDeviceSelectorEl,
				showMicControls,
				micExpanded,
				onMicMouseEnter: () => setIsMicHovered(true),
				onMicMouseLeave: () => setIsMicHovered(false),
				onMicFocus: () => setIsMicFocused(true),
				onMicBlur: () => setIsMicFocused(false),
				selectedMicLabel,
				microphoneDeviceId,
				selectedMicId,
				micDevices,
				onMicDeviceChange: (deviceId) => {
					const selectedDevice = micDevices.find((d) => d.deviceId === deviceId);
					setSelectedMicId(deviceId);
					setMicrophoneDeviceId(deviceId);
					setMicrophoneDeviceName(selectedDevice?.label);
				},
				micLevel: level,
				showWebcamControls,
				webcamExpanded,
				onWebcamMouseEnter: () => setIsWebcamHovered(true),
				onWebcamMouseLeave: () => setIsWebcamHovered(false),
				onWebcamFocus: () => setIsWebcamFocused(true),
				onWebcamBlur: () => setIsWebcamFocused(false),
				selectedCameraLabel,
				webcamDeviceId,
				selectedCameraId,
				cameraDevices,
				isCameraDevicesLoading,
				cameraDevicesError,
				onCameraDeviceChange: (deviceId) => {
					const device = cameraDevices.find((item) => item.deviceId === deviceId);
					setSelectedCameraId(deviceId);
					setWebcamDeviceId(deviceId);
					setWebcamDeviceName(device?.label);
				},
			}}
			sourceAudio={{
				trayLayout,
				selectedSource,
				onOpenSourceSelector: openSourceSelector,
				recording,
				saving,
				systemAudioEnabled,
				onToggleSystemAudio: () => setSystemAudioEnabled(!systemAudioEnabled),
				microphoneEnabled,
				onToggleMicrophone: toggleMicrophone,
				webcamEnabled,
				onToggleWebcam: () => void setWebcamEnabled(!webcamEnabled),
				supportsCursorModeToggle,
				cursorCaptureMode,
				onToggleCursorMode: () =>
					setCursorCaptureMode(
						cursorCaptureMode === "editable-overlay" ? "system" : "editable-overlay",
					),
				t,
			}}
			recordingControls={{
				recording,
				paused,
				saving,
				elapsedSeconds,
				hasSelectedSource,
				selectedSource,
				t,
				onRecordButtonClick: handleRecordButtonClick,
				canPauseRecording,
				onTogglePaused: togglePaused,
				onRestart: restartRecording,
				onCancel: cancelRecording,
			}}
			sidebar={{
				t,
				trayLayout,
				saving,
				recording,
				isLinuxHud,
				onOpenNotes: () => window.electronAPI.openNotes(),
				onOpenStudio: () => window.electronAPI.switchToEditor(),
				languageTriggerRef,
				activeLanguageLabel,
				isLanguageMenuOpen,
				onToggleLanguageMenu: () => setIsLanguageMenuOpen((open) => !open),
				setLanguageMenuPanelEl,
				languageMenuStyle,
				availableLocales,
				locale,
				getLocaleName,
				onSelectLocale: (loc) => {
					setLocale(loc);
					resolveSystemLocaleSuggestion();
					setIsLanguageMenuOpen(false);
				},
				onLanguageMenuPointerEnter: () => setHudMouseEventsEnabled(true),
				onLanguageMenuWheel: (event) => event.stopPropagation(),
				onHideHud: sendHudOverlayHide,
				onCloseHud: sendHudOverlayClose,
			}}
		/>
	);
}
