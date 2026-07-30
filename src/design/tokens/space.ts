/** Base-4 spacing scale from DESIGN.md section 6. No intermediate values exist. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 } as const;

/** Corner radii from DESIGN.md section 5. */
export const radius = { sm: 8, md: 14, lg: 20, xl: 28 } as const;

/**
 * Depth levels from DESIGN.md section 5. Each level raises backdrop blur and
 * shadow blur together — one without the other reads as a flat overlay.
 */
export const elevation = {
	1: { backdropBlurPx: 12, shadowBlurPx: 8 },
	2: { backdropBlurPx: 24, shadowBlurPx: 32 },
	3: { backdropBlurPx: 40, shadowBlurPx: 48 },
} as const;

export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
export type ElevationLevel = keyof typeof elevation;

const SPACING_VALUES = new Set<number>(Object.values(space));

export function isValidSpacing(px: number): boolean {
	return SPACING_VALUES.has(px);
}
