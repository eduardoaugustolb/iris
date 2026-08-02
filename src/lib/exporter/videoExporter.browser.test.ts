import { describe, expect, it } from "vitest";
import { WebDemuxer } from "web-demuxer";
import sampleVideoUrl from "../../../tests/fixtures/sample.webm?url";
import { BackgroundLoadError } from "../wallpaper";
import type { ExportProgress } from "./types";
import { avcCodecStringFromFirstPacket, VideoExporter } from "./videoExporter";

/** Records a short H.264 WebM through the real MediaRecorder — the same format the
 *  Linux screen recorder and webcam sidecars produce. */
async function recordWebm(options: { withAudio: boolean }): Promise<{
	blob: Blob;
	hasAudioTrack: boolean;
}> {
	const canvas = document.createElement("canvas");
	canvas.width = 320;
	canvas.height = 240;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("2d context unavailable");
	}

	const videoStream = canvas.captureStream(30);

	let audioContext: AudioContext | null = null;
	let oscillator: OscillatorNode | null = null;
	let audioTrack: MediaStreamTrack | null = null;
	if (options.withAudio) {
		audioContext = new AudioContext();
		if (audioContext.state === "suspended") {
			await audioContext.resume().catch(() => undefined);
		}
		oscillator = audioContext.createOscillator();
		oscillator.frequency.value = 440;
		const destination = audioContext.createMediaStreamDestination();
		oscillator.connect(destination);
		oscillator.start();
		audioTrack = destination.stream.getAudioTracks()[0];
	}

	const tracks: MediaStreamTrack[] = [videoStream.getVideoTracks()[0]];
	if (audioTrack) {
		tracks.push(audioTrack);
	}

	const mimeType = options.withAudio ? "video/webm;codecs=h264,opus" : "video/webm;codecs=h264";
	const recorder = new MediaRecorder(new MediaStream(tracks), {
		mimeType,
		videoBitsPerSecond: 1_000_000,
	});
	const chunks: Blob[] = [];
	recorder.ondataavailable = (event) => {
		if (event.data.size > 0) {
			chunks.push(event.data);
		}
	};
	const stopped = new Promise<void>((resolve) => {
		recorder.onstop = () => resolve();
	});
	recorder.start();

	let frame = 0;
	await new Promise<void>((resolve) => {
		const draw = () => {
			ctx.fillStyle = `hsl(${(frame * 30) % 360}, 80%, 50%)`;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			frame += 1;
			if (frame < 30) {
				requestAnimationFrame(draw);
			} else {
				resolve();
			}
		};
		draw();
	});
	await new Promise((resolve) => setTimeout(resolve, 50));
	recorder.stop();
	await stopped;

	oscillator?.stop();
	await audioContext?.close().catch(() => undefined);
	audioTrack?.stop();
	videoStream.getTracks().forEach((track) => track.stop());

	return {
		blob: new Blob(chunks, { type: recorder.mimeType || "video/webm" }),
		hasAudioTrack: Boolean(audioTrack),
	};
}

function wasmUrl(): string {
	return new URL("./wasm/web-demuxer.wasm", window.location.href).href;
}

/** Reads the packet counts and codecs straight off a container without decoding. */
async function containerInfo(blob: Blob, filename: string) {
	const demuxer = new WebDemuxer({ wasmFilePath: wasmUrl() });
	try {
		await demuxer.load(
			new File([blob], filename, { type: blob.type || "application/octet-stream" }),
		);
		const info = await demuxer.getMediaInfo();
		const videoStream = info.streams.find((s) => s.codec_type_string === "video");
		const hasAudioStream = info.streams.some((s) => s.codec_type_string === "audio");

		let videoPackets = 0;
		// web-demuxer reports H.264 codecs in a non-standard form; derive the RFC 6381
		// string from the first packet's SPS so it can be compared with the output.
		let videoRfcCodec: string | null = null;
		const videoReader = demuxer.read("video").getReader();
		try {
			for (let i = 0; i < 100_000; i += 1) {
				const { done, value } = await videoReader.read();
				if (done || !value) break;
				if (i === 0) {
					videoRfcCodec = avcCodecStringFromFirstPacket(value);
				}
				videoPackets += 1;
			}
		} finally {
			await videoReader.cancel().catch(() => undefined);
		}

		let audioPackets = 0;
		if (hasAudioStream) {
			const audioReader = demuxer.read("audio").getReader();
			try {
				for (let i = 0; i < 100_000; i += 1) {
					const { done, value } = await audioReader.read();
					if (done || !value) break;
					audioPackets += 1;
				}
			} finally {
				await audioReader.cancel().catch(() => undefined);
			}
		}

		return { videoCodec: videoStream?.codec_string, videoRfcCodec, videoPackets, audioPackets };
	} finally {
		demuxer.destroy();
	}
}

