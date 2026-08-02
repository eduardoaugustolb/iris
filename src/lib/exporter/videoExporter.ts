import {
	BufferTarget,
	EncodedAudioPacketSource,
	EncodedPacket,
	EncodedVideoPacketSource,
	Mp4OutputFormat,
	Output,
} from "mediabunny";
import type {
	AnnotationRegion,
	CameraFullscreenRegion,
	CropRegion,
	SpeedRegion,
	TrimRegion,
	WebcamLayoutPreset,
	WebcamSizePreset,
	ZoomRegion,
} from "@/components/video-editor/types";
import { BackgroundLoadError } from "@/lib/wallpaper";
import type { CursorRecordingData } from "@/native/contracts";
import { getPlatform } from "@/utils/platformUtils";
import { AudioProcessor } from "./audioEncoder";
import { FrameRenderer } from "./frameRenderer";
import { VideoMuxer } from "./muxer";
import { MAX_IN_MEMORY_SOURCE_BYTES } from "./sourceFileLimits";
import { StreamingVideoDecoder } from "./streamingDecoder";
import { TimestampedVideoFrameQueue } from "./timestampedVideoFrameQueue";
import type { ExportConfig, ExportProgress, ExportResult } from "./types";

const ENCODER_STALL_TIMEOUT_MS = 15_000;
const ENCODER_FLUSH_TIMEOUT_MS = 20_000;

/**
 * Waits for the encoder's queue to drain below maxEncodeQueue before returning.
 *
 * The stall timer starts fresh on each call (not from the encoder's last output), so a
 * long gap before this call — e.g. the decoder discarding frames inside a trim region —
 * doesn't get blamed on the encoder once real frames resume.
 */
export async function waitForEncoderQueueSpace(params: {
	getQueueSize: () => number;
	maxEncodeQueue: number;
	isCancelled: () => boolean;
	encoderPreference: HardwareAcceleration;
	now?: () => number;
	sleep?: (ms: number) => Promise<void>;
}): Promise<void> {
	const now = params.now ?? Date.now;
	const sleep = params.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

	const stallWaitStartAt = now();
	while (params.getQueueSize() >= params.maxEncodeQueue && !params.isCancelled()) {
		if (now() - stallWaitStartAt > ENCODER_STALL_TIMEOUT_MS) {
			throw new Error(
				params.encoderPreference === "prefer-hardware"
					? "The hardware video encoder stopped responding. Retrying with a safer encoder."
					: "The video encoder stopped responding during export.",
			);
		}
		await sleep(5);
	}
}

export interface VideoExporterConfig extends ExportConfig {
	videoUrl: string;
	webcamVideoUrl?: string;
	wallpaper: string;
	zoomRegions: ZoomRegion[];
	cameraFullscreenRegions?: CameraFullscreenRegion[];
	trimRegions?: TrimRegion[];
	speedRegions?: SpeedRegion[];
	showShadow: boolean;
	shadowIntensity: number;
	showBlur: boolean;
	motionBlurAmount?: number;
	borderRadius?: number;
	padding?: number;
	videoPadding?: number;
	cropRegion: CropRegion;
	webcamLayoutPreset?: WebcamLayoutPreset;
	webcamMaskShape?: import("@/components/video-editor/types").WebcamMaskShape;
	webcamMirrored?: boolean;
	webcamReactiveZoom?: boolean;
	webcamSizePreset?: WebcamSizePreset;
	webcamPosition?: { cx: number; cy: number } | null;
	cursorRecordingData?: CursorRecordingData | null;
	cursorScale?: number;
	cursorSmoothing?: number;
	cursorMotionBlur?: number;
	cursorClickBounce?: number;
	cursorClipToBounds?: boolean;
	cursorTheme?: string;
	annotationRegions?: AnnotationRegion[];
	previewWidth?: number;
	previewHeight?: number;
	cursorTelemetry?: import("@/components/video-editor/types").CursorTelemetryPoint[];
	cursorClickTimestamps?: number[];
	onProgress?: (progress: ExportProgress) => void;
}

const SOURCE_COPY_EPSILON = 0.0001;

function hasActiveTimeRegions(regions?: Array<{ startMs: number; endMs: number }>) {
	return Boolean(regions?.some((region) => region.endMs - region.startMs > SOURCE_COPY_EPSILON));
}

function hasActiveSpeedRegions(regions?: SpeedRegion[]) {
	return Boolean(
		regions?.some(
			(region) =>
				region.endMs - region.startMs > SOURCE_COPY_EPSILON &&
				Math.abs(region.speed - 1) > SOURCE_COPY_EPSILON,
		),
	);
}

function hasNativeCursorOverlay(config: VideoExporterConfig) {
	return (config.cursorScale ?? 0) > 0;
}

