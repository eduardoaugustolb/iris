import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { KeyboardIcon } from "@phosphor-icons/react/dist/csr/Keyboard";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import {
	DEFAULT_SHORTCUTS,
	FIXED_SHORTCUTS,
	findConflict,
	formatBinding,
	SHORTCUT_ACTIONS,
	type ShortcutAction,
	type ShortcutBinding,
	type ShortcutConflict,
	type ShortcutsConfig,
} from "@/lib/shortcuts";
import { BLUR_REGIONS_ENABLED } from "./featureFlags";

const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);

export function ShortcutsConfigDialog() {
	const { shortcuts, isMac, isConfigOpen, closeConfig, setShortcuts, persistShortcuts } =
		useShortcuts();
	const t = useScopedT("shortcuts");
	const tc = useScopedT("common");

	const [draft, setDraft] = useState<ShortcutsConfig>(shortcuts);
	const [captureFor, setCaptureFor] = useState<ShortcutAction | null>(null);
	const [conflict, setConflict] = useState<{
		forAction: ShortcutAction;
		pending: ShortcutBinding;
		conflictWith: ShortcutConflict;
	} | null>(null);

	useEffect(() => {
		if (isConfigOpen) {
			setDraft(shortcuts);
			setCaptureFor(null);
			setConflict(null);
		}
	}, [isConfigOpen, shortcuts]);

	useEffect(() => {
		if (!captureFor) return;

		const handleCapture = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();

			if (e.key === "Escape") {
				setCaptureFor(null);
				return;
			}

			if (MODIFIER_KEYS.has(e.key)) return;

			const binding: ShortcutBinding = {
				key: e.key.toLowerCase(),
				...(e.ctrlKey || e.metaKey ? { ctrl: true } : {}),
				...(e.shiftKey ? { shift: true } : {}),
				...(e.altKey ? { alt: true } : {}),
			};

			const found = findConflict(binding, captureFor, draft);
			setCaptureFor(null);

			if (found?.type === "fixed") {
				toast.error(t("reservedShortcut", { label: found.label }));
				return;
			}

			if (found?.type === "configurable") {
				setConflict({ forAction: captureFor, pending: binding, conflictWith: found });
				return;
			}

			setDraft((prev: ShortcutsConfig) => ({ ...prev, [captureFor]: binding }));
		};

		window.addEventListener("keydown", handleCapture, { capture: true });
		return () => window.removeEventListener("keydown", handleCapture, { capture: true });
	}, [captureFor, draft, t]);

	const handleSwap = useCallback(() => {
		if (!conflict || conflict.conflictWith.type !== "configurable") return;
		const { forAction, pending, conflictWith } = conflict;
		setDraft((prev: ShortcutsConfig) => ({
			...prev,
			[forAction]: pending,
			[conflictWith.action]: prev[forAction],
		}));
		setConflict(null);
	}, [conflict]);

	const handleCancelConflict = useCallback(() => setConflict(null), []);

	const handleSave = useCallback(async () => {
		const success = await persistShortcuts(draft);
		if (success) {
			setShortcuts(draft);
			toast.success(t("savedToast"));
			closeConfig();
		} else {
			toast.error(t("registrationFailed"));
		}
	}, [draft, setShortcuts, persistShortcuts, closeConfig, t]);

	const handleReset = useCallback(() => {
		setDraft({ ...DEFAULT_SHORTCUTS });
		toast.info(t("resetToast"));
	}, [t]);

	const handleClose = useCallback(() => {
		setCaptureFor(null);
		setConflict(null);
		closeConfig();
	}, [closeConfig]);

	return (
		<Dialog
			open={isConfigOpen}
			onOpenChange={(open: boolean) => {
				if (!open) handleClose();
			}}
		>
			<DialogContent className="text-[#F5F5F7] max-w-[420px] max-h-[85vh] flex flex-col">
				<DialogHeader className="shrink-0">
					<DialogTitle className="flex items-center gap-2 text-sm">
						<KeyboardIcon size={16} weight="regular" className="text-[#5E5CE6]" />
						{t("title")}
					</DialogTitle>
				</DialogHeader>

				<div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
					<div className="space-y-0.5">
						<p className="text-[10px] text-[var(--text-tertiary)] mb-2 uppercase tracking-wide font-semibold">
							{t("configurable")}
						</p>
						{SHORTCUT_ACTIONS.filter((action) => BLUR_REGIONS_ENABLED || action !== "addBlur").map(
							(action) => {
								const isCapturing = captureFor === action;
								const hasConflict = conflict?.forAction === action;
								return (
									<div key={action}>
										<div className="flex items-center justify-between py-1.5 px-1 border-b border-white/10">
											<span className="text-sm text-[var(--text-primary)]">
												{t(`actions.${action}`)}
											</span>
											<button
												type="button"
												onClick={() => {
													setConflict(null);
													setCaptureFor(isCapturing ? null : action);
												}}
												title={isCapturing ? t("pressEscToCancel") : t("clickToChange")}
												className={[
													"px-2 py-1 rounded text-xs font-mono border transition-all min-w-[90px] text-center select-none",
													isCapturing
														? "bg-[#5E5CE6]/20 border-[#5E5CE6] text-[#5E5CE6] animate-pulse"
														: hasConflict
															? "bg-[#FF9F0A]/10 border-[#FF9F0A]/50 text-[#FF9F0A]"
															: "bg-white/10 border-white/10 text-[#F5F5F7] hover:border-[#5E5CE6]/50 hover:text-[#5E5CE6] cursor-pointer",
												].join(" ")}
											>
												{isCapturing ? t("pressKey") : formatBinding(draft[action], isMac)}
											</button>
										</div>
										{hasConflict && conflict?.conflictWith.type === "configurable" && (
											<div className="flex items-center justify-between px-1 py-1.5 mb-0.5 bg-[#FF9F0A]/10 border border-[#FF9F0A]/20 rounded text-xs">
												<span className="text-[#FF9F0A]">
													⚠{" "}
													{t("alreadyUsedBy", {
														action: t(`actions.${conflict.conflictWith.action}`),
													})}
												</span>
												<div className="flex gap-1.5">
													<button
														type="button"
														onClick={handleSwap}
														className="px-2 py-0.5 bg-[#FF9F0A]/20 hover:bg-[#FF9F0A]/30 border border-[#FF9F0A]/40 rounded text-[#FF9F0A] font-medium transition-colors"
													>
														{t("swap")}
													</button>
													<button
														type="button"
														onClick={handleCancelConflict}
														className="px-2 py-0.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded text-[var(--text-secondary)] transition-colors"
													>
														{tc("actions.cancel")}
													</button>
												</div>
											</div>
										)}
									</div>
								);
							},
						)}
					</div>

					<div className="space-y-0.5 mt-2">
						<p className="text-[10px] text-[var(--text-tertiary)] mb-2 uppercase tracking-wide font-semibold">
							{t("fixed")}
						</p>
						{FIXED_SHORTCUTS.map(({ i18nKey, label, display }) => (
							<div
								key={i18nKey}
								className="flex items-center justify-between py-1.5 px-1 border-b border-white/10 last:border-0"
							>
								<span className="text-sm text-[var(--text-secondary)]">
									{t(`fixedActions.${i18nKey}`, { defaultValue: label })}
								</span>
								<kbd className="px-2 py-1 bg-white/10 border border-white/10 rounded text-xs font-mono text-[var(--text-secondary)] min-w-[90px] text-center">
									{display}
								</kbd>
							</div>
						))}
					</div>

					<p className="text-[10px] text-[var(--text-tertiary)] mt-1">{t("helpText")}</p>
				</div>

				<DialogFooter className="shrink-0 flex gap-2 sm:justify-between mt-2">
					<Button
						variant="ghost"
						size="sm"
						className="text-[var(--text-secondary)] gap-1.5"
						onClick={handleReset}
					>
						<ArrowCounterClockwiseIcon />
						{t("resetToDefaults")}
					</Button>
					<div className="flex gap-2">
						<Button variant="ghost" size="sm" onClick={handleClose}>
							{tc("actions.cancel")}
						</Button>
						<Button size="sm" onClick={handleSave}>
							{tc("actions.save")}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
