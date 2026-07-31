import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Toaster } from "./sonner";

describe("Toaster", () => {
	beforeAll(() => {
		window.matchMedia =
			window.matchMedia ||
			((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener() {
					/* jsdom lacks matchMedia */
				},
				removeListener() {
					/* jsdom lacks matchMedia */
				},
				addEventListener() {
					/* jsdom lacks matchMedia */
				},
				removeEventListener() {
					/* jsdom lacks matchMedia */
				},
				dispatchEvent: () => false,
			}));
	});

	afterEach(() => {
		toast.dismiss();
	});

	it("renders toasts on the raised surface token, not the legacy black or glass", async () => {
		render(<Toaster />);
		toast.error("Boom");
		const message = await screen.findByText("Boom");
		const toastEl = message.closest("[data-sonner-toast]") as HTMLElement;
		expect(toastEl).not.toBeNull();
		expect(toastEl.className).toContain("bg-[#141416]");
		expect(toastEl.className).toContain("text-[#F5F5F7]");
		// Glass material must not leak out of the Glass primitive.
		expect(toastEl.className).not.toMatch(/backdrop-(blur|filter)/);
		expect(toastEl.className).not.toContain("#09090b");
	});
});
