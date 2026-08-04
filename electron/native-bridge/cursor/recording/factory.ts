import type { Rectangle } from "electron";
import { HyprlandCursorRecordingSession } from "./hyprlandCursorRecordingSession";
import { MacNativeCursorRecordingSession } from "./macNativeCursorRecordingSession";
import type { CursorRecordingSession } from "./session";
import { TelemetryRecordingSession } from "./telemetryRecordingSession";
import { WindowsNativeRecordingSession } from "./windowsNativeRecordingSession";

interface CreateCursorRecordingSessionOptions {
	getDisplayBounds: () => Rectangle | null;
	maxSamples: number;
	platform: NodeJS.Platform;
	sampleIntervalMs: number;
	sourceId?: string | null;
	startTimeMs?: number;
}

// macOS and Windows always have a real live cursor-position source (see the
// Native*RecordingSession classes below). On Linux, Hyprland's IPC socket gives
// an accurate position at any time; other compositors (GNOME/Mutter included)
// don't have an equivalent channel today and fall back to Electron's
// screen.getCursorScreenPoint(), which is known-broken under Wayland (frozen,
// typically at 0,0) -- there's no live overlay cursor to draw there.
export function hasLiveCursorTelemetry(platform: NodeJS.Platform): boolean {
	return platform !== "linux" || Boolean(process.env.HYPRLAND_INSTANCE_SIGNATURE);
}

export function createCursorRecordingSession(
	options: CreateCursorRecordingSessionOptions,
): CursorRecordingSession {
	if (options.platform === "win32") {
		return new WindowsNativeRecordingSession({
			getDisplayBounds: options.getDisplayBounds,
			maxSamples: options.maxSamples,
			sampleIntervalMs: options.sampleIntervalMs,
			sourceId: options.sourceId,
			startTimeMs: options.startTimeMs,
		});
	}

	if (options.platform === "darwin") {
		return new MacNativeCursorRecordingSession({
			getDisplayBounds: options.getDisplayBounds,
			maxSamples: options.maxSamples,
			sampleIntervalMs: options.sampleIntervalMs,
			startTimeMs: options.startTimeMs,
		});
	}

	// Linux: capture cursor positions via an interval sampler where we have a
	// real channel for it (see hasLiveCursorTelemetry above).
	if (hasLiveCursorTelemetry(options.platform)) {
		return new HyprlandCursorRecordingSession({
			getDisplayBounds: options.getDisplayBounds,
			maxSamples: options.maxSamples,
			sampleIntervalMs: options.sampleIntervalMs,
			startTimeMs: options.startTimeMs,
		});
	}

	return new TelemetryRecordingSession({
		getDisplayBounds: options.getDisplayBounds,
		maxSamples: options.maxSamples,
		sampleIntervalMs: options.sampleIntervalMs,
		startTimeMs: options.startTimeMs,
	});
}
