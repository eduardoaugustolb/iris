import { type CSSProperties, forwardRef } from "react";

/**
 * Content-level blur effect for media overlays (e.g. annotation blur regions
 * drawn over the video preview). Unlike the glass material in DESIGN.md §5 this
 * is not a UI surface: it omits the surface tint and specular border on purpose
 * and only applies the backdrop blur. Every backdrop-filter in the app must go
 * through Glass (surfaces) or BlurRegion (media effects) — nowhere else.
 */
export const BLUR_REGION_MARKER = "data-iris-blur-region";

export interface BlurRegionProps {
	blurIntensity: number;
	/** When true the element renders no blur — the caller draws its own mosaic. */
	isMosaic: boolean;
	className?: string;
	style?: CSSProperties;
}

export const BlurRegion = forwardRef<HTMLDivElement, BlurRegionProps>(function BlurRegion(
	{ blurIntensity, isMosaic, className, style },
	ref,
) {
	const filter = isMosaic ? "none" : `blur(${blurIntensity}px)`;
	return (
		<div
			ref={ref}
			className={className}
			style={{ ...style, backdropFilter: filter, WebkitBackdropFilter: filter }}
			{...{ [BLUR_REGION_MARKER]: "true" }}
		/>
	);
});
