import { memo } from "react";
import { createPortal } from "react-dom";
import styles from "@/components/launch/LaunchWindow.module.css";
import type { useScopedT } from "@/contexts/I18nContext";
import { Glass } from "@/design/glass/Glass";
import { Icon } from "@/design/icons/Icon";

export interface HudSidebarProps {
	t: ReturnType<typeof useScopedT>;
	trayLayout: "horizontal" | "vertical";
	saving: boolean;
	recording: boolean;
	isLinuxHud: boolean;
	onOpenNotes: () => void;
	onOpenStudio: () => void;
	languageTriggerRef: React.RefObject<HTMLButtonElement>;
	activeLanguageLabel: string;
	isLanguageMenuOpen: boolean;
	onToggleLanguageMenu: () => void;
	setLanguageMenuPanelEl: (el: HTMLDivElement | null) => void;
	languageMenuStyle: { right: number; top: number; maxHeight: number };
	availableLocales: string[];
	locale: string;
	getLocaleName: (locale: string) => string;
	onSelectLocale: (locale: string) => void;
	onLanguageMenuPointerEnter: () => void;
	onLanguageMenuWheel: (event: React.WheelEvent) => void;
	onHideHud: () => void;
	onCloseHud: () => void;
}

const iconBtnClasses = `flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none ${styles.electronNoDrag}`;
// electronNoDrag is load-bearing, not cosmetic: the whole HUD tree sits inside
// HudOverlay's `-webkit-app-region: drag` root, so without it Chromium eats
// these clicks as native window-drag gestures and the buttons never fire.
const windowBtnClasses = `flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer opacity-50 hover:opacity-90 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none ${styles.electronNoDrag}`;

export const HudSidebar = memo(function HudSidebar(props: HudSidebarProps) {
	return (
		<>
			{!props.isLinuxHud && (
				<button
					type="button"
					title={props.t("tooltips.openNotes")}
					aria-label={props.t("tooltips.openNotes")}
					disabled={props.saving}
					className={iconBtnClasses}
					onClick={() => !props.saving && props.onOpenNotes()}
				>
					<Icon name="notes" className="text-white/60" />
				</button>
			)}

			{!props.recording && (
				<button
					data-testid="launch-open-studio-button"
					disabled={props.saving}
					className={iconBtnClasses}
					onClick={() => !props.saving && props.onOpenStudio()}
					title={props.t("tooltips.openStudio")}
				>
					<Icon name="studio" className="text-white/60" />
				</button>
			)}

			<div
				className={`${props.trayLayout === "vertical" ? "mt-0.5 pt-1.5 border-t" : "ml-0.5 pl-1.5 border-l"} border-white/10 flex items-center gap-0.5 ${props.trayLayout === "vertical" ? "flex-col" : ""} ${styles.electronNoDrag} ${styles.languageMenuContainer}`}
			>
				<button
					ref={props.languageTriggerRef}
					type="button"
					aria-label={props.t("language")}
					aria-expanded={props.isLanguageMenuOpen}
					aria-haspopup="menu"
					disabled={props.saving}
					onClick={() => !props.saving && props.onToggleLanguageMenu()}
					title={props.activeLanguageLabel}
					className={`flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.045] text-white/85 hover:bg-white/10 ${props.trayLayout === "vertical" ? "w-8 justify-center px-0" : "gap-1.5 px-2"} disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none ${styles.electronNoDrag}`}
				>
					<Icon name="language" size={16} className="text-white/70" />
					<span
						className={`${props.trayLayout === "vertical" ? "sr-only" : "max-w-[54px]"} truncate text-[10px] font-semibold text-white/75`}
					>
						{props.activeLanguageLabel}
					</span>
				</button>

				{props.isLanguageMenuOpen &&
					createPortal(
						<div
							ref={props.setLanguageMenuPanelEl}
							data-hud-interactive="true"
							className={styles.languageMenuPanel}
							style={
								{
									position: "fixed",
									right: props.languageMenuStyle.right,
									top: props.languageMenuStyle.top,
									pointerEvents: "auto",
									"--language-menu-max-height": `${props.languageMenuStyle.maxHeight}px`,
								} as React.CSSProperties
							}
							onPointerDown={(event) => event.stopPropagation()}
							onPointerEnter={props.onLanguageMenuPointerEnter}
							onPointerMove={props.onLanguageMenuPointerEnter}
							onWheel={(event) => {
								props.onLanguageMenuPointerEnter();
								props.onLanguageMenuWheel(event);
							}}
						>
							<Glass
								level={3}
								role="menu"
								className={`${styles.languageMenuScroll} ${styles.electronNoDrag} w-full`}
							>
								{props.availableLocales.map((loc) => (
									<button
										key={loc}
										type="button"
										role="menuitemradio"
										aria-checked={loc === props.locale}
										onClick={() => props.onSelectLocale(loc)}
										className={`${styles.languageMenuItem} ${loc === props.locale ? styles.languageMenuItemActive : ""}`}
									>
										<span className="truncate">{props.getLocaleName(loc)}</span>
										{loc === props.locale ? (
											<Icon name="check" size={16} className="text-white/85" />
										) : null}
									</button>
								))}
							</Glass>
						</div>,
						document.body,
					)}
			</div>

			<div
				className={`flex items-center gap-0.5 ${props.trayLayout === "vertical" ? "flex-col" : ""}`}
			>
				<button
					className={windowBtnClasses}
					title={props.t("tooltips.hideHUD")}
					onClick={props.onHideHud}
					disabled={props.saving}
				>
					<Icon name="minimize" className="text-white" />
				</button>
				<button
					className={windowBtnClasses}
					title={props.t("tooltips.closeApp")}
					onClick={props.onCloseHud}
					disabled={props.saving}
				>
					<Icon name="close" className="text-white" />
				</button>
			</div>
		</>
	);
});
