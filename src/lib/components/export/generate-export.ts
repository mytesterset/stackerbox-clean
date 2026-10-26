import JSZip from 'jszip';
import type { HtmlMeta, LayerData } from '$lib/types';
import { CANVAS_MIN, CANVAS_MAX } from '$lib/types';
import { safeNumber, validateLayerData, MAX_ZIP_SIZE, MAX_DIMENSION } from '$lib/utils/validation';

interface ExportInput {
	name: string;
	settings: { width: number; height: number };
	layers: LayerData[];
	htmlMeta: HtmlMeta;
}

export interface AssetItem {
	fileName: string;
	mime: string;
	content: Blob | string;
	layer: LayerData;
}

export interface AssetList {
	name: string;
	settings: { width: number; height: number };
	visibleLayers: LayerData[];
	assets: AssetItem[];
}

interface ExportResult {
	success: boolean;
	blob?: Blob;
	error?: string;
}

export async function generateExport(project: ExportInput): Promise<ExportResult> {
	const { settings } = project;

	const w = safeNumber(settings.width, CANVAS_MIN, CANVAS_MAX);
	const h = safeNumber(settings.height, CANVAS_MIN, CANVAS_MAX);

	if (isOutOfRange(w, h)) {
		return { success: false, error: 'Canvas size out of allowed range' };
	}

	if (!Array.isArray(project.layers) || project.layers.length === 0) {
		return { success: false, error: 'No layers to export' };
	}

	for (let i = 0; i < project.layers.length; i++) {
		const errors = validateLayerData(project.layers[i], i);
		if (errors.length > 0) {
			return { success: false, error: `Invalid layer data: ${errors[0].message}` };
		}
	}

	const { name, visibleLayers, assets } = await buildAssetList(project);

	const estimatedSize = assets.reduce((sum, a) => {
		if (typeof a.content === 'string') return sum + new TextEncoder().encode(a.content).length;
		return sum + a.content.size;
	}, 0);
	const html = generateIndexHtml(name, { width: w, height: h }, visibleLayers, assets.map((a) => `assets/${a.fileName}`), project.htmlMeta);
	const htmlSize = new TextEncoder().encode(html).length;
	const totalEstimated = estimatedSize + htmlSize;

	if (totalEstimated > MAX_ZIP_SIZE) {
		return { success: false, error: `Export estimated at ${Math.round(totalEstimated / 1024 / 1024)} MB exceeds maximum of ${Math.round(MAX_ZIP_SIZE / 1024 / 1024)} MB` };
	}

	const zip = new JSZip();
	const assetsFolder = zip.folder('assets');
	if (!assetsFolder) {
		return { success: false, error: 'Could not create assets folder' };
	}

	for (const asset of assets) {
		if (typeof asset.content === 'string') {
			assetsFolder.file(asset.fileName, asset.content);
		} else {
			const arrayBuffer = await asset.content.arrayBuffer();
			assetsFolder.file(asset.fileName, arrayBuffer);
		}
	}

	zip.file('index.html', html);

	const blob = await zip.generateAsync({ type: 'blob' });
	if (blob.size > MAX_ZIP_SIZE) {
		return { success: false, error: 'Export exceeds maximum size of 500 MB' };
	}
	return { success: true, blob };
}

export async function buildAssetList(project: ExportInput): Promise<AssetList> {
	const { name, settings, layers } = project;

	const visibleLayers = layers
		.filter((l) => l.visible)
		.sort((a, b) => a.order - b.order);

	const assets: AssetItem[] = [];

	for (let i = 0; i < visibleLayers.length; i++) {
		const layer = visibleLayers[i];
		if (layer.arTxId) continue;
		const paddedIndex = String(i + 1).padStart(2, '0');

		if (layer.type === 'html') {
			const text = await layer.blob.text();
			assets.push({
				fileName: `layer-${paddedIndex}-html/index.html`,
				mime: 'text/html',
				content: text,
				layer
			});
		} else {
			const ext = layer.type === 'jpg' ? 'jpg' : layer.type;
			const fileName = `layer-${paddedIndex}.${ext}`;
			assets.push({
				fileName,
				mime: mimeForType(layer.type),
				content: layer.blob,
				layer
			});
		}
	}

	return { name, settings, visibleLayers, assets };
}

function isOutOfRange(width: number, height: number): boolean {
	return (
		width < CANVAS_MIN ||
		width > CANVAS_MAX ||
		height < CANVAS_MIN ||
		height > CANVAS_MAX
	);
}

function mimeForType(type: LayerData['type']): string {
	switch (type) {
		case 'png':
			return 'image/png';
		case 'jpg':
			return 'image/jpeg';
		case 'webp':
			return 'image/webp';
		case 'svg':
			return 'image/svg+xml';
		case 'html':
			return 'text/html';
	}
}

function layerStyle(layer: LayerData): string {
	const x = safeNumber(layer.x, -MAX_DIMENSION, MAX_DIMENSION);
	const y = safeNumber(layer.y, -MAX_DIMENSION, MAX_DIMENSION);
	const w = safeNumber(layer.width, CANVAS_MIN, MAX_DIMENSION);
	const h = safeNumber(layer.height, CANVAS_MIN, MAX_DIMENSION);
	const opacity = safeNumber(layer.opacity, 0, 100) / 100;
	const z = safeNumber(layer.order, 0, 10000);
	return `position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; opacity: ${opacity}; z-index: ${z}`;
}

function generateIndexHtml(
	name: string,
	settings: { width: number; height: number },
	layers: LayerData[],
	assetPaths: string[],
	meta: HtmlMeta
): string {
	let layerElements = '';

	for (let i = 0; i < layers.length; i++) {
		const layer = layers[i];
		const assetPath = assetPaths[i];
		const style = layerStyle(layer);

		if (layer.type === 'html') {
			layerElements += `<iframe src="${assetPath}" style="${style}; border: none;" sandbox=""></iframe>\n`;
		} else {
			layerElements += `<img src="${assetPath}" alt="${escapeHtml(layer.name)}" style="${style}" />\n`;
		}
	}

	const title = escapeHtml(name || 'Stacker Box Composition');
	const artist = escapeHtml(meta.artist || '');
	const description = escapeHtml(meta.description || '');

	let metaTags = '';
	if (artist) metaTags += `<meta name="artist" content="${artist}">\n`;
	if (description) metaTags += `<meta name="description" content="${description}">\n`;
	if (meta.year) metaTags += `<meta name="creation-date" content="${escapeHtml(meta.year)}">\n`;

	const sw = safeNumber(settings.width, CANVAS_MIN, CANVAS_MAX);
	const sh = safeNumber(settings.height, CANVAS_MIN, CANVAS_MAX);

	return `<!-- Generated by StackerBox -->
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${metaTags}<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
	width: 100%;
	height: 100%;
	overflow: hidden;
	background: transparent;
}
#container {
	position: absolute;
	top: 0;
	left: 0;
	width: ${sw}px;
	height: ${sh}px;
	transform-origin: 0 0;
	overflow: hidden;
}
</style>
</head>
<body>
<div id="container">
${layerElements}
</div>
<script>
(function() {
	var c = document.getElementById('container');
	var cw = ${sw};
	var ch = ${sh};
	function fit() {
		var s = Math.min(window.innerWidth / cw, window.innerHeight / ch, 1);
		var ox = (window.innerWidth - cw * s) / 2;
		var oy = (window.innerHeight - ch * s) / 2;
		c.style.transform = 'translate(' + ox + 'px, ' + oy + 'px) scale(' + s + ')';
	}
	fit();
	window.addEventListener('resize', fit);
})();
<\/script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}