export type WindowKind = "hud" | "editor" | "sourceSelector" | "countdown" | "notes";

export interface AppActivity {
	recording: boolean;
	countdownVisible: boolean;
}

/**
 * Chromium throttles background renderers to save CPU. Opting out is a real cost,
 * so only windows that must keep a timer or a stream alive get the exemption, and
 * only while they actually need it.
 */
export function shouldDisableThrottling(kind: WindowKind, activity: AppActivity): boolean {
	switch (kind) {
		case "hud":
		case "editor":
			return activity.recording;
		case "countdown":
			return activity.countdownVisible;
		case "sourceSelector":
		case "notes":
			return false;
	}
}
