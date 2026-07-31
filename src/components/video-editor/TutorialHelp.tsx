import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { QuestionIcon } from "@phosphor-icons/react/dist/csr/Question";
import { ScissorsIcon } from "@phosphor-icons/react/dist/csr/Scissors";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";

export function TutorialHelp() {
	const t = useScopedT("dialogs");
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-xs text-[var(--text-secondary)] hover:text-[#F5F5F7] hover:bg-white/10 transition-all gap-1.5"
				>
					<QuestionIcon size={14} weight="regular" />
					<span className="font-medium">{t("tutorial.triggerLabel")}</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold flex items-center gap-2">
						<ScissorsIcon size={20} weight="regular" className="text-[#FF453A]" />{" "}
						{t("tutorial.title")}
					</DialogTitle>
					<DialogDescription>{t("tutorial.description")}</DialogDescription>
				</DialogHeader>
				<div className="mt-4 space-y-8">
					{/* Explanation */}
					<div className="bg-white/5 rounded-lg p-4 border border-white/5">
						<p className="text-[#F5F5F7] leading-relaxed">
							{t("tutorial.explanationBefore")}
							<span className="text-[#FF453A] font-bold"> {t("tutorial.remove")}</span>
							{t("tutorial.explanationMiddle")}
							<span className="text-[#FF453A] font-bold"> {t("tutorial.covered")}</span>
							{t("tutorial.explanationAfter")}
						</p>
					</div>
					{/* Visual Illustration */}
					<div className="space-y-2">
						<h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">
							{t("tutorial.visualExample")}
						</h3>
						<div className="relative h-24 bg-black rounded-lg border border-white/10 flex items-center px-4 overflow-hidden select-none">
							{/* Background track (Kept parts) */}
							<div className="absolute inset-x-4 h-2 bg-white/20 rounded-full overflow-hidden">
								{/* Solid line representing video */}
							</div>
							{/* Removed Segment 1 */}
							<div
								className="absolute left-[20%] h-8 bg-[#FF453A]/20 border border-[#FF453A] rounded flex flex-col items-center justify-center z-10"
								style={{ width: "20%" }}
							>
								<span className="text-[10px] font-bold text-[#FF453A] bg-black/50 px-1 rounded">
									{t("tutorial.removed")}
								</span>
							</div>
							{/* Removed Segment 2 */}
							<div
								className="absolute left-[65%] h-8 bg-[#FF453A]/20 border border-[#FF453A] rounded flex flex-col items-center justify-center z-10"
								style={{ width: "15%" }}
							>
								<span className="text-[10px] font-bold text-[#FF453A] bg-black/50 px-1 rounded">
									{t("tutorial.removed")}
								</span>
							</div>
							{/* Labels for kept parts */}
							<div className="absolute left-[5%] text-[10px] text-[var(--text-secondary)] font-medium">
								{t("tutorial.kept")}
							</div>
							<div className="absolute left-[50%] text-[10px] text-[var(--text-secondary)] font-medium">
								{t("tutorial.kept")}
							</div>
							<div className="absolute left-[90%] text-[10px] text-[var(--text-secondary)] font-medium">
								{t("tutorial.kept")}
							</div>
						</div>
						<div className="flex justify-center mt-2">
							<ArrowRightIcon
								size={16}
								weight="regular"
								className="text-[var(--text-tertiary)] rotate-90"
							/>
						</div>
						{/* Result */}
						<div className="relative h-12 bg-black rounded-lg border border-white/10 flex items-center justify-center gap-1 px-4 select-none">
							<div
								className="h-8 bg-white/10 rounded flex items-center justify-center opacity-80"
								style={{ width: "30%" }}
							>
								<span className="text-[10px] text-white font-medium">{t("tutorial.part1")}</span>
							</div>
							<div
								className="h-8 bg-white/10 rounded flex items-center justify-center opacity-80"
								style={{ width: "30%" }}
							>
								<span className="text-[10px] text-white font-medium">{t("tutorial.part2")}</span>
							</div>
							<div
								className="h-8 bg-white/10 rounded flex items-center justify-center opacity-80"
								style={{ width: "30%" }}
							>
								<span className="text-[10px] text-white font-medium">{t("tutorial.part3")}</span>
							</div>
							<span className="absolute right-4 text-xs text-[var(--text-secondary)]">
								{t("tutorial.finalVideo")}
							</span>
						</div>
					</div>
					{/* Steps */}
					<div className="grid grid-cols-2 gap-4">
						<div className="p-3 rounded bg-white/5 border border-white/5">
							<div className="text-[#FF453A] font-bold mb-1">{t("tutorial.step1Title")}</div>
							<p className="text-xs text-[var(--text-secondary)]">
								{t("tutorial.step1DescriptionBefore")}
								<kbd className="bg-white/10 px-1 rounded text-[#F5F5F7]">T</kbd>
								{t("tutorial.step1DescriptionAfter")}
							</p>
						</div>
						<div className="p-3 rounded bg-white/5 border border-white/5">
							<div className="text-[#FF453A] font-bold mb-1">{t("tutorial.step2Title")}</div>
							<p className="text-xs text-[var(--text-secondary)]">
								{t("tutorial.step2Description")}
							</p>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
