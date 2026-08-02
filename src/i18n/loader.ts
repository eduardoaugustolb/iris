import { DEFAULT_LOCALE, I18N_NAMESPACES, type I18nNamespace, type Locale } from "./config";

type MessageMap = Record<string, unknown>;
type LocaleValidationError = {
	locale: string;
	missingNamespaces: I18nNamespace[];
};

// Lazy per-locale chunks: Vite code-splits each locale JSON into its own
// module (loaded on demand via `loadLocale`), instead of inlining all 13
// locales (~315 KB raw) into the shared chunk every window pays at startup.
// The glob *keys* are still compile-time, so availability/validation stay
// synchronous without loading any message content.
const globbed = import.meta.glob("./locales/**/*.json") as Record<
	string,
	() => Promise<{ default: MessageMap }>
>;

const LOCALE_NAMESPACES: Record<string, string[]> = {};
for (const path of Object.keys(globbed)) {
	const [, locale, namespace] = path.match(/^\.\/locales\/([^/]+)\/([^/]+)\.json$/) ?? [];
	if (!locale || !namespace) continue;
	if (!LOCALE_NAMESPACES[locale]) LOCALE_NAMESPACES[locale] = [];
	LOCALE_NAMESPACES[locale].push(namespace);
}

const messages: Record<string, Record<string, MessageMap>> = {};
const loadedLocales = new Set<string>();

export function isLocaleLoaded(locale: string): boolean {
	return loadedLocales.has(locale);
}

/**
 * Loads every namespace of `locale` (the active locale's chunks) into the
 * synchronous message cache. `translate`/`getMessages` are synchronous and
 * read from the cache, so the app must call this before rendering translated
 * UI — `I18nProvider` does, gating children on hydration.
 */
export async function loadLocale(locale: string): Promise<void> {
	if (loadedLocales.has(locale)) return;

	const namespaces = LOCALE_NAMESPACES[locale];
	if (!namespaces || namespaces.length === 0) {
		loadedLocales.add(locale);
		return;
	}

	const loaded = await Promise.all(
		namespaces.map(async (namespace) => {
			const load = globbed[`./locales/${locale}/${namespace}.json`];
			if (!load) return [namespace, {}] as const;
			const mod = await load();
			return [namespace, mod.default] as const;
		}),
	);

	messages[locale] = Object.fromEntries(loaded);
	loadedLocales.add(locale);
}

const localeValidationErrors: LocaleValidationError[] = Object.keys(LOCALE_NAMESPACES)
	.map((locale) => {
		const localeNamespaces = LOCALE_NAMESPACES[locale] ?? [];
		const missingNamespaces = I18N_NAMESPACES.filter(
			(namespace) => !localeNamespaces.includes(namespace),
		);
		return { locale, missingNamespaces };
	})
	.filter((entry) => entry.missingNamespaces.length > 0);

const invalidLocales = new Set(localeValidationErrors.map((entry) => entry.locale));

const availableLocales = Object.keys(LOCALE_NAMESPACES)
	.filter((locale) => hasRequiredNamespaces(LOCALE_NAMESPACES[locale]))
	.filter((locale) => !invalidLocales.has(locale))
	.sort((a, b) => {
		if (a === DEFAULT_LOCALE) return -1;
		if (b === DEFAULT_LOCALE) return 1;
		return a.localeCompare(b);
	});

if (localeValidationErrors.length > 0) {
	console.error("[i18n] Incomplete locale folders were excluded:");
	for (const entry of localeValidationErrors) {
		console.error(
			`[i18n] ${entry.locale}: missing ${entry.missingNamespaces.map((ns) => `${ns}.json`).join(", ")}`,
		);
	}
}

function hasRequiredNamespaces(localeNamespaces: string[] | undefined): boolean {
	if (!localeNamespaces) return false;
	for (const namespace of I18N_NAMESPACES) {
		if (!localeNamespaces.includes(namespace)) return false;
	}
	return true;
}

function isAvailableLocale(locale: string): locale is Locale {
	return availableLocales.includes(locale);
}

export function getAvailableLocales(): Locale[] {
	if (availableLocales.length === 0) {
		return [DEFAULT_LOCALE];
	}
	return availableLocales;
}

export function getLocaleValidationErrors(): LocaleValidationError[] {
	return localeValidationErrors;
}

function getMessageValue(obj: unknown, dotPath: string): string | undefined {
	const keys = dotPath.split(".");
	let current: unknown = obj;
	for (const key of keys) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[key];
	}
	return typeof current === "string" ? current : undefined;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
	if (!vars) return str;
	return str.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? `{{${key}}}`));
}

export function getMessages(locale: Locale, namespace: I18nNamespace): MessageMap {
	const resolvedLocale = isAvailableLocale(locale) ? locale : DEFAULT_LOCALE;
	return messages[resolvedLocale]?.[namespace] ?? {};
}

export function getLocaleName(locale: Locale): string {
	const resolvedLocale = isAvailableLocale(locale) ? locale : DEFAULT_LOCALE;
	return getMessageValue(messages[resolvedLocale]?.common, "locale.name") ?? locale;
}

export function getLocaleShort(locale: Locale): string {
	const resolvedLocale = isAvailableLocale(locale) ? locale : DEFAULT_LOCALE;
	return getMessageValue(messages[resolvedLocale]?.common, "locale.short") ?? locale;
}

export function translate(
	locale: Locale,
	namespace: I18nNamespace,
	key: string,
	vars?: Record<string, string | number>,
): string {
	const value =
		getMessageValue(
			messages[isAvailableLocale(locale) ? locale : DEFAULT_LOCALE]?.[namespace],
			key,
		) ?? getMessageValue(messages[DEFAULT_LOCALE]?.[namespace], key);

	if (value == null) return `${namespace}.${key}`;
	return interpolate(value, vars);
}
