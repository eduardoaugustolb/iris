import { describe, expect, it } from "vitest";
import { BANNED_DEPENDENCIES, findBannedDependencies } from "./dependencyGuard";

describe("findBannedDependencies", () => {
	it("reports a banned package found in dependencies", () => {
		expect(findBannedDependencies({ dependencies: { gsap: "^3.15.0", react: "^18.3.1" } })).toEqual(
			["gsap"],
		);
	});

	it("reports a banned package found in devDependencies", () => {
		expect(findBannedDependencies({ devDependencies: { mp4box: "^2.3.0" } })).toEqual(["mp4box"]);
	});

	it("returns nothing for a clean manifest", () => {
		expect(findBannedDependencies({ dependencies: { react: "^18.3.1" } })).toEqual([]);
	});

	it("bans every animation and dead package the audit found", () => {
		expect([...BANNED_DEPENDENCIES].sort()).toEqual([
			"emoji-picker-react",
			"gsap",
			"lucide-react",
			"motion",
			"mp4box",
			"react-icons",
		]);
	});
});