/** Re-demuxes an MP4 and decodes both tracks, proving the output is playable. */
async function decodedMp4Info(blob: Blob) {
	const demuxer = new WebDemuxer({ wasmFilePath: wasmUrl() });
	try {
		const file = new File([blob], "out.mp4", { type: "video/mp4" });
		await demuxer.load(file);
		const info = await demuxer.getMediaInfo();
		const videoStream = info.streams.find((s) => s.codec_type_string === "video");
		const audioStream = info.streams.find((s) => s.codec_type_string === "audio");

		const ftyp = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(4, 8));

		const videoConfig = await demuxer.getDecoderConfig("video");
		let videoFrames = 0;
		await new Promise<void>((resolve, reject) => {
			const decoder = new VideoDecoder({
				output: (frame) => {
					videoFrames += 1;
					frame.close();
				},
				error: (error) => reject(new Error(`VideoDecoder: ${error.message}`)),
			});
			decoder.configure(videoConfig);
			const reader = demuxer.read("video", 0, 10).getReader();
			void (async () => {
				try {
					for (let i = 0; i < 100_000; i += 1) {
						const { done, value } = await reader.read();
						if (done || !value) break;
						decoder.decode(value);
					}
					await reader.cancel();
					await decoder.flush();
					decoder.close();
					resolve();
				} catch (error) {
					reject(error);
				}
			})();
		});

		let audioCodec: string | undefined;
		let audioFrames = 0;
		if (audioStream) {
			const audioConfig = await demuxer.getDecoderConfig("audio");
			audioCodec = audioConfig?.codec;
			if (audioConfig) {
				await new Promise<void>((resolve, reject) => {
					const decoder = new AudioDecoder({
						output: (data) => {
							audioFrames += 1;
							data.close();
						},
						error: (error) => reject(new Error(`AudioDecoder: ${error.message}`)),
					});
					decoder.configure(audioConfig);
					const reader = demuxer.read("audio", 0, 10).getReader();
					void (async () => {
						try {
							for (let i = 0; i < 100_000; i += 1) {
								const { done, value } = await reader.read();
								if (done || !value) break;
								decoder.decode(value);
							}
							await reader.cancel();
							await decoder.flush();
							decoder.close();
							resolve();
						} catch (error) {
							reject(error);
						}
					})();
				});
			}
		}

		return {
			ftyp,
			videoCodec: videoStream?.codec_string,
			videoWidth: videoStream?.width,
			videoHeight: videoStream?.height,
			videoFrames,
			audioCodec,
			audioFrames,
		};
	} finally {
		demuxer.destroy();
	}
}

function exporterConfig(videoUrl: string, onProgress?: (p: ExportProgress) => void) {
	return {
		videoUrl,
		width: 320,
		height: 240,
		frameRate: 30,
		bitrate: 1_000_000,
		wallpaper: "#1a1a2e",
		zoomRegions: [],
		showShadow: false,
		shadowIntensity: 0,
		showBlur: false,
		cropRegion: { x: 0, y: 0, width: 1, height: 1 },
		...(onProgress ? { onProgress } : {}),
	};
}

