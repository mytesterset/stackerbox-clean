export interface HtmlMeta {
	artist: string;
	description: string;
	year: string;
}

export interface ProjectSettings {
	width: number;
	height: number;
}

export const CANVAS_PRESETS = [
	{ label: '500 × 500', width: 500, height: 500 },
	{ label: '1080 × 1080', width: 1080, height: 1080 },
	{ label: '1920 × 1080', width: 1920, height: 1080 },
	{ label: '1920 × 2160', width: 1920, height: 2160 }
] as const;

export const CANVAS_MIN = 1;
export const CANVAS_MAX = 3000;

export type LayerType = 'png' | 'jpg' | 'webp' | 'svg' | 'html';

export interface LayerData {
	id: string;
	name: string;
	type: LayerType;
	blob: Blob;
	objectUrl: string;
	arTxId?: string;
	contentHash?: string;
	x: number;
	y: number;
	width: number;
	height: number;
	opacity: number;
	visible: boolean;
	lockRatio: boolean;
	order: number;
}

export interface ProjectData {
	id: string;
	name: string;
	settings: ProjectSettings;
	layers: LayerData[];
	htmlMeta: HtmlMeta;
	createdAt: number;
	updatedAt: number;
}