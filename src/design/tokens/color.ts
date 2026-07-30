/** Values are copied verbatim from DESIGN.md section 3. Do not approximate. */
export const color = {
	surfaceBase: "#0A0A0C",
	surfaceRaised: "#141416",
	brandPrimary: "#5E5CE6",
	brandPrimaryHover: "#8886F0",
	specular: "#FFFFFF",
	textPrimary: "#F5F5F7",
	textSecondary: "rgba(245,245,247,0.62)",
	textTertiary: "rgba(245,245,247,0.34)",
	semanticRecording: "#FF453A",
	semanticSuccess: "#32D74B",
	semanticWarning: "#FF9F0A",
} as const;

export type ColorToken = keyof typeof color;
