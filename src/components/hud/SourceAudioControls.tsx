import { CursorIcon } from "@phosphor-icons/react/dist/csr/Cursor";
import { MicrophoneIcon } from "@phosphor-icons/react/dist/csr/Microphone";
import { MicrophoneSlashIcon } from "@phosphor-icons/react/dist/csr/MicrophoneSlash";
import { MonitorIcon } from "@phosphor-icons/react/dist/csr/Monitor";
import { SpeakerHighIcon } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { SpeakerSlashIcon } from "@phosphor-icons/react/dist/csr/SpeakerSlash";
import { VideoCameraIcon } from "@phosphor-icons/react/dist/csr/VideoCamera";
import { VideoCameraSlashIcon } from "@phosphor-icons/react/dist/csr/VideoCameraSlash";
import { memo } from "react";
import type { useScopedT } from "@/contexts/I18nContext";
import { color } from "@/design/tokens/color";
import styles from "./hud.module.css";

export interface SourceAudioControlsProps {
	trayLayout: "horizontal" | "vertical";
	selectedSource: string;
	onOpenSourceSelector: () => void;
	recording: boolean;
	saving: boolean;
	systemAudioEnabled: boolean;
	onToggleSystemAudio: () => void;
	microphoneEnabled: boolean;
	onToggleMicrophone: () => void;
	webcamEnabled: boolean;
	onToggleWebcam: () => void;
	supportsCursorModeToggle: boolean;
	cursorCaptureMode: string;
	onToggleCursorMode: () => void;
	t: ReturnType<typeof useScopedT>;
}

const disabledClasses =
	"disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none";
const groupClasses = `flex items-center gap-0.5 rounded-xl border border-white/[0.07] bg-white/[0.045] transition-colors duration-150 hover:bg-white/[0.075] ${disabledClasses}`;
const iconBtnClasses = `flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer text-white hover:bg-white/10 active:scale-95 ${disabledClasses}`;

function activeStyle(active: boolean): React.CSSProperties | undefined {
	return active ? { color: color.brandPrimary } : undefined;
}

export const SourceAudioControls = memo(function SourceAudioControls(
	props: SourceAudioControlsProps,
) {
	const disabled = props.recording || props.saving;

	return (
		<>
			<button
				data-testid="launch-source-selector-button"
				className={`${groupClasses} h-8 ${styles.electronNoDrag} ${props.trayLayout === "vertical" ? "w-8 justify-center px-0" : "px-2.5"}`}
				onClick={props.onOpenSourceSelector}
				disabled={disabled}
				title={props.selectedSource}
				aria-label={props.selectedSource}
			>
				<MonitorIcon size={20} weight="regular" className="text-white/80" />
				<span
					className={`${props.trayLayout === "vertical" ? "sr-only" : "max-w-[86px]"} truncate text-[11px] font-medium text-white/75`}
				>
					{props.selectedSource}
				</span>
			</button>

			<div
				className={`${groupClasses} ${styles.electronNoDrag} ${props.trayLayout === "vertical" ? "flex-col py-1" : ""}`}
			>
				<button
					data-testid="launch-system-audio-button"
					className={iconBtnClasses}
					onClick={props.onToggleSystemAudio}
					disabled={disabled}
					title={
						props.systemAudioEnabled
							? props.t("audio.disableSystemAudio")
							: props.t("audio.enableSystemAudio")
					}
				>
					{props.systemAudioEnabled ? (
						<SpeakerHighIcon
							size={20}
							weight="regular"
							style={activeStyle(props.systemAudioEnabled)}
						/>
					) : (
						<SpeakerSlashIcon size={20} weight="regular" className="text-white/40" />
					)}
				</button>
				<button
					data-testid="launch-microphone-button"
					className={iconBtnClasses}
					onClick={props.onToggleMicrophone}
					disabled={disabled}
					title={
						props.microphoneEnabled
							? props.t("audio.disableMicrophone")
							: props.t("audio.enableMicrophone")
					}
				>
					{props.microphoneEnabled ? (
						<MicrophoneIcon
							size={20}
							weight="regular"
							style={activeStyle(props.microphoneEnabled)}
						/>
					) : (
						<MicrophoneSlashIcon size={20} weight="regular" className="text-white/40" />
					)}
				</button>
				<button
					data-testid="launch-webcam-button"
					className={iconBtnClasses}
					onClick={props.onToggleWebcam}
					disabled={disabled}
					title={
						props.webcamEnabled ? props.t("webcam.disableWebcam") : props.t("webcam.enableWebcam")
					}
				>
					{props.webcamEnabled ? (
						<VideoCameraIcon size={20} weight="regular" style={activeStyle(props.webcamEnabled)} />
					) : (
						<VideoCameraSlashIcon size={20} weight="regular" className="text-white/40" />
					)}
				</button>
				{props.supportsCursorModeToggle && (
					<button
						data-testid="launch-cursor-mode-button"
						className={iconBtnClasses}
						onClick={props.onToggleCursorMode}
						disabled={disabled}
						title={
							props.cursorCaptureMode === "editable-overlay"
								? props.t("cursor.useSystemCursor")
								: props.t("cursor.useEditableCursor")
						}
					>
						<CursorIcon
							size={20}
							weight="regular"
							className={props.cursorCaptureMode === "editable-overlay" ? "" : "text-white/40"}
							style={activeStyle(props.cursorCaptureMode === "editable-overlay")}
						/>
					</button>
				)}
			</div>
		</>
	);
});
