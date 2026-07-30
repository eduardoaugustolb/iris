import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Glass } from "./Glass";

describe("Glass", () => {
	it("applies backdrop blur and the mandatory 180% saturation", () => {
		render(<Glass level={2}>content</Glass>);
		const element = screen.getByText("content");

		expect(element.style.backdropFilter).toBe("blur(24px) saturate(180%)");

		// jsdom's cssstyle package does not recognize the vendor-prefixed
		// "-webkit-backdrop-filter" property at all — element.style.setProperty
		// silently drops it, so it never reaches element.style, computed style, or
		// even the serialized "style" attribute in jsdom, regardless of how the
		// component sets it. Real browsers accept it fine. We verify the component
		// actually emits it by rendering the same element through React's
		// server-string renderer, which serializes inline styles itself and never
		// touches jsdom's CSSOM.
		const html = renderToStaticMarkup(<Glass level={2}>content</Glass>);
		expect(html).toContain("-webkit-backdrop-filter:blur(24px) saturate(180%)");
	});

	it("scales backdrop blur with the elevation level", () => {
		const { rerender } = render(<Glass level={1}>content</Glass>);
		expect(screen.getByText("content").style.backdropFilter).toContain("blur(12px)");

		rerender(<Glass level={3}>content</Glass>);
		expect(screen.getByText("content").style.backdropFilter).toContain("blur(40px)");
	});

	it("tints the surface within the 0.06 to 0.12 band, never outside it", () => {
		render(<Glass level={2}>content</Glass>);

		expect(screen.getByText("content").style.background).toBe("rgba(255, 255, 255, 0.08)");
	});

	it("makes the top border lighter than the others, so the material reads as thick", () => {
		render(<Glass level={2}>content</Glass>);
		const element = screen.getByText("content");

		// jsdom (correctly, matching real CSSOM spec behaviour) only serializes the
		// "border" shorthand back out when all four sides are identical. Since the
		// top border is intentionally lighter than the other three, the shorthand
		// getter returns "" both here and in a real browser — asserting on it would
		// test CSSOM serialization rules, not this component. We assert on the
		// underlying longhand values instead, which is what actually encodes the
		// "top border lighter than the rest" requirement.
		expect(element.style.borderWidth).toBe("0.5px");
		expect(element.style.borderStyle).toBe("solid");
		expect(element.style.borderTopColor).toBe("rgba(255, 255, 255, 0.24)");
		expect(element.style.borderRightColor).toBe("rgba(255, 255, 255, 0.14)");
		expect(element.style.borderBottomColor).toBe("rgba(255, 255, 255, 0.14)");
		expect(element.style.borderLeftColor).toBe("rgba(255, 255, 255, 0.14)");
	});

	it("raises shadow blur together with backdrop blur", () => {
		render(<Glass level={3}>content</Glass>);

		expect(screen.getByText("content").style.boxShadow).toContain("48px");
	});

	it("defaults to the large radius and honours an override", () => {
		const { rerender } = render(<Glass level={2}>content</Glass>);
		expect(screen.getByText("content").style.borderRadius).toBe("20px");

		rerender(
			<Glass level={2} radius="xl">
				content
			</Glass>,
		);
		expect(screen.getByText("content").style.borderRadius).toBe("28px");
	});

	it("marks itself so nested glass can be detected", () => {
		render(<Glass level={2}>content</Glass>);

		expect(screen.getByText("content")).toHaveAttribute("data-iris-glass", "2");
	});
});
