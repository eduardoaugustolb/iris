export interface TypeStep {
	sizePx: number;
	lineHeight: number;
	weight: number;
	tabularNums?: boolean;
}

/** The seven steps from DESIGN.md section 4. No intermediate sizes exist. */
export const typography = {
	display: { sizePx: 34, lineHeight: 1.1, weight: 700 },
	title1: { sizePx: 22, lineHeight: 1.2, weight: 600 },
	title2: { sizePx: 17, lineHeight: 1.3, weight: 600 },
	body: { sizePx: 13, lineHeight: 1.4, weight: 400 },
	bodyEmphasis: { sizePx: 13, lineHeight: 1.4, weight: 590 },
	caption: { sizePx: 11, lineHeight: 1.3, weight: 400 },
	captionNumeric: { sizePx: 11, lineHeight: 1.3, weight: 500, tabularNums: true },
} as const satisfies Record<string, TypeStep>;

export type TypeToken = keyof typeof typography;

/**
 * The UI family is embedded, not borrowed from the OS: the app runs on macOS,
 * Windows and Linux and must render identically on all three. "Iris Sans" and
 * "Iris Mono" are the local aliases declared in src/design/fonts.css.
 */
export const fontStack = {
	display: '"Iris Sans", system-ui, sans-serif',
	text: '"Iris Sans", system-ui, sans-serif',
	mono: '"Iris Mono", ui-monospace, monospace',
} as const;
