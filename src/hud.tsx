import React from "react";
import ReactDOM from "react-dom/client";
import { LaunchWindow } from "./components/launch/LaunchWindow";
import { Toaster } from "./components/ui/sonner";
import { I18nProvider } from "./contexts/I18nContext";
import "./index.css";

// The HUD is a transparent, click-through overlay; the shell must be transparent
// from first paint or the desktop behind shows a solid rectangle.
document.body.style.background = "transparent";
document.documentElement.style.background = "transparent";
document.getElementById("root")?.style.setProperty("background", "transparent");

// Pin the document shell to the window and hide overflow so the HUD renderer
// can't introduce scrollbars (see issue #305).
document.documentElement.style.height = "100%";
document.documentElement.style.overflow = "hidden";
document.body.style.height = "100%";
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
const root = document.getElementById("root");
root?.style.setProperty("height", "100%");
root?.style.setProperty("min-height", "0");
root?.style.setProperty("overflow", "hidden");

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<I18nProvider>
			<LaunchWindow />
			<Toaster theme="dark" />
		</I18nProvider>
	</React.StrictMode>,
);
