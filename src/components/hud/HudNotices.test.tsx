import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HudNotices } from "./HudNotices";

const t = ((key: string) => key) as HudNoticesProps["t"];

import type { HudNoticesProps } from "./HudNotices";

describe("HudNotices", () => {
	it("renders nothing when there is no suggestion or notice", () => {
		const { container } = render(
			<HudNotices
				t={t}
				systemLocaleSuggestion={null}
				suggestedLanguageName=""
				onAcceptSystemLocale={vi.fn()}
				onDismissSystemLocale={vi.fn()}
				setSystemLocalePromptEl={vi.fn()}
				softwareEncoderFallbackNoticeVisible={false}
				onDismissSoftwareFallback={vi.fn()}
				setSoftwareFallbackNoticeEl={vi.fn()}
			/>,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("renders the system locale prompt and wires its buttons", () => {
		const onAccept = vi.fn();
		const onDismiss = vi.fn();
		render(
			<HudNotices
				t={t}
				systemLocaleSuggestion="pt-BR"
				suggestedLanguageName="Português"
				onAcceptSystemLocale={onAccept}
				onDismissSystemLocale={onDismiss}
				setSystemLocalePromptEl={vi.fn()}
				softwareEncoderFallbackNoticeVisible={false}
				onDismissSoftwareFallback={vi.fn()}
				setSoftwareFallbackNoticeEl={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("systemLanguagePrompt.switch"));
		expect(onAccept).toHaveBeenCalledTimes(1);
		fireEvent.click(screen.getByText("systemLanguagePrompt.keepDefault"));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("renders the software encoder fallback notice and wires its buttons", () => {
		const onDismiss = vi.fn();
		render(
			<HudNotices
				t={t}
				systemLocaleSuggestion={null}
				suggestedLanguageName=""
				onAcceptSystemLocale={vi.fn()}
				onDismissSystemLocale={vi.fn()}
				setSystemLocalePromptEl={vi.fn()}
				softwareEncoderFallbackNoticeVisible={true}
				onDismissSoftwareFallback={onDismiss}
				setSoftwareFallbackNoticeEl={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("softwareEncoderFallback.dismiss"));
		expect(onDismiss).toHaveBeenCalledWith();
		fireEvent.click(screen.getByText("softwareEncoderFallback.dontShowAgain"));
		expect(onDismiss).toHaveBeenCalledWith(true);
	});
});
