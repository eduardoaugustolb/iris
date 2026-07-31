import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	GIF_FRAME_RATES,
	GIF_SIZE_PRESETS,
	type GifFrameRate,
	type GifSizePreset,
} from "@/lib/exporter/types";

interface GifOptionsPanelProps {
	frameRate: GifFrameRate;
	onFrameRateChange: (rate: GifFrameRate) => void;
	loop: boolean;
	onLoopChange: (loop: boolean) => void;
	sizePreset: GifSizePreset;
	onSizePresetChange: (preset: GifSizePreset) => void;
	outputDimensions: { width: number; height: number };
	disabled?: boolean;
}

export function GifOptionsPanel({
	frameRate,
	onFrameRateChange,
	loop,
	onLoopChange,
	sizePreset,
	onSizePresetChange,
	outputDimensions,
	disabled = false,
}: GifOptionsPanelProps) {
	const sizePresetOptions = Object.entries(GIF_SIZE_PRESETS).map(([key, value]) => ({
		value: key as GifSizePreset,
		label: value.label,
	}));

	return (
		<div className="space-y-4 animate-in slide-in-from-bottom-2 duration-200">
			{/* Frame Rate */}
			<div className="space-y-2">
				<label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
					Frame Rate
				</label>
				<Select
					value={String(frameRate)}
					onValueChange={(value) => onFrameRateChange(Number(value) as GifFrameRate)}
					disabled={disabled}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{GIF_FRAME_RATES.map((rate) => (
							<SelectItem key={rate.value} value={String(rate.value)}>
								{rate.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Size Preset */}
			<div className="space-y-2">
				<label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
					Output Size
				</label>
				<Select
					value={sizePreset}
					onValueChange={(value) => onSizePresetChange(value as GifSizePreset)}
					disabled={disabled}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{sizePresetOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<div className="text-xs text-[var(--text-tertiary)]">
					Output: {outputDimensions.width} × {outputDimensions.height}px
				</div>
			</div>

			{/* Loop Toggle */}
			<div className="flex items-center justify-between py-2">
				<div>
					<label className="text-sm font-medium text-[#F5F5F7]">Loop Animation</label>
					<p className="text-xs text-[var(--text-tertiary)]">GIF will play continuously</p>
				</div>
				<Switch checked={loop} onCheckedChange={onLoopChange} disabled={disabled} />
			</div>
		</div>
	);
}