function isDefaultCrop(cropRegion: CropRegion) {
	return (
		Math.abs(cropRegion.x) <= SOURCE_COPY_EPSILON &&
		Math.abs(cropRegion.y) <= SOURCE_COPY_EPSILON &&
		Math.abs(cropRegion.width - 1) <= SOURCE_COPY_EPSILON &&
		Math.abs(cropRegion.height - 1) <= SOURCE_COPY_EPSILON
	);
}

export function isSourceCopyFastPathEligible(
	config: VideoExporterConfig,
	videoInfo: { width: number; height: number; audioStreamCount?: number },
) {
	return getSourceCopyFastPathBlockers(config, videoInfo).length === 0;
}

export function getSourceCopyFastPathBlockers(
	config: VideoExporterConfig,
	videoInfo: { width: number; height: number; audioStreamCount?: number },
) {
	const blockers: string[] = [];

	if (config.width !== videoInfo.width || config.height !== videoInfo.height) {
		blockers.push(
			`output-size ${config.width}x${config.height} differs from source ${videoInfo.width}x${videoInfo.height}`,
		);
	}
	// Copying the source verbatim would carry over its multiple audio tracks (native
	// macOS writes system audio + mic separately). Most players play only the first,
	// which is often the silent system track — so multi-track sources must go through
	// the full pipeline, which mixes every track into one (issue #108).
	if ((videoInfo.audioStreamCount ?? 0) > 1) {
		blockers.push("source has multiple audio tracks (must be mixed)");
	}
	if (config.webcamVideoUrl) blockers.push("webcam overlay is enabled");
	if (hasActiveTimeRegions(config.trimRegions)) blockers.push("trim regions are present");
	if (hasActiveSpeedRegions(config.speedRegions)) blockers.push("speed regions are present");
	if (hasActiveTimeRegions(config.zoomRegions)) blockers.push("zoom regions are present");
	if (hasActiveTimeRegions(config.cameraFullscreenRegions))
		blockers.push("camera fullscreen regions are present");
	if (hasActiveTimeRegions(config.annotationRegions))
		blockers.push("annotation regions are present");
	if (hasNativeCursorOverlay(config)) blockers.push("editable cursor overlay is enabled");
	if (!isDefaultCrop(config.cropRegion)) blockers.push("crop is not default");
	if ((config.padding ?? 0) > SOURCE_COPY_EPSILON) blockers.push("padding is not zero");
	if ((config.videoPadding ?? 0) > SOURCE_COPY_EPSILON) blockers.push("video padding is not zero");
	if ((config.borderRadius ?? 0) > SOURCE_COPY_EPSILON) blockers.push("roundness is not zero");
	if (config.showShadow || config.shadowIntensity > SOURCE_COPY_EPSILON) {
		blockers.push("shadow is enabled");
	}
	if (config.showBlur) blockers.push("background blur is enabled");
	if ((config.motionBlurAmount ?? 0) > SOURCE_COPY_EPSILON) blockers.push("motion blur is enabled");

	return blockers;
}

/**
 * Codec-level reasons a source cannot be losslessly remuxed from WebM to MP4.
 *
 * The remux fast path only understands H.264 video (MediaRecorder on Linux, plus the
 * webcam sidecars and the fallback path), optionally paired with Opus audio. Any other
 * container family — VP8/VP9/AV1, AAC, PCM — must go through the full re-encode.
 */
export function getRemuxCodecBlockers(videoInfo: {
	codec: string;
	hasAudio: boolean;
	audioCodec?: string;
}): string[] {
	const blockers: string[] = [];
	if (!/^(avc1|h264)/i.test(videoInfo.codec)) {
		blockers.push(`video codec "${videoInfo.codec}" is not H.264`);
	}
	if (videoInfo.hasAudio && videoInfo.audioCodec !== "opus") {
		blockers.push(`audio codec "${videoInfo.audioCodec}" is not Opus`);
	}
	return blockers;
}

export function isRemuxEligible(
	config: VideoExporterConfig,
	videoInfo: {
		codec: string;
		hasAudio: boolean;
		audioCodec?: string;
		width: number;
		height: number;
		audioStreamCount?: number;
	},
) {
	// The remux is just as blind to timeline edits as a verbatim source copy, so it
	// inherits the source-copy blockers on top of its own codec requirements.
	return (
		getSourceCopyFastPathBlockers(config, videoInfo).length === 0 &&
		getRemuxCodecBlockers(videoInfo).length === 0
	);
}

/**
 * Builds an RFC 6381 AVC codec string (`avc1.PPCCLL`) from the SPS NAL of the first video
 * packet. web-demuxer reports a non-standard H.264 string (e.g. `avc1.2420015`) that
 * mediabunny's chunk-metadata validation rejects, so the profile/level have to come from
 * the SPS itself (profile_idc / constraint flags / level_idc after the Annex-B start code).
 */
