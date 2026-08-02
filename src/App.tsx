import { ApertureIcon } from "@phosphor-icons/react/dist/csr/Aperture";
import { lazy, Suspense, useEffect, useState } from "react";
import { CountdownOverlay } from "./components/launch/CountdownOverlay.tsx";
import { NotesWindow } from "./components/launch/NotesWindow.tsx";
import { SourceSelector } from "./components/launch/SourceSelector";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { useScopedT } from "./contexts/I18nContext";
import { ShortcutsProvider } from "./contexts/ShortcutsContext";
import { loadAllCustomFonts } from "./lib/customFonts";

const VideoEditor = lazy(() => import("./components/video-editor/VideoEditor"));
const ShortcutsConfigDialog = lazy(() =>
	import("./components/video-editor/ShortcutsConfigDialog").then((module) => ({
		default: module.ShortcutsConfigDialog,
	})),
);

export default function App() {
	const [windowType, setWindowType] = useState(
		() => new URLSearchParams(window.location.search).get("windowType") || "",
	);
	const showNotes = new URLSearchParams(window.location.search).get("showNotes") === "true";

	const tEditor = useScopedT("editor");

	useEffect(() => {
		const type = new URLSearchParams(window.location.search).get("windowType") || "";
		if (type !== windowType) {
			setWindowType(type);
		}
	}, [windowType]);

	useEffect(() => {
		// Only the editor renders user-imported fonts; the light windows
		// (source-selector, countdown-overlay, notes) shouldn't pay for them.
		if (windowType !== "editor") return;
		loadAllCustomFonts().catch((error) => {
			console.error("Failed to load custom fonts:", error);
		});
	}, [windowType]);

	const content = (() => {
		switch (windowType) {
			case "source-selector":
				return <SourceSelector />;
			case "countdown-overlay":
				return <CountdownOverlay />;
			case "editor":
				return (
					<ShortcutsProvider>
						<Suspense
							fallback={
								<div className="flex flex-col items-center justify-center gap-3 h-screen bg-[#0A0A0C]">
									<ApertureIcon
										className="animate-spin text-[#5E5CE6]"
										size={28}
										weight="regular"
									/>
									<span className="text-sm text-[var(--text-secondary)]">
										{tEditor("loadingEditor")}
									</span>
								</div>
							}
						>
							<VideoEditor />
							<ShortcutsConfigDialog />
						</Suspense>
					</ShortcutsProvider>
				);
			default:
				return (
					<div className="h-screen w-full flex flex-col items-center justify-center gap-3 bg-[#0A0A0C]">
						<ApertureIcon className="text-[#5E5CE6]" size={32} weight="regular" />
						<h1 className="text-[15px] font-semibold tracking-tight text-[#F5F5F7]">Íris</h1>
					</div>
				);
		}
	})();

	return (
		<TooltipProvider>
			{showNotes ? <NotesWindow /> : content}
			<Toaster theme="dark" />
		</TooltipProvider>
	);
}
