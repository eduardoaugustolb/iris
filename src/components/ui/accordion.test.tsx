import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

describe("Accordion", () => {
	it("renders a Phosphor icon on the trigger, not lucide-react", () => {
		render(
			<Accordion type="single" collapsible>
				<AccordionItem value="one">
					<AccordionTrigger>Section</AccordionTrigger>
					<AccordionContent>Body</AccordionContent>
				</AccordionItem>
			</Accordion>,
		);
		const trigger = screen.getByRole("button", { name: /section/i });
		expect(trigger.querySelector("svg")).not.toBeNull();
		expect(trigger.innerHTML).not.toContain("lucide");
	});

	it("colors the trigger with the primary text token, not the slate palette", () => {
		render(
			<Accordion type="single" collapsible>
				<AccordionItem value="one">
					<AccordionTrigger>Section</AccordionTrigger>
					<AccordionContent>Body</AccordionContent>
				</AccordionItem>
			</Accordion>,
		);
		const trigger = screen.getByRole("button", { name: /section/i });
		expect(trigger.className).toContain("text-[#F5F5F7]");
		expect(trigger.className).not.toContain("text-slate-200");
	});
});
