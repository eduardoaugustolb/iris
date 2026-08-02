import type { ExportFormat, ExportQuality } from "@/lib/exporter";
import type { AspectRatio } from "@/utils/aspectRatioUtils";

// Defaults shared by the editor and the lightweight HUD entry. This lives
// outside components/video-editor so hud.html never pulls the editor SPA into
// the overlay window — enforced by noHudEntryLeak.test.ts.
export const DEFAULT_EDITOR_PADDING = 50;
export const DEFAULT_EDITOR_ASPECT_RATIO: AspectRatio = "16:9";
export const DEFAULT_EXPORT_QUALITY: ExportQuality = "good";
export const DEFAULT_EXPORT_FORMAT: ExportFormat = "mp4";
