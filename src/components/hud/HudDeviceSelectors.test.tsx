import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HudDeviceSelectors, type HudDeviceSelectorsProps } from "./HudDeviceSelectors";

const t = ((key: string) => key) as HudDeviceSelectorsProps["t"];

const baseProps: HudDeviceSelectorsProps = {
	t,
	trayLayout: "horizontal",
	hudBarHeight: 60,
	setDeviceSelectorEl: vi.fn(),
	showMicControls: false,
	micExpanded: false,
	onMicMouseEnter: vi.fn(),
	onMicMouseLeave: vi.fn(),
	onMicFocus: vi.fn(),
	onMicBlur: vi.fn(),
	selectedMicLabel: "Default",
	microphoneDeviceId: undefined,
	selectedMicId: "default",
	micDevices: [],
	onMicDeviceChange: vi.fn(),
	micLevel: 0,
	showWebcamControls: false,
	webcamExpanded: false,
	onWebcamMouseEnter: vi.fn(),
	onWebcamMouseLeave: vi.fn(),
	onWebcamFocus: vi.fn(),
	onWebcamBlur: vi.fn(),
	selectedCameraLabel: "Default",
	webcamDeviceId: undefined,
	selectedCameraId: "",
	cameraDevices: [],
	isCameraDevicesLoading: false,
	cameraDevicesError: null,
	onCameraDeviceChange: vi.fn(),
};

describe("HudDeviceSelectors", () => {
	it("renders nothing when neither selector is shown", () => {
		const { container } = render(<HudDeviceSelectors {...baseProps} />);
		expect(container).toBeEmptyDOMElement();
	});

	it("shows the mic selector and reports device changes", () => {
		const onChange = vi.fn();
		render(
			<HudDeviceSelectors
				{...baseProps}
				showMicControls={true}
				micExpanded={true}
				micDevices={[
					{ deviceId: "default", label: "Default Mic" },
					{ deviceId: "abc", label: "USB Mic" },
				]}
				onMicDeviceChange={onChange}
			/>,
		);
		fireEvent.change(screen.getByDisplayValue("Default Mic"), {
			target: { value: "abc" },
		});
		expect(onChange).toHaveBeenCalledWith("abc");
	});

	it("shows the webcam selector and reports device changes", () => {
		const onChange = vi.fn();
		render(
			<HudDeviceSelectors
				{...baseProps}
				showWebcamControls={true}
				webcamExpanded={true}
				selectedCameraId="default"
				cameraDevices={[
					{ deviceId: "default", label: "Default Camera" },
					{ deviceId: "cam1", label: "FaceTime HD" },
				]}
				onCameraDeviceChange={onChange}
			/>,
		);
		fireEvent.change(screen.getByDisplayValue("Default Camera"), {
			target: { value: "cam1" },
		});
		expect(onChange).toHaveBeenCalledWith("cam1");
	});
});
