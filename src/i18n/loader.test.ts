import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "./config";
import { getAvailableLocales, isLocaleLoaded, loadLocale, translate } from "./loader";

describe("i18n loader (lazy per-locale chunks)", () => {
	it("exposes the available locales synchronously from the glob keys", () => {
		const available = getAvailableLocales();
		expect(available.length).toBe(SUPPORTED_LOCALES.length);
		expect(available).toEqual(expect.arrayContaining(SUPPORTED_LOCALES));
	});

	it("starts with no locale loaded and falls back to the raw key", () => {
		expect(isLocaleLoaded("en")).toBe(false);
		expect(translate("en", "common", "locale.name")).toBe("common.locale.name");
	});

	it("loads a locale and makes its messages available synchronously", async () => {
		await loadLocale("en");
		expect(isLocaleLoaded("en")).toBe(true);
		expect(translate("en", "common", "locale.name")).toBe("English");
	});

	it("is idempotent", async () => {
		await loadLocale("en");
		await loadLocale("en");
		expect(isLocaleLoaded("en")).toBe(true);
		expect(translate("en", "common", "locale.name")).toBe("English");
	});

	it("treats an unsupported locale as loaded without erroring", async () => {
		await loadLocale("xx-XX");
		expect(isLocaleLoaded("xx-XX")).toBe(true);
	});

	it("falls back to the English baseline for keys a locale lacks", async () => {
		await loadLocale("pt-BR");
		expect(isLocaleLoaded("pt-BR")).toBe(true);
		expect(isLocaleLoaded("en")).toBe(true);
		// pt-BR/timeline.json is missing buttons.autoZoomOn: translate must
		// return the English value, never the raw key.
		expect(translate("pt-BR", "timeline", "buttons.autoZoomOn")).toBe(
			"Auto zoom suggestions on — click to remove suggested zooms",
		);
	});
});
