import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

describe("Tabs", () => {
	it("paints the active trigger on the raised surface, not the shadcn background", () => {
		render(
			<Tabs defaultValue="one">
				<TabsList>
					<TabsTrigger value="one">One</TabsTrigger>
					<TabsTrigger value="two">Two</TabsTrigger>
				</TabsList>
				<TabsContent value="one">Body one</TabsContent>
			</Tabs>,
		);
		const active = screen.getByRole("tab", { selected: true });
		expect(active.className).toContain("data-[state=active]:bg-[#141416]");
		expect(active.className).not.toContain("bg-background");

		const list = screen.getByRole("tablist");
		expect(list.className).toContain("bg-white/10");
		expect(list.className).not.toContain("bg-muted");
	});
});
