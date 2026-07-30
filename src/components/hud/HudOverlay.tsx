import type { useScopedT } from "@/contexts/I18nContext";
import { Glass } from "@/design/glass/Glass";
import { Icon } from "@/design/icons/Icon";
import { HudDeviceSelectors, type HudDeviceSelectorsProps } from "./HudDeviceSelectors";
import { HudNotices, type HudNoticesProps } from "./HudNotices";
import { HudSidebar, type HudSidebarProps } from "./HudSidebar";
import styles from "./hud.module.css";
import { RecordingControls, type RecordingControlsProps } from "./RecordingControls";
import { SourceAudioControls, type SourceAudioControlsProps } from "./SourceAudioControls";

export interface HudOverlayProps {
	trayLayout: "horizontal" | "vertical";
	onToggleTrayLayout: () => void;
	t: ReturnType<typeof useScopedT>;
	setHudBarEl: (el: HTMLDivElement | null) => void;
	onBarPointerEnter: () => void;
	onBarPointerDown: () => void;
	onBarMouseEnter: () => void;
	onBarMouseLeave: () => void;
	onOuterPointerMove: (event: React.PointerEvent) => void;
	onOuterPointerLeave: () => void;
	onDragPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
	onDragPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
	onDragPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
	onDragPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
	notices: HudNoticesProps;
	deviceSelectors: HudDeviceSelectorsProps;
	sourceAudio: SourceAudioControlsProps;
	recordingControls: RecordingControlsProps;
	sidebar: HudSidebarProps;
}

export function HudOverlay(props: HudOverlayProps) {
	return (
		<div
			className={`h-full w-full min-w-0 max-w-full overflow-x-hidden overflow-y-hidden bg-transparent ${styles.electronDrag}`}
			onPointerMove={props.onOuterPointerMove}
			onPointerLeave={props.onOuterPointerLeave}
		>
			<HudNotices {...props.notices} />
			<HudDeviceSelectors {...props.deviceSelectors} />

			<Glass
				level={2}
				ref={props.setHudBarEl}
				data-hud-interactive="true"
				data-tray-layout={props.trayLayout}
				className={`fixed bottom-5 left-1/2 -translate-x-1/2 flex ${
					props.trayLayout === "vertical"
						? "max-h-[calc(100vh-2.5rem)] flex-col items-center gap-1 overflow-y-auto px-1 py-1.5"
						: "items-center gap-1.5 px-2 py-1.5"
				}`}
				onPointerEnter={props.onBarPointerEnter}
				onPointerDown={props.onBarPointerDown}
				onMouseEnter={props.onBarMouseEnter}
				onMouseLeave={props.onBarMouseLeave}
			>
				<div
					data-testid="hud-drag-handle"
					className={`flex ${props.trayLayout === "vertical" ? "h-6 w-8" : "h-8 w-7"} cursor-grab items-center justify-center active:cursor-grabbing ${styles.electronNoDrag}`}
					onPointerDown={props.onDragPointerDown}
					onPointerMove={props.onDragPointerMove}
					onPointerUp={props.onDragPointerUp}
					onPointerCancel={props.onDragPointerCancel}
				>
					<Icon name="drag-handle" className="text-white/30" />
				</div>

				<button
					data-testid="launch-tray-layout-button"
					type="button"
					aria-label={
						props.trayLayout === "horizontal"
							? props.t("tooltips.useVerticalTray")
							: props.t("tooltips.useHorizontalTray")
					}
					aria-pressed={props.trayLayout === "vertical"}
					className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer text-white hover:bg-white/10 active:scale-95 ${styles.electronNoDrag}`}
					onClick={props.onToggleTrayLayout}
				>
					<Icon
						name={props.trayLayout === "horizontal" ? "tray-columns" : "tray-rows"}
						className="text-white/60"
					/>
				</button>

				<SourceAudioControls {...props.sourceAudio} />
				<RecordingControls {...props.recordingControls} />
				<HudSidebar {...props.sidebar} />
			</Glass>
		</div>
	);
}
