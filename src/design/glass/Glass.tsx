import type { CSSProperties, ReactNode } from "react";
import { type ElevationLevel, elevation, type RadiusToken, radius } from "../tokens/space";

export const GLASS_MARKER = "data-iris-glass";

export interface GlassProps {
	level: ElevationLevel;
	radius?: RadiusToken;
	className?: string;
	children?: ReactNode;
}

/**
 * The only place in the app allowed to build the glass material. It stacks the
 * three layers DESIGN.md section 5 requires — backdrop blur, surface tint and
 * specular border — because any one of them alone reads as flat translucency.
 */
export function Glass({ level, radius: radiusToken = "lg", className, children }: GlassProps) {
	const { backdropBlurPx, shadowBlurPx } = elevation[level];
	const backdrop = `blur(${backdropBlurPx}px) saturate(180%)`;

	const style: CSSProperties = {
		backdropFilter: backdrop,
		WebkitBackdropFilter: backdrop,
		background: "rgba(255, 255, 255, 0.08)",
		border: "0.5px solid rgba(255, 255, 255, 0.14)",
		borderTop: "0.5px solid rgba(255, 255, 255, 0.24)",
		borderRadius: `${radius[radiusToken]}px`,
		boxShadow: [
			"0 0 0 0.5px rgba(0, 0, 0, 0.3)",
			`0 12px ${shadowBlurPx}px rgba(0, 0, 0, 0.28)`,
			"inset 0 1px 0 rgba(255, 255, 255, 0.08)",
		].join(", "),
	};

	return (
		<div className={className} style={style} {...{ [GLASS_MARKER]: String(level) }}>
			{children}
		</div>
	);
}
