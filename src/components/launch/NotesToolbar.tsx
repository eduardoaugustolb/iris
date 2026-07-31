import { CodeIcon } from "@phosphor-icons/react/dist/csr/Code";
import { ListBulletsIcon } from "@phosphor-icons/react/dist/csr/ListBullets";
import { ListNumbersIcon } from "@phosphor-icons/react/dist/csr/ListNumbers";
import { QuotesIcon } from "@phosphor-icons/react/dist/csr/Quotes";
import { TextBIcon } from "@phosphor-icons/react/dist/csr/TextB";
import { TextItalicIcon } from "@phosphor-icons/react/dist/csr/TextItalic";
import { TextStrikethroughIcon } from "@phosphor-icons/react/dist/csr/TextStrikethrough";
import type { Editor } from "@tiptap/react";
import { type ReactNode, useEffect, useReducer } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { useScopedT } from "@/contexts/I18nContext";
import { Glass } from "@/design/glass/Glass";
import { cn } from "@/lib/utils";

type NotesToolbarProps = {
	editor: Editor | null;
};

type ToolbarButtonProps = {
	"aria-label": string;
	tooltipContent: string;
	active?: boolean;
	disabled?: boolean;
	onClick: () => void;
	children: ReactNode;
};

function ToolbarButton({
	"aria-label": ariaLabel,
	tooltipContent,
	active = false,
	disabled = false,
	onClick,
	children,
}: ToolbarButtonProps) {
	return (
		<Tooltip content={tooltipContent}>
			<button
				type="button"
				aria-label={ariaLabel}
				aria-pressed={active}
				disabled={disabled}
				onClick={onClick}
				className={cn(
					"shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-[8px] border-0 bg-transparent text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35",
					active && "bg-white/15 text-white hover:bg-white/15 hover:text-white",
				)}
			>
				{children}
			</button>
		</Tooltip>
	);
}

function useEditorRevision(editor: Editor | null): void {
	const [, bumpRevision] = useReducer((revision: number) => revision + 1, 0);

	useEffect(() => {
		if (!editor) {
			return;
		}

		const handleUpdate = () => {
			bumpRevision();
		};

		editor.on("selectionUpdate", handleUpdate);
		editor.on("transaction", handleUpdate);

		return () => {
			editor.off("selectionUpdate", handleUpdate);
			editor.off("transaction", handleUpdate);
		};
	}, [editor]);
}

export function NotesToolbar({ editor }: NotesToolbarProps) {
	useEditorRevision(editor);
	const t = useScopedT("launch");

	return (
		<Glass
			level={2}
			radius="md"
			className="flex items-center gap-1 max-w-fit p-2 overflow-scroll no-scrollbar"
		>
			<div className="flex items-center justify-between flex-1 shrink-0 gap-1">
				<ToolbarButton
					aria-label={t("tooltips.notesToolbar.bold")}
					tooltipContent={t("tooltips.notesToolbar.bold")}
					active={editor?.isActive("bold") ?? false}
					disabled={!editor?.can().chain().focus().toggleBold().run()}
					onClick={() => editor?.chain().focus().toggleBold().run()}
				>
					<TextBIcon size={16} weight="regular" />
				</ToolbarButton>
				<ToolbarButton
					aria-label={t("tooltips.notesToolbar.italic")}
					tooltipContent={t("tooltips.notesToolbar.italic")}
					active={editor?.isActive("italic") ?? false}
					disabled={!editor?.can().chain().focus().toggleItalic().run()}
					onClick={() => editor?.chain().focus().toggleItalic().run()}
				>
					<TextItalicIcon size={16} weight="regular" />
				</ToolbarButton>
				<ToolbarButton
					aria-label={t("tooltips.notesToolbar.strikethrough")}
					tooltipContent={t("tooltips.notesToolbar.strikethrough")}
					active={editor?.isActive("strike") ?? false}
					disabled={!editor?.can().chain().focus().toggleStrike().run()}
					onClick={() => editor?.chain().focus().toggleStrike().run()}
				>
					<TextStrikethroughIcon size={16} weight="regular" />
				</ToolbarButton>
			</div>
			<div className="flex items-center justify-between flex-1 shrink-0 gap-1">
				<div className="h-8 w-5 grid place-content-center">
					<span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden="true" />
				</div>
				<ToolbarButton
					aria-label={t("tooltips.notesToolbar.bulletList")}
					tooltipContent={t("tooltips.notesToolbar.bulletList")}
					active={editor?.isActive("bulletList") ?? false}
					disabled={!editor?.can().chain().focus().toggleBulletList().run()}
					onClick={() => editor?.chain().focus().toggleBulletList().run()}
				>
					<ListBulletsIcon size={16} weight="regular" />
				</ToolbarButton>
				<ToolbarButton
					aria-label={t("tooltips.notesToolbar.numberedList")}
					tooltipContent={t("tooltips.notesToolbar.numberedList")}
					active={editor?.isActive("orderedList") ?? false}
					disabled={!editor?.can().chain().focus().toggleOrderedList().run()}
					onClick={() => editor?.chain().focus().toggleOrderedList().run()}
				>
					<ListNumbersIcon size={16} weight="regular" />
				</ToolbarButton>
			</div>
			<div className="flex items-center justify-between flex-1 shrink-0 gap-1">
				<div className="h-8 w-5 grid place-content-center">
					<span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden="true" />
				</div>
				<ToolbarButton
					aria-label={t("tooltips.notesToolbar.blockquote")}
					tooltipContent={t("tooltips.notesToolbar.blockquote")}
					active={editor?.isActive("blockquote") ?? false}
					disabled={!editor?.can().chain().focus().toggleBlockquote().run()}
					onClick={() => editor?.chain().focus().toggleBlockquote().run()}
				>
					<QuotesIcon size={16} weight="regular" />
				</ToolbarButton>
				<ToolbarButton
					aria-label={t("tooltips.notesToolbar.codeBlock")}
					tooltipContent={t("tooltips.notesToolbar.codeBlock")}
					active={editor?.isActive("codeBlock") ?? false}
					disabled={!editor?.can().chain().focus().toggleCodeBlock().run()}
					onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
				>
					<CodeIcon size={16} weight="regular" />
				</ToolbarButton>
			</div>
		</Glass>
	);
}