describe("VideoExporter (real browser)", () => {
	it("exports a valid MP4 blob from a real video", async () => {
		const progressEvents: ExportProgress[] = [];

		const exporter = new VideoExporter({
			videoUrl: sampleVideoUrl,
			width: 320,
			height: 180,
			frameRate: 15,
			bitrate: 1_000_000,
			wallpaper: "#1a1a2e",
			zoomRegions: [],
			showShadow: false,
			shadowIntensity: 0,
			showBlur: false,
			cropRegion: { x: 0, y: 0, width: 1, height: 1 },
			onProgress: (p) => progressEvents.push(p),
		});

		const result = await exporter.export();

		expect(result.success, result.error).toBe(true);
		expect(result.blob).toBeInstanceOf(Blob);

		const buf = await result.blob!.arrayBuffer();
		const bytes = new Uint8Array(buf);
		const ftyp = new TextDecoder().decode(bytes.slice(4, 8));
		expect(ftyp).toBe("ftyp");

		expect(result.blob!.size).toBeGreaterThan(1024);

		expect(progressEvents.length).toBeGreaterThan(0);

		const finalizing = progressEvents.filter((p) => p.phase === "finalizing");
		expect(finalizing.length).toBeGreaterThan(0);
		expect(finalizing.at(-1)!.percentage).toBe(100);
	});

	it("exports successfully with an image wallpaper (served by Vite dev server)", async () => {
		const exporter = new VideoExporter({
			videoUrl: sampleVideoUrl,
			width: 320,
			height: 180,
			frameRate: 15,
			bitrate: 1_000_000,
			wallpaper: "/wallpapers/wallpaper1.jpg",
			zoomRegions: [],
			showShadow: false,
			shadowIntensity: 0,
			showBlur: false,
			cropRegion: { x: 0, y: 0, width: 1, height: 1 },
		});

		const result = await exporter.export();
		expect(result.success, result.error).toBe(true);
		expect(result.blob!.size).toBeGreaterThan(1024);
	});

	it("throws BackgroundLoadError when wallpaper fails to load (no silent black fallback)", async () => {
		const exporter = new VideoExporter({
			videoUrl: sampleVideoUrl,
			width: 320,
			height: 180,
			frameRate: 15,
			bitrate: 1_000_000,
			wallpaper: "/wallpapers/does-not-exist.jpg",
			zoomRegions: [],
			showShadow: false,
			shadowIntensity: 0,
			showBlur: false,
			cropRegion: { x: 0, y: 0, width: 1, height: 1 },
		});

		const rejection = exporter.export();
		await expect(rejection).rejects.toBeInstanceOf(BackgroundLoadError);
		await expect(rejection).rejects.toMatchObject({
			url: expect.stringContaining("does-not-exist"),
		});
	});

	it("losslessly remuxes a MediaRecorder H.264 WebM into MP4 (no re-encode)", async () => {
		if (!MediaRecorder.isTypeSupported("video/webm;codecs=h264")) {
			return;
		}

		const source = await recordWebm({ withAudio: false });
		const sourceInfo = await containerInfo(source.blob, "rec.webm");
		expect(sourceInfo.videoCodec).toMatch(/^avc1\./);

		const sourceUrl = URL.createObjectURL(source.blob);
		try {
			const progressEvents: ExportProgress[] = [];
			const exporter = new VideoExporter(exporterConfig(sourceUrl, (p) => progressEvents.push(p)));

			const result = await exporter.export();
			expect(result.success, result.error).toBe(true);
			expect(result.blob).toBeInstanceOf(Blob);

			const out = await decodedMp4Info(result.blob!);
			expect(out.ftyp).toBe("ftyp");
			// A remux keeps the source codec bit-exact; a re-encode would emit avc1.640033.
			expect(out.videoCodec).toBe(sourceInfo.videoRfcCodec);
			expect(out.videoWidth).toBe(320);
			expect(out.videoHeight).toBe(240);
			expect(out.videoFrames).toBe(sourceInfo.videoPackets);
			expect(out.videoFrames).toBeGreaterThan(0);
			expect(out.audioCodec).toBeUndefined();

			// The remux path decodes nothing: a single "extracting" head then a single
			// 100% "finalizing" event, no render/encode progress in between.
			const extracting = progressEvents.filter((p) => p.phase === "extracting");
			const finalizing = progressEvents.filter((p) => p.phase === "finalizing");
			expect(extracting.length).toBeGreaterThan(0);
			expect(finalizing).toHaveLength(1);
			expect(finalizing[0].percentage).toBe(100);
		} finally {
			URL.revokeObjectURL(sourceUrl);
		}
	});

	it("carries the Opus audio track through the H.264 WebM remux", async () => {
		if (!MediaRecorder.isTypeSupported("video/webm;codecs=h264,opus")) {
			return;
		}

		const source = await recordWebm({ withAudio: true });
		expect(source.hasAudioTrack).toBe(true);
		const sourceInfo = await containerInfo(source.blob, "rec.webm");
		expect(sourceInfo.audioPackets).toBeGreaterThan(0);

		const sourceUrl = URL.createObjectURL(source.blob);
		try {
			const exporter = new VideoExporter(exporterConfig(sourceUrl));

			const result = await exporter.export();
			expect(result.success, result.error).toBe(true);

			const out = await decodedMp4Info(result.blob!);
			expect(out.ftyp).toBe("ftyp");
			expect(out.videoCodec).toBe(sourceInfo.videoRfcCodec);
			expect(out.audioCodec).toBe("opus");
			expect(out.audioFrames).toBeGreaterThan(0);
		} finally {
			URL.revokeObjectURL(sourceUrl);
		}
	});
});
