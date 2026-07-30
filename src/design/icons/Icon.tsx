import spriteUrl from "./sprite.svg";

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
	| "drag-handle";

export interface IconProps {
	name: IconName;
	size?: 16 | 20 | 24;
	/** Provide only when the icon carries meaning no nearby text already carries. */
	label?: string;
	className?: string;
}

export function Icon({ name, size = 20, label, className }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			className={className}
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
			focusable="false"
		>
			<use href={`${spriteUrl}#icon-${name}`} />
		</svg>
	);
}
