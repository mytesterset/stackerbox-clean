import { projectStore } from '$lib/stores/project.svelte';
import type { LayerType } from '$lib/types';
import { resolveRemoteLayer } from '$lib/arweave/turbo';
import { MAX_FILE_SIZE, MAX_LAYERS, MAX_HTML_SIZE, MAX_SVG_SIZE, MAX_PROJECT_SIZE, sanitizeSvg, checkMagicBytes, isPng, isWebp, isSvgOrHtmlPrefix, getProjectSize, validateProjectLimits } from '$lib/utils/validation';

interface FileTypeMap {
	extension: string;
	mime: string;
	type: LayerType;
	magicBytes: string[];
	supplemental?: (bytes: Uint8Array) => boolean;
}

const ALLOWED_TYPES: FileTypeMap[] = [
	{ extension: 'png', mime: 'image/png', type: 'png', magicBytes: ['89504e47'], supplemental: isPng },
	{ extension: 'jpg', mime: 'image/jpeg', type: 'jpg', magicBytes: ['ffd8ff'] },
	{ extension: 'jpeg', mime: 'image/jpeg', type: 'jpg', magicBytes: ['ffd8ff'] },
	{ extension: 'webp', mime: 'image/webp', type: 'webp', magicBytes: ['52494646'], supplemental: isWebp },
	{ extension: 'svg', mime: 'image/svg+xml', type: 'svg', magicBytes: ['3c'], supplemental: isSvgOrHtmlPrefix },
	{ extension: 'html', mime: 'text/html', type: 'html', magicBytes: ['3c'], supplemental: isSvgOrHtmlPrefix }
];

function getFileType(file: File): FileTypeMap | undefined {
	const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
	return ALLOWED_TYPES.find(
		(t) => t.extension === ext || (file.type && file.type === t.mime)
	);
}

function getLayerDimensions(
	type: LayerType,
	file: File
): Promise<{ width: number; height: number }> {
	if (type === 'html') {
		return Promise.resolve({ width: 300, height: 300 });
	}
	if (type === 'svg') {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = () => {
				const text = reader.result as string;
				const viewBoxMatch = text.match(/viewBox="([^"]+)"/);
				const widthMatch = text.match(/width="([^"]+)"/);
				const heightMatch = text.match(/height="([^"]+)"/);
				if (viewBoxMatch) {
					const parts = viewBoxMatch[1].split(/\s+/);
					if (parts.length === 4) {
						resolve({ width: parseFloat(parts[2]), height: parseFloat(parts[3]) });
						return;
					}
				}
				resolve({
					width: widthMatch ? parseFloat(widthMatch[1]) : 300,
					height: heightMatch ? parseFloat(heightMatch[1]) : 300
				});
			};
			reader.readAsText(file);
		});
	}
	return new Promise((resolve) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
			URL.revokeObjectURL(url);
		};
		img.src = url;
	});
}

