import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { AudioLevelMeter } from "@/components/ui/audio-level-meter";
import type { useScopedT } from "@/contexts/I18nContext";
import { Glass } from "@/design/glass/Glass";
import { duration, easing } from "@/design/tokens/motion";
import styles from "./hud.module.css";

/**
 * Vertical tray gap (px) between the bar and this popup: the bar's `bottom-5`
 * (20px) plus an 8px gap. Exported because LaunchWindow's `measureHudSize`
 * must reproduce the exact same offset when sizing the overlay window — two
 * private copies would silently drift and misalign the popup.
 */
export const HUD_DEVICE_POPUP_GAP = 28;

export interface HudDeviceSelectorsProps {
	t: ReturnType<typeof useScopedT>;
	trayLayout: "horizontal" | "vertical";
	hudBarHeight: number;
	setDeviceSelectorEl: (el: HTMLDivElement | null) => void;
	showMicControls: boolean;
	micExpanded: boolean;
	onMicMouseEnter: () => void;
	onMicMouseLeave: () => void;
	onMicFocus: () => void;
	onMicBlur: () => void;
	selectedMicLabel: string;
	microphoneDeviceId: string | undefined;
	selectedMicId: string;
	micDevices: Array<{ deviceId: string; label: string }>;
	onMicDeviceChange: (deviceId: string) => void;
	micLevel: number;
	showWebcamControls: boolean;
	webcamExpanded: boolean;
	onWebcamMouseEnter: () => void;
	onWebcamMouseLeave: () => void;
	onWebcamFocus: () => void;
	onWebcamBlur: () => void;
	selectedCameraLabel: string;
	webcamDeviceId: string | undefined;
	selectedCameraId: string;
	cameraDevices: Array<{ deviceId: string; label: string }>;
	isCameraDevicesLoading: boolean;
	cameraDevicesError: unknown;
	onCameraDeviceChange: (deviceId: string) => void;
}

export function HudDeviceSelectors(props: HudDeviceSelectorsProps) {
	const { showMicControls, showWebcamControls } = props;
	if (!showMicControls && !showWebcamControls) return null;

	return (
		<div
			ref={props.setDeviceSelectorEl}
			data-hud-interactive="true"
			className={`fixed left-1/2 -translate-x-1/2 flex items-center gap-2 animate-mic-panel-in ${styles.electronNoDrag} ${props.trayLayout === "vertical" ? "" : "bottom-[68px]"}`}
			style={
				props.trayLayout === "vertical"
					? { bottom: props.hudBarHeight + HUD_DEVICE_POPUP_GAP }
					: undefined
			}
		>
			{showMicControls && (
				<div
					style={{
						width: props.micExpanded ? "240px" : "140px",
						transition: `width ${duration.standard}ms ${easing.standard}`,
					}}
				>
					<Glass
						level={2}
						className={`flex h-9 items-center gap-2 px-3 py-1.5 transition-all duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] w-full h-full ${!props.micExpanded ? "opacity-60 grayscale-[0.5]" : "opacity-100"}`}
						onMouseEnter={props.onMicMouseEnter}
						onMouseLeave={props.onMicMouseLeave}
						onFocus={props.onMicFocus}
						onBlur={props.onMicBlur}
					>
						<div className="relative flex-1 min-w-0">
							{!props.micExpanded && (
								<div className="text-white/60 text-[10px] font-medium truncate">
									{props.selectedMicLabel}
								</div>
							)}
							<select
								value={props.microphoneDeviceId || props.selectedMicId}
								onChange={(e) => props.onMicDeviceChange(e.target.value)}
								className={`w-full appearance-none bg-white/5 text-white text-[11px] rounded-lg pl-2 pr-6 py-1 border border-white/10 outline-none hover:bg-white/10 transition-colors cursor-pointer ${!props.micExpanded ? "sr-only" : ""}`}
							>
								{props.micDevices.map((device) => (
									<option key={device.deviceId} value={device.deviceId} className="bg-[#1c1c24]">
										{device.label}
									</option>
								))}
							</select>
							{props.micExpanded && (
								<CaretDownIcon
									size={16}
									weight="regular"
									className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
								/>
							)}
						</div>
						<AudioLevelMeter
							level={props.micLevel}
							className={`${props.micExpanded ? "w-16" : "w-8"} h-2 transition-all duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]`}
						/>
					</Glass>
				</div>
			)}

			{showWebcamControls && (
				<div
					style={{
						width: props.webcamExpanded ? "240px" : "140px",
						transition: `width ${duration.standard}ms ${easing.standard}`,
					}}
				>
					<Glass
						level={2}
						className={`flex h-9 items-center gap-2 px-3 py-1.5 transition-all duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] w-full h-full ${!props.webcamExpanded ? "opacity-60 grayscale-[0.5]" : "opacity-100"}`}
						onMouseEnter={props.onWebcamMouseEnter}
						onMouseLeave={props.onWebcamMouseLeave}
						onFocus={props.onWebcamFocus}
						onBlur={props.onWebcamBlur}
					>
						<div className="relative flex-1 min-w-0">
							{!props.webcamExpanded && (
								<div className="text-white/60 text-[10px] font-medium truncate">
									{props.selectedCameraLabel}
								</div>
							)}
							{props.webcamExpanded &&
								(props.isCameraDevicesLoading ? (
									<span className="text-white/40 text-[10px] italic">
										{props.t("webcam.searching")}
									</span>
								) : props.cameraDevicesError ? (
									<span className="text-white/40 text-[10px] italic">
										{props.t("webcam.unavailable")}
									</span>
								) : props.cameraDevices.length === 0 ? (
									<span className="text-white/40 text-[10px] italic">
										{props.t("webcam.noneFound")}
									</span>
								) : (
									<>
										<select
											value={props.webcamDeviceId || props.selectedCameraId}
											onChange={(e) => props.onCameraDeviceChange(e.target.value)}
											className="w-full appearance-none bg-white/5 text-white text-[11px] rounded-lg pl-2 pr-6 py-1 border border-white/10 outline-none hover:bg-white/10 transition-colors cursor-pointer"
										>
											{props.cameraDevices.map((device) => (
												<option
													key={device.deviceId}
													value={device.deviceId}
													className="bg-[#1c1c24]"
												>
													{device.label}
												</option>
											))}
										</select>
										<CaretDownIcon
											size={16}
											weight="regular"
											className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
										/>
									</>
								))}
							{(!props.webcamExpanded || props.cameraDevices.length === 0) && (
								<select
									value={props.webcamDeviceId || props.selectedCameraId}
									onChange={(e) => props.onCameraDeviceChange(e.target.value)}
									className="sr-only"
								>
									{props.cameraDevices.map((device) => (
										<option key={device.deviceId} value={device.deviceId}>
											{device.label}
										</option>
									))}
								</select>
							)}
						</div>
					</Glass>
				</div>
			)}
		</div>
	);
}
