export interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

const HEX = /^#([0-9a-f]{6})$/i;
const RGBA = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

export function parseColor(value: string): Rgba {
	const hex = HEX.exec(value.trim());

	if (hex) {
		const int = Number.parseInt(hex[1], 16);

		return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255, a: 1 };
	}

	const rgba = RGBA.exec(value.trim());

	if (rgba) {
		return {
			r: Number(rgba[1]),
			g: Number(rgba[2]),
			b: Number(rgba[3]),
			a: rgba[4] === undefined ? 1 : Number(rgba[4]),
		};
	}

	throw new Error(`Unsupported colour format: ${value}`);
}

function composite(foreground: Rgba, background: Rgba): Rgba {
	return {
		r: foreground.r * foreground.a + background.r * (1 - foreground.a),
		g: foreground.g * foreground.a + background.g * (1 - foreground.a),
		b: foreground.b * foreground.a + background.b * (1 - foreground.a),
		a: 1,
	};
}

function channelLuminance(channel: number): number {
	const normalized = channel / 255;

	return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }: Rgba): number {
	return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** WCAG 2.1 contrast ratio. Translucent foregrounds are composited first. */
export function contrastRatio(foreground: string, background: string): number {
	const back = parseColor(background);
	const front = composite(parseColor(foreground), back);

	const lighter = Math.max(relativeLuminance(front), relativeLuminance(back));
	const darker = Math.min(relativeLuminance(front), relativeLuminance(back));

	return (lighter + 0.05) / (darker + 0.05);
}