export async function handleFileUpload(files: FileList | File[]) {
	const addedLayerIds: string[] = [];
	const newLayers: Array<{ name: string; type: LayerType; blob: Blob; objectUrl: string; dims: { width: number; height: number } }> = [];

	try {
		const fileArray = Array.from(files);

		if (projectStore.project.layers.length + fileArray.length > MAX_LAYERS) {
			throw new Error(`Maximum ${MAX_LAYERS} layers per project`);
		}

		const currentSize = getProjectSize(projectStore.project.layers);
		const incomingSize = fileArray.reduce((sum, f) => sum + f.size, 0);

		if (currentSize + incomingSize > MAX_PROJECT_SIZE) {
			throw new Error(`Project exceeds maximum size of 100 MB`);
		}

		for (const file of fileArray) {
			if (file.size > MAX_FILE_SIZE) {
				throw new Error(`File "${file.name}" exceeds maximum size of 25 MB`);
			}

			const fileType = getFileType(file);
			if (!fileType) continue;

			const bytesOk = await checkMagicBytes(file, fileType.magicBytes);
			if (!bytesOk) continue;

			if (fileType.supplemental) {
				const buf = await file.slice(0, 12).arrayBuffer();
				if (!fileType.supplemental(new Uint8Array(buf))) continue;
			}

			if (fileType.type === 'html' && file.size > MAX_HTML_SIZE) {
				throw new Error(`HTML file "${file.name}" exceeds maximum size of 512 KB`);
			}
			if (fileType.type === 'svg' && file.size > MAX_SVG_SIZE) {
				throw new Error(`SVG file "${file.name}" exceeds maximum size of 5 MB`);
			}

			const dims = await getLayerDimensions(fileType.type, file);

			let blob: Blob = file;
			if (fileType.type === 'svg') {
				const text = await file.text();
				const sanitized = sanitizeSvg(text);
				blob = new Blob([sanitized], { type: 'image/svg+xml' });
			}

			const objectUrl = URL.createObjectURL(blob);
			newLayers.push({ name: file.name.replace(/\.[^.]+$/, ''), type: fileType.type, blob, objectUrl, dims });
		}

		const newBlobsSize = newLayers.reduce((sum, l) => sum + l.blob.size, 0);
		if (currentSize + newBlobsSize > MAX_PROJECT_SIZE) {
			throw new Error(`Project exceeds maximum size of 100 MB after processing`);
		}

		for (const l of newLayers) {
			const added = projectStore.addLayer({
				name: l.name,
				type: l.type,
				blob: l.blob,
				objectUrl: l.objectUrl,
				x: 0,
				y: 0,
				width: l.dims.width,
				height: l.dims.height,
				opacity: 100,
				visible: true,
				lockRatio: true
			});
			addedLayerIds.push(added.id);
		}
		await projectStore.save();
	} catch (e) {
		for (const id of addedLayerIds) {
			try { projectStore.removeLayer(id); } catch { /* cleanup */ }
		}
		for (const l of newLayers) {
			URL.revokeObjectURL(l.objectUrl);
		}
		throw e;
	}
}

function mimeToLayerType(mime: string): LayerType | undefined {
	const match = ALLOWED_TYPES.find((t) => t.mime === mime);
	return match?.type;
}

export async function loadArweaveLayer(txId: string, name: string, mime: string, contentHash?: string): Promise<boolean> {
	const layerType = mimeToLayerType(mime);
	if (!layerType) return false;

	if (projectStore.project.layers.length >= MAX_LAYERS) return false;

	let result: { blob: Blob; mime: string };
	try {
		result = await resolveRemoteLayer(txId, contentHash, layerType);
	} catch {
		return false;
	}

	let blob = result.blob;

	if (blob.size > MAX_FILE_SIZE) return false;

	const currentSize = getProjectSize(projectStore.project.layers);
	if (currentSize + blob.size > MAX_PROJECT_SIZE) return false;

	if (layerType === 'html') {
		const text = await blob.text();
		blob = new Blob([text], { type: 'text/html' });
	}

	if (blob.size === 0) return false;

	let width = 300;
	let height = 300;

	if (layerType === 'svg') {
		const text = await blob.text();
		const viewBoxMatch = text.match(/viewBox="([^"]+)"/);
		if (viewBoxMatch) {
			const parts = viewBoxMatch[1].split(/\s+/);
			if (parts.length === 4) {
				width = parseFloat(parts[2]);
				height = parseFloat(parts[3]);
			}
		}
	} else if (layerType !== 'html') {
		try {
			const dims = await new Promise<{ width: number; height: number }>((resolve) => {
				const img = new Image();
				const url = URL.createObjectURL(blob);
				img.onload = () => {
					resolve({ width: img.naturalWidth, height: img.naturalHeight });
					URL.revokeObjectURL(url);
				};
				img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 300, height: 300 }); };
				img.src = url;
			});
			width = dims.width;
			height = dims.height;
		} catch { /* keep defaults */ }
	}

	const objectUrl = URL.createObjectURL(blob);

	projectStore.addLayer({
		name: name.replace(/\.[^.]+$/, ''),
		type: layerType,
		blob,
		objectUrl,
		arTxId: txId,
		contentHash,
		x: 0,
		y: 0,
		width,
		height,
		opacity: 100,
		visible: true,
		lockRatio: true
	});

	await projectStore.save();
	return true;
}