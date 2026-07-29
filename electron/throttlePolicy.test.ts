import { describe, expect, it } from "vitest";
import { type AppActivity, shouldDisableThrottling } from "./throttlePolicy";

const idle: AppActivity = { recording: false, countdownVisible: false };
const recording: AppActivity = { recording: true, countdownVisible: false };
const counting: AppActivity = { recording: false, countdownVisible: true };

describe("shouldDisableThrottling", () => {
	it("lets the HUD sleep while idle", () => {
		expect(shouldDisableThrottling("hud", idle)).toBe(false);
	});

	it("keeps the HUD awake while recording, because the timer must keep ticking", () => {
		expect(shouldDisableThrottling("hud", recording)).toBe(true);
	});

	it("keeps the editor awake while recording so the incoming stream isn't dropped", () => {
		expect(shouldDisableThrottling("editor", recording)).toBe(true);
	});

	it("lets the editor sleep while idle", () => {
		expect(shouldDisableThrottling("editor", idle)).toBe(false);
	});

	it("keeps the countdown awake only while it is on screen", () => {
		expect(shouldDisableThrottling("countdown", counting)).toBe(true);
		expect(shouldDisableThrottling("countdown", idle)).toBe(false);
	});

	it("always lets the source selector and notes sleep", () => {
		expect(shouldDisableThrottling("sourceSelector", recording)).toBe(false);
		expect(shouldDisableThrottling("notes", recording)).toBe(false);
	});
});
