import { ApertureIcon } from "@phosphor-icons/react/dist/csr/Aperture";
import { useEffect, useRef } from "react";
import { Icon } from "@/design/icons/Icon";
import { crossfade } from "@/design/motion/animate";
import { color } from "@/design/tokens/color";
import { duration, easing } from "@/design/tokens/motion";
import styles from "./hud.module.css";
import { RecordingTimer } from "./RecordingTimer";

export interface DiaphragmButtonProps {
	recording: boolean;
	paused: boolean;
	saving: boolean;
	elapsedSeconds: number;
	hasSelectedSource: boolean;
	title: string;
	/** Already-translated "Saving…" label, shown next to the spinner. */
	savingLabel: string;
	onClick: () => void;
}

/**
 * `crossfade` fills forwards, which pins the faded-in element at exactly
 * `opacity: 1` forever — clobbering the wrapper's own dimmed
 * (`hasSelectedSource ? 1 : 0.45`) resting state if the source is cleared after
 * a recording stops. Cancelling once the fade has finished hands control back
 * to the inline style, whose value already equals the animation's end value, so
 * nothing moves at the hand-off.
 */
function releaseWhenFinished(animations: Animation[]) {
	const last = animations[animations.length - 1];
	if (!last) return;
	last.onfinish = () => {
		for (const animation of animations) animation.cancel();
	};
}

export function DiaphragmButton({
	recording,
	paused,
	saving,
	elapsedSeconds,
	hasSelectedSource,
	title,
	savingLabel,
	onClick,
}: DiaphragmButtonProps) {
	const apertureRef = useRef<HTMLSpanElement | null>(null);
	const dotRef = useRef<HTMLSpanElement | null>(null);
	const wasRecording = useRef(recording);
	const savingRef = useRef(saving);

	// Declared before the transition effect on purpose: effects run in
	// declaration order, so this mirrors `saving` for the very commit in which
	// the stop transition is detected (the app flips `recording` off and
	// `saving` on together).
	useEffect(() => {
		savingRef.current = saving;
	}, [saving]);

	useEffect(() => {
		const startedRecording = recording && !wasRecording.current;
		const stoppedRecording = !recording && wasRecording.current;
		wasRecording.current = recording;

		if (!apertureRef.current || !dotRef.current) return;

		if (startedRecording) {
			// WAAPI keyframes outrank inline styles, so this crossfade is what
			// actually hides the aperture wrapper the instant it starts — no extra
			// state needed to bridge the gap until it plays.
			releaseWhenFinished(crossfade(apertureRef.current, dotRef.current));
		} else if (stoppedRecording) {
			if (savingRef.current) {
				// Stop-and-save: `useScreenRecorder` flips `recording` off and `saving`
				// on in the same commit, so `apertureHidden` already pins the wrapper at
				// opacity 0 to leave the button to the spinner. A `crossfade` here
				// would fade the wrapper back to 1 with WAAPI keyframes, which outrank
				// that inline style — the aperture would flash over the spinner for the
				// whole ~150ms fade. Fade only the dot out and let `apertureHidden` keep
				// owning the wrapper.
				releaseWhenFinished([
					dotRef.current.animate([{ opacity: 1 }, { opacity: 0 }], {
						duration: duration.fast,
						easing: easing.standard,
						fill: "forwards",
					}),
				]);
			} else {
				releaseWhenFinished(crossfade(dotRef.current, apertureRef.current));
			}
		}
	}, [recording]);

	// Whenever the spinner owns the button, or while actually recording, the
	// aperture wrapper's resting opacity is 0 — the crossfade above is what
	// actually reveals/hides it moment-to-moment.
	const apertureHidden = saving || recording;

	return (
		<button
			type="button"
			data-testid="launch-record-button"
			disabled={saving}
			title={title}
			aria-label={title}
			onClick={onClick}
			className={`relative flex items-center justify-center gap-1.5 rounded-full p-2 transition-[min-width] ${styles.electronNoDrag}`}
			style={{ minWidth: recording || saving ? 78 : 36, transitionDuration: `${duration.fast}ms` }}
		>
			<span
				ref={apertureRef}
				style={{
					opacity: apertureHidden ? 0 : hasSelectedSource ? 1 : 0.45,
					position: recording || saving ? "absolute" : "static",
					inset: recording || saving ? 0 : undefined,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<ApertureIcon size={20} weight="regular" color={color.brandPrimary} />
			</span>
			<span
				ref={dotRef}
				style={{
					display: "inline-block",
					width: 10,
					height: 10,
					borderRadius: "50%",
					background: color.semanticRecording,
					opacity: recording && !saving ? 1 : 0,
					position: recording && !saving ? "static" : "absolute",
					top: recording && !saving ? undefined : "50%",
					left: recording && !saving ? undefined : "50%",
					transform: recording && !saving ? undefined : "translate(-50%, -50%)",
				}}
			/>
			{saving && (
				<>
					<span data-testid="launch-record-saving-spinner" className="flex animate-spin">
						<Icon name="spinner" className="text-white/80" />
					</span>
					<span className="select-none text-xs font-semibold text-white/80">{savingLabel}</span>
				</>
			)}
			{recording && <RecordingTimer elapsedSeconds={elapsedSeconds} paused={paused} />}
		</button>
	);
}
