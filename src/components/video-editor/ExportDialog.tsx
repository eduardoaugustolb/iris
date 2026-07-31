import { CircleNotchIcon } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { DownloadIcon } from "@phosphor-icons/react/dist/csr/Download";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useScopedT } from "@/contexts/I18nContext";
import { Glass } from "@/design/glass/Glass";
import type { ExportProgress } from "@/lib/exporter";

interface ExportDialogProps {
	isOpen: boolean;
	onClose: () => void;
	progress: ExportProgress | null;
	isExporting: boolean;
	error: string | null;
	onCancel?: () => void;
	exportFormat?: "mp4" | "gif";
	exportedFilePath?: string;
	onShowInFolder?: () => void;
}

export function ExportDialog({
	isOpen,
	onClose,
	progress,
	isExporting,
	error,
	onCancel,
	exportFormat = "mp4",
	exportedFilePath,
	onShowInFolder,
}: ExportDialogProps) {
	const t = useScopedT("dialogs");
	const [showSuccess, setShowSuccess] = useState(false);

	useEffect(() => {
		if (isExporting) {
			setShowSuccess(false);
		}
	}, [isExporting]);

	// Reset when the dialog opens fresh (not mid-export).
	useEffect(() => {
		if (isOpen && !isExporting && !progress) {
			setShowSuccess(false);
		}
	}, [isOpen, isExporting, progress]);

	useEffect(() => {
		if (!isExporting && progress && progress.percentage >= 100 && !error) {
			setShowSuccess(true);
			const timer = setTimeout(() => {
				setShowSuccess(false);
				onClose();
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [isExporting, progress, error, onClose]);

	if (!isOpen) return null;

	const formatLabel = exportFormat === "gif" ? "GIF" : "Video";

	// Compiling phase: frames are done but the export is still finishing.
	const isCompiling =
		isExporting && progress && progress.percentage >= 100 && exportFormat === "gif";
	const isFinalizing = progress?.phase === "finalizing";
	// Streaming a large recording into OPFS before frames start rendering.
	const isPreparing = progress?.phase === "preparing";
	const renderProgress = progress?.renderProgress;

	const getStatusMessage = () => {
		if (error) return t("export.tryAgain");
		if (isCompiling || isFinalizing) {
			if (exportFormat === "mp4") {
				return t("export.finalizingVideo");
			}
			if (renderProgress !== undefined && renderProgress > 0) {
				return t("export.compilingGifProgress", { progress: String(renderProgress) });
			}
			return t("export.compilingGifWait");
		}
		return t("export.takeMoment");
	};

	const getTitle = () => {
		if (error) return t("export.failed");
		if (isFinalizing && exportFormat === "mp4") return t("export.finalizingVideoTitle");
		if (isCompiling || isFinalizing) return t("export.compilingGif");
		return t("export.exportingFormat", { format: formatLabel });
	};

	return (
		<>
			<div className="fixed inset-0 bg-black/80 z-[9999] animate-in fade-in duration-standard ease-standard" />
			<div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10000] w-[90vw] max-w-md animate-in zoom-in-95 duration-standard ease-standard">
				<Glass level={3} className="p-8 text-[#F5F5F7]">
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center gap-4">
							{showSuccess ? (
								<>
									<div className="w-12 h-12 rounded-full bg-[#32D74B]/20 flex items-center justify-center ring-1 ring-[#32D74B]/50">
										<DownloadIcon size={24} weight="regular" className="text-[#32D74B]" />
									</div>
									<div className="flex flex-col gap-2">
										<span className="text-xl font-bold text-[#F5F5F7] block">
											{t("export.complete")}
										</span>
										<span className="text-sm text-[var(--text-secondary)]">
											{t("export.yourFormatReady", { format: formatLabel.toLowerCase() })}
										</span>
										{exportedFilePath && (
											<Button
												variant="secondary"
												onClick={onShowInFolder}
												className="mt-2 w-fit px-3 py-1 text-sm"
											>
												{t("export.showInFolder")}
											</Button>
										)}
										{exportedFilePath && (
											<span className="text-xs text-[var(--text-tertiary)] break-all max-w-xs mt-1">
												{exportedFilePath.split("/").pop()}
											</span>
										)}
									</div>
								</>
							) : (
								<>
									{isExporting ? (
										<div className="w-12 h-12 rounded-full bg-[#5E5CE6]/10 flex items-center justify-center">
											<CircleNotchIcon
												size={24}
												weight="bold"
												className="text-[#5E5CE6] animate-spin"
											/>
										</div>
									) : (
										<div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
											<DownloadIcon size={24} weight="regular" className="text-[#F5F5F7]" />
										</div>
									)}
									<div>
										<span className="text-xl font-bold text-[#F5F5F7] block">{getTitle()}</span>
										<span className="text-sm text-[var(--text-secondary)]">
											{getStatusMessage()}
										</span>
									</div>
								</>
							)}
						</div>
						{!isExporting && (
							<Button
								variant="ghost"
								size="icon"
								onClick={onClose}
								className="text-[var(--text-secondary)] hover:text-[#F5F5F7]"
							>
								<XIcon size={16} weight="regular" />
							</Button>
						)}
					</div>

					{error && (
						<div className="mb-6 animate-in slide-in-from-top-2">
							<div className="bg-[#FF453A]/10 border border-[#FF453A]/20 rounded-xl p-4 flex items-start gap-3">
								<div className="p-1 bg-[#FF453A]/20 rounded-full">
									<XIcon size={12} weight="bold" className="text-[#FF453A]" />
								</div>
								<p className="whitespace-pre-wrap break-words text-sm text-[#FF453A] leading-relaxed">
									{error}
								</p>
							</div>
						</div>
					)}

					{isExporting && progress && (
						<div className="space-y-6">
							<div className="space-y-2">
								<div className="flex justify-between text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
									<span>
										{isCompiling || isFinalizing
											? t("export.compiling")
											: isPreparing
												? t("export.processing")
												: t("export.renderingFrames")}
									</span>
									<span className="font-mono text-[#F5F5F7]">
										{isCompiling || isFinalizing ? (
											renderProgress !== undefined && renderProgress > 0 ? (
												`${renderProgress}%`
											) : (
												<span className="flex items-center gap-2">
													<CircleNotchIcon size={12} weight="bold" className="animate-spin" />
													{t("export.processing")}
												</span>
											)
										) : (
											`${progress.percentage.toFixed(0)}%`
										)}
									</span>
								</div>
								<div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
									{isCompiling || isFinalizing ? (
										// Real progress if we have it, otherwise an indeterminate bar.
										renderProgress !== undefined && renderProgress > 0 ? (
											<div
												className="h-full bg-[#5E5CE6] shadow-[0_0_10px_rgba(94,92,230,0.3)] transition-all duration-300 ease-out"
												style={{ width: `${renderProgress}%` }}
											/>
										) : (
											<div className="h-full w-full relative overflow-hidden">
												<div
													className="absolute h-full w-1/3 bg-[#5E5CE6] shadow-[0_0_10px_rgba(94,92,230,0.3)]"
													style={{
														animation: "indeterminate 1.5s ease-in-out infinite",
													}}
												/>
												<style>{`
																	@keyframes indeterminate {
																		0% { transform: translateX(-100%); }
																		100% { transform: translateX(400%); }
																	}
																`}</style>
											</div>
										)
									) : (
										<div
											className="h-full bg-[#5E5CE6] shadow-[0_0_10px_rgba(94,92,230,0.3)] transition-all duration-300 ease-out"
											style={{ width: `${Math.min(progress.percentage, 100)}%` }}
										/>
									)}
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="bg-white/5 rounded-xl p-3 border border-white/10">
									<div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
										{isCompiling || isFinalizing ? t("export.status") : t("export.format")}
									</div>
									<div className="text-[#F5F5F7] font-medium text-sm">
										{isFinalizing && exportFormat === "mp4"
											? t("export.finalizing")
											: isCompiling || isFinalizing
												? t("export.compilingStatus")
												: formatLabel}
									</div>
								</div>
								<div className="bg-white/5 rounded-xl p-3 border border-white/10">
									<div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
										{t("export.frames")}
									</div>
									<div className="text-[#F5F5F7] font-medium text-sm">
										{isPreparing ? (
											<span className="flex items-center gap-2">
												<CircleNotchIcon size={12} weight="bold" className="animate-spin" />
												{t("export.processing")}
											</span>
										) : (
											`${progress.currentFrame} / ${progress.totalFrames}`
										)}
									</div>
								</div>
							</div>

							{onCancel && (
								<div className="pt-2">
									<Button
										onClick={onCancel}
										variant="ghost"
										className="w-full py-6 bg-[#FF453A]/10 text-[#FF453A] border border-[#FF453A]/20 hover:bg-[#FF453A]/20 hover:border-[#FF453A]/30 transition-all"
									>
										{t("export.cancelExport")}
									</Button>
								</div>
							)}
						</div>
					)}

					{showSuccess && (
						<div className="text-center py-4 animate-in zoom-in-95">
							<p className="text-lg text-[#F5F5F7] font-medium">
								{t("export.savedSuccessfully", { format: formatLabel })}
							</p>
						</div>
					)}
				</Glass>
			</div>
		</>
	);
}
