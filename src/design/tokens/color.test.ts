import { describe, expect, it } from "vitest";
import { color } from "./color";

describe("color tokens", () => {
	it("matches DESIGN.md section 3 exactly", () => {
		expect(color).toEqual({
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
		});
	});
});
