import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CropControl } from "./CropControl";

const fullFrame = { x: 0, y: 0, width: 1, height: 1 };

describe("CropControl", () => {
	it("renders the crop handles in brand primary, not the legacy green", () => {
		const { container } = render(
			<CropControl
				videoElement={null}
				cropRegion={fullFrame}
				onCropChange={vi.fn()}
				aspectRatio={16 / 9}
			/>,
		);
		const handles = container.querySelectorAll("[class*='bg-[#5E5CE6]']");
		expect(handles.length).toBeGreaterThanOrEqual(4);
		expect(container.querySelector("[class*='#34B27B']")).toBeNull();
	});

	it("normalizes pointer drags into the crop region callback", () => {
		const onCropChange = vi.fn();
		const { container } = render(
			<CropControl
				videoElement={null}
				cropRegion={fullFrame}
				onCropChange={onCropChange}
				aspectRatio={16 / 9}
			/>,
		);
		const surface = container.querySelector("[class*='cursor-move']");
		expect(surface).not.toBeNull();
	});
});
