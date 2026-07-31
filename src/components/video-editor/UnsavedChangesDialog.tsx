import { FloppyDiskIcon } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";

interface UnsavedChangesDialogProps {
	isOpen: boolean;
	variant?: "close" | "newProject" | "loadProject";
	onSaveAndClose: () => void;
	onDiscardAndClose: () => void;
	onCancel: () => void;
}

export function UnsavedChangesDialog({
	isOpen,
	variant = "close",
	onSaveAndClose,
	onDiscardAndClose,
	onCancel,
}: UnsavedChangesDialogProps) {
	const td = useScopedT("dialogs");
	const tc = useScopedT("common");

	const detail =
		variant === "newProject"
			? td("unsavedChanges.detailNewProject")
			: variant === "loadProject"
				? td("unsavedChanges.detailLoadProject")
				: td("unsavedChanges.detail");
	const saveLabel =
		variant === "newProject"
			? td("unsavedChanges.saveAndNewProject")
			: variant === "loadProject"
				? td("unsavedChanges.saveAndLoadProject")
				: td("unsavedChanges.saveAndClose");
	const discardLabel =
		variant === "newProject"
			? td("unsavedChanges.discardAndNewProject")
			: variant === "loadProject"
				? td("unsavedChanges.discardAndLoadProject")
				: td("unsavedChanges.discardAndClose");

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="rounded-2xl max-w-sm p-6 gap-0">
				<DialogHeader className="mb-5">
					<div className="flex items-center gap-3">
						<img
							src="./iris.png"
							alt=""
							aria-hidden="true"
							className="w-9 h-9 rounded-xl flex-shrink-0"
						/>
						<DialogTitle className="text-base font-semibold text-[#F5F5F7] leading-tight">
							{td("unsavedChanges.title")}
						</DialogTitle>
					</div>
				</DialogHeader>

				<p className="text-sm text-[#F5F5F7] mb-1">{td("unsavedChanges.message")}</p>
				<DialogDescription className="text-sm text-[var(--text-secondary)] mb-6">
					{detail}
				</DialogDescription>

				<div className="flex flex-col gap-2">
					<Button type="button" onClick={onSaveAndClose} className="w-full">
						<FloppyDiskIcon />
						{saveLabel}
					</Button>
					<Button
						type="button"
						onClick={onDiscardAndClose}
						className="w-full bg-[#FF453A]/10 text-[#FF453A] border border-[#FF453A]/20 hover:bg-[#FF453A]/20"
					>
						<TrashIcon />
						{discardLabel}
					</Button>
					<Button
						type="button"
						onClick={onCancel}
						variant="ghost"
						className="w-full text-[var(--text-secondary)] hover:text-[#F5F5F7]"
					>
						{tc("actions.cancel")}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
