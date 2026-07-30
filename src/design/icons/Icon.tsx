import spriteMarkup from "./sprite.svg?raw";

/**
 * Mounts the icon sprite's raw SVG markup once, hidden, so every `<Icon>`'s
 * `<use href="#icon-x">` resolves against the current document instead of an
 * external (and, once built, `data:`) URI. Chromium refuses to resolve `<use>`
 * against an external `data:` URI (opaque-origin restriction), which made
 * every icon render as an empty 0x0 box in production builds — see Íris
 * plan Task 27 fix wave. Mount this once near the app root.
 */
export function IconSpriteProvider() {
	return <div style={{ display: "none" }} dangerouslySetInnerHTML={{ __html: spriteMarkup }} />;
}

export type IconName =
	| "record"
	| "stop"
	| "pause"
	| "settings"
	| "microphone"
	| "camera"
	| "close"
	| "minimize"
	| "check"
	| "folder"
	| "chevron-right"
	| "drag-handle"
	| "monitor"
	| "volume-on"
	| "volume-off"
	| "microphone-off"
	| "camera-off"
	| "cursor"
	| "resume"
	| "restart"
	| "cancel"
	| "chevron-down"
	| "tray-columns"
	| "tray-rows"
	| "language"
	| "notes"
	| "studio"
	| "spinner";

export interface IconProps {
	name: IconName;
	size?: 16 | 20 | 24;
	/** Provide only when the icon carries meaning no nearby text already carries. */
	label?: string;
	className?: string;
	style?: React.CSSProperties;
}

export function Icon({ name, size = 20, label, className, style }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			className={className}
			style={style}
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
			focusable="false"
		>
			<use href={`#icon-${name}`} />
		</svg>
	);
}
