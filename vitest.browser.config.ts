import path from "node:path";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.browser.test.{ts,tsx}"],
		browser: {
			enabled: true,
			provider: playwright({
				launchOptions: {
					// Software WebGL so Pixi.js works in headless CI without a GPU.
					args: [
						"--enable-unsafe-swiftshader",
						"--use-gl=swiftshader",
						// MediaRecorder h264+opus tests feed a live AudioContext; without
						// a user gesture it starts suspended and records no audio.
						"--autoplay-policy=no-user-gesture-required",
					],
				},
			}),
			headless: true,
			instances: [{ browser: "chromium" }],
		},
		testTimeout: 120_000,
		hookTimeout: 30_000,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	assetsInclude: ["**/*.webm"],
});