export function avcCodecStringFromFirstPacket(firstChunk: EncodedVideoChunk): string | null {
	const bytes = new Uint8Array(firstChunk.byteLength);
	firstChunk.copyTo(bytes);

	// Locate the first Annex-B SPS NAL (type 7) — `00 00 00 01 67` or `00 00 01 67` —
	// and record the index of its 0x67 NAL header byte.
	let spsNalOffset: number | null = null;
	for (let i = 0; i < bytes.length - 4; i += 1) {
		if (bytes[i] === 0 && bytes[i + 1] === 0 && bytes[i + 2] === 1 && bytes[i + 3] === 0x67) {
			spsNalOffset = i + 3;
			break;
		}
		if (
			bytes[i] === 0 &&
			bytes[i + 1] === 0 &&
			bytes[i + 2] === 0 &&
			bytes[i + 3] === 1 &&
			bytes[i + 4] === 0x67
		) {
			spsNalOffset = i + 4;
			break;
		}
	}
	if (spsNalOffset === null) {
		return null;
	}

	const profileIdc = bytes[spsNalOffset + 1];
	const constraintFlags = bytes[spsNalOffset + 2];
	const levelIdc = bytes[spsNalOffset + 3];
	if (profileIdc === undefined || constraintFlags === undefined || levelIdc === undefined) {
		return null;
	}

	const hex = (n: number) => n.toString(16).padStart(2, "0");
	return `avc1.${hex(profileIdc)}${hex(constraintFlags)}${hex(levelIdc)}`;
}

