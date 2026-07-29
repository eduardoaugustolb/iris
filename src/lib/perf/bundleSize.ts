import type { Measurement } from "./budgets";

export interface AssetFile {
	name: string;
	bytes: number;
}

// Vite hashes are base64url-ish, 8 chars, appended after the last hyphen.
const HASHED_NAME = /^(.*)-[A-Za-z0-9_-]{8}(\.[A-Za-z0-9]+)$/;

export function chunkNameFromFile(fileName: string): string {
	const match = HASHED_NAME.exec(fileName);

	return match ? `${match[1]}${match[2]}` : fileName;
}

export function toMeasurements(files: AssetFile[]): Measurement[] {
	const byChunk = new Map<string, number>();
	let total = 0;

	for (const file of files) {
		const metric = `bundle.${chunkNameFromFile(file.name)}`;

		byChunk.set(metric, (byChunk.get(metric) ?? 0) + file.bytes);
		total += file.bytes;
	}

	return [
		...Array.from(byChunk, ([metric, value]) => ({ metric, value })),
		{ metric: "bundle.total", value: total },
	];
}
