import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

describe("Card", () => {
	it("paints the surface with the raised token and radius-xl, not the shadcn theme", () => {
		render(
			<Card>
				<CardHeader>
					<CardTitle>Title</CardTitle>
					<CardDescription>Description</CardDescription>
				</CardHeader>
				<CardContent>Body</CardContent>
			</Card>,
		);
		const title = screen.getByText("Title");
		const card = title.closest("div.rounded-\\[20px\\]");
		expect(card).not.toBeNull();
		expect(card?.className).toContain("bg-[#141416]");
		expect(card?.className).toContain("text-[#F5F5F7]");
		expect(card?.className).not.toMatch(/bg-card\b/);
	});

	it("uses the text-secondary token for descriptions", () => {
		render(
			<Card>
				<CardHeader>
					<CardTitle>Title</CardTitle>
					<CardDescription>Description</CardDescription>
				</CardHeader>
			</Card>,
		);
		expect(screen.getByText("Description").className).toContain("text-[var(--text-secondary)]");
	});
});