function isMp4Source(videoUrl: string, blob: Blob) {
	if (blob.type.toLowerCase().includes("mp4")) {
		return true;
	}

	try {
		const path = new URL(videoUrl, window.location.href).pathname;
		return path.toLowerCase().endsWith(".mp4");
	} catch {
		return videoUrl.toLowerCase().split(/[?#]/, 1)[0].endsWith(".mp4");
	}
}

export class VideoExporter {
	private config: VideoExporterConfig;
	private streamingDecoder: StreamingVideoDecoder | null = null;
	private renderer: FrameRenderer | null = null;
	private encoder: VideoEncoder | null = null;
	private muxer: VideoMuxer | null = null;
	private audioProcessor: AudioProcessor | null = null;
	private webcamDecoder: StreamingVideoDecoder | null = null;
	private cancelled = false;
	private encodeQueue = 0;
	// Keep a smaller queue for software encoding so Windows does not balloon memory.
	private readonly MAX_ENCODE_QUEUE = 120;
	private videoDescription: Uint8Array | undefined;
	private videoColorSpace: VideoColorSpaceInit | undefined;
	private muxingPromises: Promise<void>[] = [];
	private chunkCount = 0;
	private fatalEncoderError: Error | null = null;

	constructor(config: VideoExporterConfig) {
		this.config = config;
	}

	async export(): Promise<ExportResult> {
		const encoderPreferences = this.getEncoderPreferences();
		let lastError: Error | null = null;

		for (const encoderPreference of encoderPreferences) {
			try {
				return await this.exportWithEncoderPreference(encoderPreference);
			} catch (error) {
				const normalizedError = error instanceof Error ? error : new Error(String(error));
				lastError = normalizedError;

				if (this.cancelled) {
					return { success: false, error: "Export cancelled" };
				}

				if (normalizedError instanceof BackgroundLoadError) {
					throw normalizedError;
				}

				if (encoderPreferences.length > 1) {
					console.warn(
						`[VideoExporter] ${encoderPreference} export attempt failed:`,
						normalizedError,
					);
				}
			} finally {
				this.cleanup();
			}
		}

		return {
			success: false,
			error: lastError?.message || "Export failed",
		};
	}

	private async exportWithEncoderPreference(
		encoderPreference: HardwareAcceleration,
	): Promise<ExportResult> {
		let webcamFrameQueue: TimestampedVideoFrameQueue | null = null;
		let stopWebcamDecode = false;
		let webcamDecodeError: Error | null = null;
		let webcamDecodePromise: Promise<void> | null = null;
		let webcamDecoder: StreamingVideoDecoder | null = null;
		const warnings: string[] = [];
		const onWarning = (message: string) => warnings.push(message);

		this.cleanup();
		this.cancelled = false;
		this.fatalEncoderError = null;

		try {
			const platform = await getPlatform();

			const streamingDecoder = new StreamingVideoDecoder();
			this.streamingDecoder = streamingDecoder;
			const videoInfo = await streamingDecoder.loadMetadata(
				this.config.videoUrl,
				({ copiedBytes, totalBytes }) => {
					// Large recordings are streamed into OPFS before demuxing; surface
					// that copy as a "preparing" phase so the dialog is not stuck at 0%.
					this.reportProgress({
						currentFrame: 0,
						totalFrames: 0,
						percentage: totalBytes > 0 ? (copiedBytes / totalBytes) * 100 : 0,
						estimatedTimeRemaining: 0,
						phase: "preparing",
					});
				},
			);
			const sourceCopyResult = await this.trySourceCopyFastPath(videoInfo);
			if (sourceCopyResult) {
				return sourceCopyResult;
			}

			// The source-copy fast path only understands MP4. MediaRecorder (Linux screen
			// recordings, webcam sidecars, the fallback) writes H.264+Opus WebM, which is
			// unplayable in most editors — remux it losslessly instead of re-encoding.
			const remuxResult = await this.tryRemuxWebmToMp4(videoInfo);
			if (remuxResult) {
				return remuxResult;
			}

			let webcamInfo: Awaited<ReturnType<StreamingVideoDecoder["loadMetadata"]>> | null = null;
			if (this.config.webcamVideoUrl) {
				webcamDecoder = new StreamingVideoDecoder();
				this.webcamDecoder = webcamDecoder;
				webcamInfo = await webcamDecoder.loadMetadata(this.config.webcamVideoUrl);
			}

			const renderer = new FrameRenderer({
				width: this.config.width,
				height: this.config.height,
				wallpaper: this.config.wallpaper,
				zoomRegions: this.config.zoomRegions,
				cameraFullscreenRegions: this.config.cameraFullscreenRegions,
				showShadow: this.config.showShadow,
				shadowIntensity: this.config.shadowIntensity,
				showBlur: this.config.showBlur,
				motionBlurAmount: this.config.motionBlurAmount,
				borderRadius: this.config.borderRadius,
				padding: this.config.padding,
				cropRegion: this.config.cropRegion,
				cursorRecordingData: this.config.cursorRecordingData,
				cursorScale: this.config.cursorScale,
				cursorSmoothing: this.config.cursorSmoothing,
				cursorMotionBlur: this.config.cursorMotionBlur,
				cursorClickBounce: this.config.cursorClickBounce,
				cursorClipToBounds: this.config.cursorClipToBounds,
				cursorTheme: this.config.cursorTheme,
				videoWidth: videoInfo.width,
				videoHeight: videoInfo.height,
				webcamSize: webcamInfo ? { width: webcamInfo.width, height: webcamInfo.height } : null,
				webcamLayoutPreset: this.config.webcamLayoutPreset,
				webcamMaskShape: this.config.webcamMaskShape,
				webcamMirrored: this.config.webcamMirrored,
				webcamReactiveZoom: this.config.webcamReactiveZoom,
				webcamSizePreset: this.config.webcamSizePreset,
				webcamPosition: this.config.webcamPosition,
				annotationRegions: this.config.annotationRegions,
				speedRegions: this.config.speedRegions,
				previewWidth: this.config.previewWidth,
				previewHeight: this.config.previewHeight,
				cursorTelemetry: this.config.cursorTelemetry,
				cursorClickTimestamps: this.config.cursorClickTimestamps,
				platform,
			});
			this.renderer = renderer;
			await renderer.initialize();

			await this.initializeEncoder(encoderPreference);

			const sourceDemuxer = streamingDecoder.getDemuxer();
			const audioExportCodec =
				videoInfo.hasAudio && sourceDemuxer
					? await AudioProcessor.selectSupportedExportCodecForSource(sourceDemuxer)
					: null;
			if (videoInfo.hasAudio && !audioExportCodec) {
				console.warn("[VideoExporter] No supported audio export codec, exporting video-only.");
			}

			const hasAudio = Boolean(audioExportCodec);
			const muxer = new VideoMuxer(this.config, hasAudio, audioExportCodec?.muxerCodec);
			this.muxer = muxer;
			await muxer.initialize();

			const { totalFrames } = streamingDecoder.getExportMetrics(
				this.config.frameRate,
				this.config.trimRegions,
				this.config.speedRegions,
			);

			const frameDuration = 1_000_000 / this.config.frameRate;
			let frameIndex = 0;
			const maxEncodeQueue =
				encoderPreference === "prefer-software"
					? Math.min(this.MAX_ENCODE_QUEUE, 32)
					: this.MAX_ENCODE_QUEUE;

			webcamFrameQueue = this.config.webcamVideoUrl ? new TimestampedVideoFrameQueue() : null;
			webcamDecodePromise =
				webcamDecoder && webcamFrameQueue
					? (() => {
							const queue = webcamFrameQueue;
							return webcamDecoder
								.decodeAll(
									this.config.frameRate,
									this.config.trimRegions,
									this.config.speedRegions,
									async (webcamFrame, _exportTimestampUs, webcamSourceTimestampMs) => {
										while (queue.length >= 12 && !this.cancelled && !stopWebcamDecode) {
											await new Promise((resolve) => setTimeout(resolve, 2));
										}
										if (this.cancelled || stopWebcamDecode) {
											webcamFrame.close();
											return;
										}
										queue.enqueue(webcamFrame, webcamSourceTimestampMs);
									},
									onWarning,
								)
								.catch((error) => {
									webcamDecodeError = error instanceof Error ? error : new Error(String(error));
									throw webcamDecodeError;
								})
								.finally(() => {
									if (webcamDecodeError) {
										queue.fail(webcamDecodeError);
									} else {
										queue.close();
									}
								});
						})()
					: null;

			await streamingDecoder.decodeAll(
				this.config.frameRate,
				this.config.trimRegions,
				this.config.speedRegions,
				async (videoFrame, _exportTimestampUs, sourceTimestampMs) => {
					let webcamFrame: VideoFrame | null = null;
					try {
						if (this.cancelled) {
							return;
						}

						if (this.fatalEncoderError) {
							throw this.fatalEncoderError;
						}

						const timestamp = frameIndex * frameDuration;
						webcamFrame = webcamFrameQueue
							? await webcamFrameQueue.frameAt(sourceTimestampMs)
							: null;
						if (this.cancelled) {
							return;
						}

						const sourceTimestampUs = sourceTimestampMs * 1000;
						await renderer.renderFrame(videoFrame, sourceTimestampUs, webcamFrame);

						const canvas = renderer.getCanvas();

						let exportFrame: VideoFrame;

						// On some Linux systems the GPU shared-image path (EGL/Ozone) fails
						// silently, producing empty frames, so we force a CPU readback instead.
						if (platform === "linux") {
							const canvasCtx = canvas.getContext("2d")!;
							const imageData = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
							exportFrame = new VideoFrame(imageData.data.buffer, {
								format: "RGBA",
								codedWidth: canvas.width,
								codedHeight: canvas.height,
								timestamp,
								duration: frameDuration,
								colorSpace: {
									primaries: "bt709",
									transfer: "iec61966-2-1",
									matrix: "rgb",
									fullRange: true,
								},
							});
						} else {
							exportFrame = new VideoFrame(canvas, { timestamp, duration: frameDuration });
						}

						try {
							await waitForEncoderQueueSpace({
								getQueueSize: () => this.encoder?.encodeQueueSize ?? 0,
								maxEncodeQueue,
								isCancelled: () => this.cancelled,
								encoderPreference,
							});
						} catch (error) {
							exportFrame.close();
							throw error;
						}

						if (this.encoder && this.encoder.state === "configured") {
							this.encodeQueue++;
							this.encoder.encode(exportFrame, { keyFrame: frameIndex % 150 === 0 });
						} else {
							console.warn(
								`[Frame ${frameIndex}] Encoder not ready! State: ${this.encoder?.state}`,
							);
						}

						exportFrame.close();
						frameIndex++;

						this.reportProgress({
							currentFrame: frameIndex,
							totalFrames,
							percentage: (frameIndex / totalFrames) * 100,
							estimatedTimeRemaining: 0,
						});
					} finally {
						videoFrame.close();
						webcamFrame?.close();
					}
				},
				onWarning,
			);

			if (this.cancelled) {
				return { success: false, error: "Export cancelled" };
			}

			if (this.fatalEncoderError) {
				throw this.fatalEncoderError;
			}

			stopWebcamDecode = true;
			webcamFrameQueue?.destroy();
			webcamDecoder?.cancel();
			await webcamDecodePromise;

			if (this.encoder && this.encoder.state === "configured") {
				await this.withTimeout(
					this.encoder.flush(),
					ENCODER_FLUSH_TIMEOUT_MS,
					encoderPreference === "prefer-hardware"
						? "The hardware video encoder stopped responding while finalizing the export."
						: "The video encoder stopped responding while finalizing the export.",
				);
			}

			if (this.fatalEncoderError) {
				throw this.fatalEncoderError;
			}

			await Promise.all(this.muxingPromises);

			this.reportProgress({
				currentFrame: totalFrames,
				totalFrames,
				percentage: 100,
				estimatedTimeRemaining: 0,
				phase: "finalizing",
			});

			if (hasAudio && audioExportCodec && !this.cancelled) {
				const demuxer = streamingDecoder.getDemuxer();
				if (demuxer) {
					console.log("[VideoExporter] Processing audio track...");
					this.audioProcessor = new AudioProcessor();
					await this.audioProcessor.process(
						demuxer,
						muxer,
						this.config.videoUrl,
						this.config.trimRegions,
						this.config.speedRegions,
						videoInfo.duration,
						audioExportCodec,
						this.config.frameRate,
					);
				}
			}

			const blob = await muxer.finalize();
			return { success: true, blob, warnings: warnings.length > 0 ? warnings : undefined };
		} finally {
			stopWebcamDecode = true;
			webcamFrameQueue?.destroy();
			webcamDecoder?.cancel();
			if (webcamDecodePromise) {
				await webcamDecodePromise.catch(() => undefined);
			}
		}
	}

	private async initializeEncoder(hardwareAcceleration: HardwareAcceleration): Promise<void> {
		this.encodeQueue = 0;
		this.muxingPromises = [];
		this.chunkCount = 0;
		this.fatalEncoderError = null;
		let videoDescription: Uint8Array | undefined;

		this.encoder = new VideoEncoder({
			output: (chunk, meta) => {
				if (meta?.decoderConfig?.description && !videoDescription) {
					const desc = meta.decoderConfig.description;
					if (desc instanceof ArrayBuffer || desc instanceof SharedArrayBuffer) {
						videoDescription = new Uint8Array(desc);
					} else if (ArrayBuffer.isView(desc)) {
						videoDescription = new Uint8Array(desc.buffer, desc.byteOffset, desc.byteLength);
					}
					this.videoDescription = videoDescription;
				}

				if (meta?.decoderConfig?.colorSpace && !this.videoColorSpace) {
					this.videoColorSpace = meta.decoderConfig.colorSpace;
				}

				const isFirstChunk = this.chunkCount === 0;
				this.chunkCount++;

				const muxingPromise = (async () => {
					try {
						if (isFirstChunk && this.videoDescription) {
							const colorSpace = this.videoColorSpace || {
								primaries: "bt709",
								transfer: "iec61966-2-1",
								matrix: "rgb",
								fullRange: true,
							};

							const metadata: EncodedVideoChunkMetadata = {
								decoderConfig: {
									codec: this.config.codec || "avc1.640033",
									codedWidth: this.config.width,
									codedHeight: this.config.height,
									description: this.videoDescription,
									colorSpace,
								},
							};

							await this.muxer!.addVideoChunk(chunk, metadata);
						} else {
							await this.muxer!.addVideoChunk(chunk, meta);
						}
					} catch (error) {
						console.error("Muxing error:", error);
					}
				})();

				this.muxingPromises.push(muxingPromise);
				this.encodeQueue = Math.max(0, this.encodeQueue - 1);
			},
			error: (error) => {
				console.error("[VideoExporter] Encoder error:", error);
				this.fatalEncoderError =
					error instanceof Error ? error : new Error(`Video encoder error: ${String(error)}`);
				this.streamingDecoder?.cancel();
				this.webcamDecoder?.cancel();
			},
		});

		const encoderConfig: VideoEncoderConfig = {
			codec: this.config.codec || "avc1.640033",
			width: this.config.width,
			height: this.config.height,
			bitrate: this.config.bitrate,
			framerate: this.config.frameRate,
			latencyMode: "quality",
			bitrateMode: "variable",
			hardwareAcceleration,
		};

		const support = await VideoEncoder.isConfigSupported(encoderConfig);
		if (!support.supported) {
			throw new Error(
				hardwareAcceleration === "prefer-hardware"
					? "Hardware video encoding is not supported on this system."
					: "Software video encoding is not supported on this system.",
			);
		}

		console.log(
			`[VideoExporter] Using ${hardwareAcceleration === "prefer-hardware" ? "hardware" : "software"} acceleration`,
		);
		this.encoder.configure(encoderConfig);
	}

	cancel(): void {
		this.cancelled = true;
		if (this.streamingDecoder) {
			this.streamingDecoder.cancel();
		}
		if (this.webcamDecoder) {
			this.webcamDecoder.cancel();
		}
		if (this.audioProcessor) {
			this.audioProcessor.cancel();
		}
		this.cleanup();
	}

	private cleanup(): void {
		if (this.encoder) {
			try {
				if (this.encoder.state === "configured") {
					this.encoder.close();
				}
			} catch (e) {
				console.warn("Error closing encoder:", e);
			}
			this.encoder = null;
		}

		if (this.streamingDecoder) {
			try {
				this.streamingDecoder.destroy();
			} catch (e) {
				console.warn("Error destroying streaming decoder:", e);
			}
			this.streamingDecoder = null;
		}

		if (this.webcamDecoder) {
			try {
				this.webcamDecoder.destroy();
			} catch (e) {
				console.warn("Error destroying webcam decoder:", e);
			}
			this.webcamDecoder = null;
		}

		if (this.renderer) {
			try {
				this.renderer.destroy();
			} catch (e) {
				console.warn("Error destroying renderer:", e);
			}
			this.renderer = null;
		}

		this.audioProcessor = null;
		this.muxer = null;
		this.encodeQueue = 0;
		this.muxingPromises = [];
		this.chunkCount = 0;
		this.videoDescription = undefined;
		this.videoColorSpace = undefined;
		this.fatalEncoderError = null;
	}

	private getEncoderPreferences(): HardwareAcceleration[] {
		if (typeof navigator !== "undefined" && /\bWindows\b/i.test(navigator.userAgent)) {
			return ["prefer-software", "prefer-hardware"];
		}
		return ["prefer-hardware", "prefer-software"];
	}

	private async trySourceCopyFastPath(videoInfo: { width: number; height: number }) {
		const blockers = getSourceCopyFastPathBlockers(this.config, videoInfo);
		if (blockers.length > 0) {
			console.info("[VideoExporter] source-copy fast path disabled", {
				blockers,
				output: { width: this.config.width, height: this.config.height },
				source: videoInfo,
			});
			return null;
		}

		// Loading the whole blob just to learn a .webm file isn't MP4 would waste a
		// full-file IPC/network read on every MediaRecorder export — check the
		// extension first. blob: URLs carry no extension, so they must load.
		const urlPath = this.config.videoUrl.split(/[?#]/, 1)[0].toLowerCase();
		if (!urlPath.endsWith(".mp4") && !/^blob:/i.test(this.config.videoUrl)) {
			console.info("[VideoExporter] source-copy fast path disabled", {
				blockers: ["source is not an MP4 (extension)"],
				source: videoInfo,
			});
			return null;
		}

		const sourceBlob = await this.loadSourceBlob();
		if (!sourceBlob || !isMp4Source(this.config.videoUrl, sourceBlob)) {
			console.info("[VideoExporter] source-copy fast path disabled", {
				blockers: ["source is not a readable MP4"],
				source: videoInfo,
			});
			return null;
		}

		if (this.cancelled) {
			return { success: false, error: "Export cancelled" };
		}

		this.reportProgress({
			currentFrame: 1,
			totalFrames: 1,
			percentage: 100,
			estimatedTimeRemaining: 0,
			phase: "finalizing",
		});
		console.info("[VideoExporter] using source-copy fast path", {
			source: videoInfo,
			bytes: sourceBlob.size,
		});

		return {
			success: true,
			blob: sourceBlob.type ? sourceBlob : new Blob([sourceBlob], { type: "video/mp4" }),
		} satisfies ExportResult;
	}

	private async loadSourceBlob() {
		const videoUrl = this.config.videoUrl;
		const isRemoteUrl = /^(https?:|blob:|data:)/i.test(videoUrl);

		if (!isRemoteUrl && window.electronAPI?.readBinaryFile) {
			// The source-copy fast path reads the whole file into a Blob. That is
			// impossible for recordings above Node's 2 GiB single-read cap, so bail
			// out and let the (streaming) re-encode path handle them instead.
			if (window.electronAPI.getReadableFileInfo) {
				const info = await window.electronAPI.getReadableFileInfo(videoUrl);
				if (
					info.success &&
					typeof info.size === "number" &&
					info.size > MAX_IN_MEMORY_SOURCE_BYTES
				) {
					return null;
				}
			}

			const result = await window.electronAPI.readBinaryFile(videoUrl);
			if (!result.success || !result.data) {
				return null;
			}

			const type = videoUrl.toLowerCase().split(/[?#]/, 1)[0].endsWith(".mp4") ? "video/mp4" : "";
			return new Blob([result.data], type ? { type } : undefined);
		}

		const response = await fetch(videoUrl);
		if (!response.ok) {
			return null;
		}

		return response.blob();
	}

	/**
	 * Losslessly repackages an H.264 (+ optional Opus) WebM into MP4 — the MediaRecorder
	 * format on Linux, the webcam sidecars and the fallback path. No frames are decoded or
	 * re-encoded: the video and audio tracks are demuxed and muxed into an ISO-BMFF container
	 * (avc1 + opus) using mediabunny. Sources whose codecs do not map losslessly (VP8/VP9/AV1,
	 * AAC, …) are rejected here and fall through to the full re-encode.
	 */
	private async tryRemuxWebmToMp4(videoInfo: {
		codec: string;
		hasAudio: boolean;
		audioCodec?: string;
		width: number;
		height: number;
		audioStreamCount?: number;
	}) {
		const blockers = [
			...getSourceCopyFastPathBlockers(this.config, videoInfo),
			...getRemuxCodecBlockers(videoInfo),
		];
		if (blockers.length > 0) {
			console.info("[VideoExporter] remux fast path disabled", { blockers, source: videoInfo });
			return null;
		}

		// MP4 sources were already handed to the source-copy fast path; remuxing
		// them here would be pointless. blob: URLs are in-memory (never large MP4s),
		// so the extension check is enough — and it avoids a second full-file read.
		const urlPath = this.config.videoUrl.split(/[?#]/, 1)[0].toLowerCase();
		if (urlPath.endsWith(".mp4")) {
			console.info("[VideoExporter] remux fast path disabled", {
				blockers: ["source is an MP4, not a WebM"],
				source: videoInfo,
			});
			return null;
		}

		if (this.cancelled) {
			return { success: false, error: "Export cancelled" };
		}

		// Keep a low constant budget for the "extracting" phase. The dialog shows this as a
		// busy indicator; the true remuxed length is only known after the first read pass.
		this.reportProgress({
			currentFrame: 0,
			totalFrames: 1,
			percentage: 1,
			estimatedTimeRemaining: 0,
			phase: "extracting",
		});

		// Reuse the StreamingVideoDecoder's demuxer: it already holds the source (in-memory
		// or OPFS-streamed for large recordings) and the WASM is warm. A fresh WebDemuxer
		// would load the file a second time and spin up a duplicate wasm instance.
		const demuxer = this.streamingDecoder?.getDemuxer();
		if (!demuxer) {
			console.warn("[VideoExporter] remux fast path disabled: no demuxer available");
			return null;
		}

		let output: Output | null = null;
		try {
			const mediaInfo = await demuxer.getMediaInfo();
			const videoStream = mediaInfo.streams.find((stream) => stream.codec_type_string === "video");
			if (!videoStream) {
				console.warn("[VideoExporter] remux fast path disabled: no video stream");
				return null;
			}

			const videoConfig = await demuxer.getDecoderConfig("video");
			const audioConfig = videoInfo.hasAudio ? await demuxer.getDecoderConfig("audio") : null;
			if (!videoConfig?.codec) {
				console.warn("[VideoExporter] remux fast path disabled: missing video decoder config");
				return null;
			}
			if (videoInfo.hasAudio && !audioConfig?.codec) {
				console.warn("[VideoExporter] remux fast path disabled: missing audio decoder config");
				return null;
			}

			const target = new BufferTarget();
			output = new Output({
				format: new Mp4OutputFormat({ fastStart: "in-memory" }),
				target,
			});

			const videoSource = new EncodedVideoPacketSource("avc");
			// No frameRate: MediaRecorder timestamps are the ground truth, and snapping to a
			// nominal rate would stretch or drop frames that are not exactly periodic.
			output.addVideoTrack(videoSource, {});

			const audioSource = audioConfig ? new EncodedAudioPacketSource("opus") : null;
			if (audioSource) {
				output.addAudioTrack(audioSource);
			}
			await output.start();

			const audioMeta: EncodedAudioChunkMetadata | undefined = audioConfig
				? {
						decoderConfig: {
							codec: audioConfig.codec,
							sampleRate: audioConfig.sampleRate,
							numberOfChannels: audioConfig.numberOfChannels,
						},
					}
				: undefined;

			// MediaRecorder writes its first video packet with a non-zero timestamp (the
			// B-frame encoder delay); rebase everything so the MP4 timeline starts at 0.
			let vBaseSec: number | null = null;
			let videoMeta: EncodedVideoChunkMetadata | undefined;
			const videoReader = demuxer.read("video").getReader();
			try {
				let first = true;
				while (!this.cancelled) {
					const { done, value: chunk } = await videoReader.read();
					if (done || !chunk) break;
					if (first) {
						// web-demuxer reports a non-standard H.264 codec string, so derive the
						// RFC 6381 string mediabunny validates against from the SPS NAL itself.
						const avcCodec = avcCodecStringFromFirstPacket(chunk);
						if (!avcCodec) {
							console.warn(
								"[VideoExporter] remux fast path disabled: no SPS NAL in first video packet",
							);
							return null;
						}
						videoMeta = {
							decoderConfig: {
								codec: avcCodec,
								...(videoConfig.codedWidth ? { codedWidth: videoConfig.codedWidth } : {}),
								...(videoConfig.codedHeight ? { codedHeight: videoConfig.codedHeight } : {}),
							},
						};
					}
					if (vBaseSec === null) vBaseSec = chunk.timestamp / 1_000_000;
					const packet = EncodedPacket.fromEncodedChunk(chunk).clone({
						timestamp: chunk.timestamp / 1_000_000 - (vBaseSec ?? 0),
					});
					await videoSource.add(packet, first ? videoMeta : undefined);
					first = false;
				}
			} finally {
				try {
					await videoReader.cancel();
				} catch {
					/* already closed */
				}
			}

			if (this.cancelled) {
				return { success: false, error: "Export cancelled" };
			}

			if (audioSource && audioMeta) {
				const audioReader = demuxer.read("audio").getReader();
				try {
					let first = true;
					while (!this.cancelled) {
						const { done, value: chunk } = await audioReader.read();
						if (done || !chunk) break;
						const packet = EncodedPacket.fromEncodedChunk(chunk).clone({
							timestamp: Math.max(0, chunk.timestamp / 1_000_000 - (vBaseSec ?? 0)),
						});
						await audioSource.add(packet, first ? audioMeta : undefined);
						first = false;
					}
				} finally {
					try {
						await audioReader.cancel();
					} catch {
						/* already closed */
					}
				}
			}

			if (this.cancelled) {
				return { success: false, error: "Export cancelled" };
			}

			await output.finalize();
			const buffer = target.buffer;
			if (!buffer) {
				console.warn("[VideoExporter] remux fast path disabled: empty output buffer");
				return null;
			}

			this.reportProgress({
				currentFrame: 1,
				totalFrames: 1,
				percentage: 100,
				estimatedTimeRemaining: 0,
				phase: "finalizing",
			});
			console.info("[VideoExporter] using WebM→MP4 remux fast path", {
				source: videoInfo,
				bytes: buffer.byteLength,
			});

			return {
				success: true,
				blob: new Blob([buffer], { type: "video/mp4" }),
			} satisfies ExportResult;
		} catch (error) {
			console.warn("[VideoExporter] remux fast path failed, falling back to re-encode:", error);
			return null;
		}
	}

	private reportProgress(progress: ExportProgress): void {
		this.config.onProgress?.(progress);
	}

	private withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
			promise.then(
				(value) => {
					window.clearTimeout(timer);
					resolve(value);
				},
				(error) => {
					window.clearTimeout(timer);
					reject(error);
				},
			);
		});
	}
}
