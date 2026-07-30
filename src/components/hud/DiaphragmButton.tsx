import { useEffect, useRef } from "react";
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
						d="M10 10 L10 3 A7 7 0 0 1 15.5 6 Z"
						transform={`rotate(${angle} 10 10)`}
					/>
				))}
			</g>
		</svg>
	);
}

export function DiaphragmButton({
	recording,
	paused,
	saving,
	elapsedSeconds,
	hasSelectedSource,
	title,
	onClick,
}: DiaphragmButtonProps) {
	const bladeRefs = useRef<(SVGPathElement | null)[]>([]);
	const bladeAnimationsRef = useRef<Animation[]>([]);
	const dotRef = useRef<HTMLSpanElement | null>(null);
	const bladesWrapperRef = useRef<HTMLSpanElement | null>(null);
	const wasRecording = useRef(recording);

	useEffect(() => {
		const startedRecording = recording && !wasRecording.current;
		const stoppedRecording = !recording && wasRecording.current;
		wasRecording.current = recording;

		const blades = bladeRefs.current.filter((el): el is SVGPathElement => el !== null);
		if (blades.length === 0 || !dotRef.current || !bladesWrapperRef.current) return;

		if (startedRecording) {
			if (prefersReducedMotion()) {
				crossfade(bladesWrapperRef.current, dotRef.current);
			} else {
				bladeAnimationsRef.current = closeDiaphragm(blades);
				dotRef.current.animate([{ opacity: 0 }, { opacity: 1 }], {
					duration: duration.fast,
					delay: duration.slow - duration.fast,
					easing: easing.standard,
					fill: "forwards",
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
			crossfade(dotRef.current, bladesWrapperRef.current);
		}
	}, [recording]);

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
					opacity: recording ? 0 : hasSelectedSource ? 1 : 0.45,
					position: recording ? "absolute" : "static",
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
					opacity: recording ? 1 : 0,
					position: recording ? "static" : "absolute",
				}}
			/>
			{recording && <RecordingTimer elapsedSeconds={elapsedSeconds} paused={paused} />}
		</button>
	);
}
