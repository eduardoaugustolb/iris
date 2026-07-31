import { GearIcon } from "@phosphor-icons/react/dist/csr/Gear";
import { QuestionIcon } from "@phosphor-icons/react/dist/csr/Question";
import { useScopedT } from "@/contexts/I18nContext";
import { useShortcuts } from "@/contexts/ShortcutsContext";
import { Glass } from "@/design/glass/Glass";
import { FIXED_SHORTCUTS, formatBinding, SHORTCUT_ACTIONS } from "@/lib/shortcuts";
import { BLUR_REGIONS_ENABLED } from "./featureFlags";

export function KeyboardShortcutsHelp() {
	const { shortcuts, isMac, openConfig } = useShortcuts();
	const t = useScopedT("shortcuts");

	return (
		<div className="relative group">
			<QuestionIcon
				size={16}
				weight="regular"
				className="text-[var(--text-secondary)] hover:text-[#5E5CE6] transition-colors cursor-help"
			/>

			<Glass
				level={3}
				className="absolute right-0 top-full mt-2 w-64 p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
			>
				<div className="flex items-center justify-between mb-2">
					<span className="text-xs font-semibold text-[#F5F5F7]">{t("title")}</span>
					<button
						type="button"
						onClick={openConfig}
						title="Customize shortcuts"
						className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] hover:text-[#5E5CE6] transition-colors"
					>
						<GearIcon size={12} weight="regular" />
						{t("customize")}
					</button>
				</div>

				<div className="space-y-1.5 text-[10px]">
					{SHORTCUT_ACTIONS.filter((action) => BLUR_REGIONS_ENABLED || action !== "addBlur").map(
						(action) => (
							<div key={action} className="flex items-center justify-between">
								<span className="text-[var(--text-secondary)]">{t(`actions.${action}`)}</span>
								<kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#5E5CE6] font-mono">
									{formatBinding(shortcuts[action], isMac)}
								</kbd>
							</div>
						),
					)}

					<div className="pt-1 border-t border-white/5 mt-1 space-y-1.5">
						{FIXED_SHORTCUTS.map((fixed) => (
							<div key={fixed.i18nKey} className="flex items-center justify-between">
								<span className="text-[var(--text-secondary)]">
									{t(`fixedActions.${fixed.i18nKey}`, { defaultValue: fixed.label })}
								</span>
								<kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[#5E5CE6] font-mono">
									{isMac
										? fixed.display
												.replace(/Ctrl/g, "⌘")
												.replace(/Shift/g, "⇧")
												.replace(/Alt/g, "⌥")
										: fixed.display}
								</kbd>
							</div>
						))}
					</div>
				</div>
			</Glass>
		</div>
	);
}
