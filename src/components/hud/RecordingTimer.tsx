import { memo } from "react";
import { color } from "@/design/tokens/color";
import { formatTimePadded } from "@/utils/timeUtils";

export interface RecordingTimerProps {
	elapsedSeconds: number;
	paused: boolean;
}

export const RecordingTimer = memo(function RecordingTimer({
	elapsedSeconds,
	paused,
}: RecordingTimerProps) {
	return (
		<span
			className="inline-block w-[34px] text-left text-xs font-semibold tabular-nums"
			style={{ color: paused ? color.semanticWarning : color.semanticRecording }}
		>
			{formatTimePadded(elapsedSeconds)}
		</span>
	);
});
