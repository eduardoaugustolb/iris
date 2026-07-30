import { Button } from "@/components/ui/button";
import type { useScopedT } from "@/contexts/I18nContext";
import { Glass } from "@/design/glass/Glass";

export interface HudNoticesProps {
	t: ReturnType<typeof useScopedT>;
	systemLocaleSuggestion: string | null;
	suggestedLanguageName: string;
	onAcceptSystemLocale: () => void;
	onDismissSystemLocale: () => void;
	setSystemLocalePromptEl: (el: HTMLDivElement | null) => void;
	softwareEncoderFallbackNoticeVisible: boolean;
	onDismissSoftwareFallback: (persist?: boolean) => void;
	setSoftwareFallbackNoticeEl: (el: HTMLDivElement | null) => void;
}

export function HudNotices({
	t,
	systemLocaleSuggestion,
	suggestedLanguageName,
	onAcceptSystemLocale,
	onDismissSystemLocale,
	setSystemLocalePromptEl,
	softwareEncoderFallbackNoticeVisible,
	onDismissSoftwareFallback,
	setSoftwareFallbackNoticeEl,
}: HudNoticesProps) {
	if (!systemLocaleSuggestion && !softwareEncoderFallbackNoticeVisible) return null;

	return (
		<div className="fixed top-8 left-1/2 z-30 flex w-[calc(100vw-1rem)] max-w-[520px] -translate-x-1/2 flex-col gap-2">
			{systemLocaleSuggestion && (
				<Glass
					level={2}
					ref={setSystemLocalePromptEl}
					data-hud-interactive="true"
					className="w-full p-3 text-white animate-in fade-in-0 zoom-in-95 duration-200"
				>
					<div className="text-[13px] font-semibold text-white">
						{t("systemLanguagePrompt.title")}
					</div>
					<div className="mt-1 text-[11px] leading-relaxed text-white/75">
						{t("systemLanguagePrompt.description", { language: suggestedLanguageName })}
					</div>
					<div className="mt-3 flex items-center justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onDismissSystemLocale}
							className="h-7 text-xs text-white/80 hover:bg-white/10 hover:text-white"
						>
							{t("systemLanguagePrompt.keepDefault")}
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={onAcceptSystemLocale}
							className="h-7 text-xs bg-white text-[#10121b] hover:bg-white/90"
						>
							{t("systemLanguagePrompt.switch", { language: suggestedLanguageName })}
						</Button>
					</div>
				</Glass>
			)}

			{softwareEncoderFallbackNoticeVisible && (
				<Glass
					level={2}
					ref={setSoftwareFallbackNoticeEl}
					data-hud-interactive="true"
					className="w-full p-3 text-white animate-in fade-in-0 zoom-in-95 duration-200"
				>
					<div className="text-[13px] font-semibold text-white">
						{t("softwareEncoderFallback.title")}
					</div>
					<div className="mt-1 text-[11px] leading-relaxed text-white/75">
						{t("softwareEncoderFallback.description")}
					</div>
					<div className="mt-3 flex items-center justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onDismissSoftwareFallback(true)}
							className="h-7 text-xs text-white/80 hover:bg-white/10 hover:text-white"
						>
							{t("softwareEncoderFallback.dontShowAgain")}
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={() => onDismissSoftwareFallback()}
							className="h-7 text-xs bg-white text-[#10121b] hover:bg-white/90"
						>
							{t("softwareEncoderFallback.dismiss")}
						</Button>
					</div>
				</Glass>
			)}
		</div>
	);
}
