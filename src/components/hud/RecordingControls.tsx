import type { useScopedT } from "@/contexts/I18nContext";
import { Icon } from "@/design/icons/Icon";
import { color } from "@/design/tokens/color";
import { DiaphragmButton } from "./DiaphragmButton";
import styles from "./hud.module.css";

export interface RecordingControlsProps {
	recording: boolean;
	paused: boolean;
	saving: boolean;
	elapsedSeconds: number;
	hasSelectedSource: boolean;
	selectedSource: string;
	t: ReturnType<typeof useScopedT>;
	onRecordButtonClick: () => void;
	canPauseRecording: boolean;
	onTogglePaused: () => void;
	onRestart: () => void;
	onCancel: () => void;
}

const auxIconBtnClasses =
	"flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-150 text-white/55 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none";

export function RecordingControls(props: RecordingControlsProps) {
	const title = props.saving
		? props.t("recording.saving")
		: props.hasSelectedSource || props.recording
			? props.selectedSource
			: props.t("recording.selectSource");

	return (
		<>
			<DiaphragmButton
				recording={props.recording}
				paused={props.paused}
				saving={props.saving}
				elapsedSeconds={props.elapsedSeconds}
				hasSelectedSource={props.hasSelectedSource}
				title={title}
				onClick={props.onRecordButtonClick}
			/>

			{props.recording && (
				<div className={`flex items-center gap-0.5 ${styles.electronNoDrag}`}>
					{props.canPauseRecording && (
						<button
							className={auxIconBtnClasses}
							onClick={() => !props.saving && props.onTogglePaused()}
							disabled={props.saving}
							aria-label={
								props.paused
									? props.t("tooltips.resumeRecording")
									: props.t("tooltips.pauseRecording")
							}
							title={
								props.paused
									? props.t("tooltips.resumeRecording")
									: props.t("tooltips.pauseRecording")
							}
						>
							<Icon
								name={props.paused ? "resume" : "pause"}
								className={props.paused ? "" : "text-white/60"}
								style={props.paused ? { color: color.semanticWarning } : undefined}
							/>
						</button>
					)}
					<button
						className={auxIconBtnClasses}
						onClick={() => !props.saving && props.onRestart()}
						disabled={props.saving}
						aria-label={props.t("tooltips.restartRecording")}
						title={props.t("tooltips.restartRecording")}
					>
						<Icon name="restart" className="text-white/60" />
					</button>
					<button
						className={auxIconBtnClasses}
						onClick={() => !props.saving && props.onCancel()}
						disabled={props.saving}
						aria-label={props.t("tooltips.cancelRecording")}
						title={props.t("tooltips.cancelRecording")}
					>
						<Icon name="cancel" className="text-white/60" />
					</button>
				</div>
			)}
		</>
	);
}
