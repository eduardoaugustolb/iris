import { useEffect, useRef, useState } from "react";
import { Icon } from "@/design/icons/Icon";
import { closeDiaphragm, crossfade, prefersReducedMotion } from "@/design/motion/animate";
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

const BLADE_COUNT = 6;
const BLADE_ANGLES = Array.from({ length: BLADE_COUNT }, (_, i) => (360 / BLADE_COUNT) * i);

/**
 * Six blades arranged around a rounded hexagonal void, 35% open — DESIGN.md
 * section 7's reference angle (fully open/closed both read as generic shapes).
 * Each blade is a separate path so Task-level motion can animate them
 * independently (closeDiaphragm needs one Element per blade).
 */
function DiaphragmBlades({
	bladeRefs,
}: {
	bladeRefs: React.MutableRefObject<(SVGPathElement | null)[]>;
}) {
	return (
		<svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true">
			<defs>
				<linearGradient id="diaphragm-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor={color.brandPrimary} />
					<stop offset="100%" stopColor={color.brandPrimaryHover} />
				</linearGradient>
			</defs>
			<g fill="url(#diaphragm-gradient)">
				{BLADE_ANGLES.map((angle, index) => (
					<path
						key={angle}
						ref={(el) => {
							bladeRefs.current[index] = el;
						}}
						d="M8.5 6.8L10 2 11.5 6.8A3.5 3.5 0 0 0 8.5 6.8Z"
						transform={`rotate(${angle} 10 10)`}
						// The static rotation above pivots on (10,10) explicitly. Once
						// closeDiaphragm's CSS `transform` keyframes take over they pivot on
						// `transform-origin` instead, whose SVG default depends on
						// `transform-box` (border-box in older engines, view-box in newer).
						// Pinning both makes the animated pivot identical to the static one
						// in every engine, so the blades rotate in place instead of swinging.
						style={{ transformBox: "view-box", transformOrigin: "10px 10px" }}
					/>
				))}
			</g>
		</svg>
	);
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
	const bladeRefs = useRef<(SVGPathElement | null)[]>([]);
	const bladeAnimationsRef = useRef<Animation[]>([]);
	const dotRef = useRef<HTMLSpanElement | null>(null);
	const bladesWrapperRef = useRef<HTMLSpanElement | null>(null);
	const wasRecording = useRef(recording);
	const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	/**
	 * True from the moment the close animation is scheduled until it settles.
	 * Without it the wrapper's `opacity: 0` (which `recording` alone would
	 * dictate) is committed in the very same React commit that schedules the
	 * animation, so the browser's first paint already hides the subtree and the
	 * entire 420ms blade close plays invisibly.
	 */
	const [closing, setClosing] = useState(false);
	const savingRef = useRef(saving);

	// Declared before the transition effect on purpose: effects run in
	// declaration order, so this mirrors `saving` for the very commit in which
	// the stop transition is detected (the app flips `recording` off and
	// `saving` on together). Keeping it a ref also keeps the transition effect
	// keyed on `recording` alone — re-running it whenever `saving` toggles would
	// clear the close animation's settle timeout mid-flight.
	useEffect(() => {
		savingRef.current = saving;
	}, [saving]);

	useEffect(() => {
		const startedRecording = recording && !wasRecording.current;
		const stoppedRecording = !recording && wasRecording.current;
		wasRecording.current = recording;

		const blades = bladeRefs.current.filter((el): el is SVGPathElement => el !== null);
		if (blades.length === 0 || !dotRef.current || !bladesWrapperRef.current) return;

		if (startedRecording) {
			if (prefersReducedMotion()) {
				// WAAPI keyframes outrank inline styles, so the wrapper's own fade-out
				// here is what hides it — no `closing` gate needed on this path.
				releaseWhenFinished(crossfade(bladesWrapperRef.current, dotRef.current));
			} else {
				setClosing(true);
				const animations = closeDiaphragm(blades, BLADE_ANGLES);
				bladeAnimationsRef.current = animations;
				const settle = () => setClosing(false);
				const last = animations[animations.length - 1];
				if (last) last.onfinish = settle;
				// Safety net: onfinish never fires for an animation the engine never
				// starts (element detached, animations disabled), which would leave
				// the diaphragm permanently painted over the recording dot.
				settleTimeoutRef.current = setTimeout(settle, duration.slow);
				dotRef.current.animate([{ opacity: 0 }, { opacity: 1 }], {
					duration: duration.fast,
					delay: duration.slow - duration.fast,
					easing: easing.standard,
					// "both", not "forwards": with forwards-only fill the backwards phase
					// is unfilled, so during the delay the dot renders at its React
					// inline `opacity: 1` and only snaps to 0 when the delay expires —
					// a visible flash-then-hide before the fade-in.
					fill: "both",
				});
			}
		} else if (stoppedRecording) {
			// closeDiaphragm's blade animations are `fill: "forwards"`, so each
			// blade is left pinned at its closed opacity/transform until its
			// Animation is explicitly cancelled — otherwise the persisted effect
			// outlives the wrapper's opacity and the diaphragm never comes back.
			for (const animation of bladeAnimationsRef.current) {
				animation.cancel();
			}
			bladeAnimationsRef.current = [];
			setClosing(false);
			if (savingRef.current) {
				// Stop-and-save: `useScreenRecorder` flips `recording` off and `saving`
				// on in the same commit, so `bladesHidden` already pins the wrapper at
				// opacity 0 to leave the button to the spinner. A `crossfade` here
				// would fade the wrapper back to 1 with WAAPI keyframes, which outrank
				// that inline style — the blades would flash over the spinner for the
				// whole ~150ms fade. Fade only the dot out and let `bladesHidden` keep
				// owning the wrapper.
				releaseWhenFinished([
					dotRef.current.animate([{ opacity: 1 }, { opacity: 0 }], {
						duration: duration.fast,
						easing: easing.standard,
						fill: "forwards",
					}),
				]);
			} else {
				releaseWhenFinished(crossfade(dotRef.current, bladesWrapperRef.current));
			}
		}

		return () => {
			if (settleTimeoutRef.current !== null) {
				clearTimeout(settleTimeoutRef.current);
				settleTimeoutRef.current = null;
			}
		};
	}, [recording]);

	// Keep the diaphragm painted while it closes; hide it instantly once the
	// animation has settled, and whenever the spinner owns the button.
	const bladesHidden = saving || (recording && !closing);

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
				ref={bladesWrapperRef}
				style={{
					opacity: bladesHidden ? 0 : hasSelectedSource ? 1 : 0.45,
					position: recording || saving ? "absolute" : "static",
				}}
			>
				<DiaphragmBlades bladeRefs={bladeRefs} />
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
