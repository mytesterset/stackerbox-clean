import { CANVAS_MIN } from '$lib/types';

export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const MAX_PROJECT_SIZE = 100 * 1024 * 1024;
export const MAX_LAYERS = 50;
export const MAX_HTML_SIZE = 512 * 1024;
export const MAX_SVG_SIZE = 5 * 1024 * 1024;
export const MAX_ZIP_SIZE = 500 * 1024 * 1024;
export const MAX_DIMENSION = 8000;

const VALID_LAYER_TYPES = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg', 'html']);

export function safeNumber(value: unknown, min: number, max: number): number {
	const number = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(number)) throw new Error('Invalid numeric value');
	return Math.min(max, Math.max(min, number));
}

export function isValidPosition(value: unknown): boolean {
	if (typeof value !== 'number') return false;
	return Number.isFinite(value) && value >= -MAX_DIMENSION && value <= MAX_DIMENSION;
}

export function isValidDimension(value: unknown): boolean {
	if (typeof value !== 'number') return false;
	return Number.isFinite(value) && value >= CANVAS_MIN && value <= MAX_DIMENSION;
}

export function isValidOpacity(value: unknown): boolean {
	if (typeof value !== 'number') return false;
	return Number.isFinite(value) && value >= 0 && value <= 100;
}

export function isValidOrder(value: unknown): boolean {
	if (typeof value !== 'number') return false;
	return Number.isFinite(value) && value >= 0;
}

export interface ValidationError {
	field: string;
	message: string;
}

export function validateLayerData(layer: unknown, index: number): ValidationError[] {
	const errors: ValidationError[] = [];
	const prefix = `layers[${index}]`;

	if (!layer || typeof layer !== 'object') {
		errors.push({ field: prefix, message: 'Layer is not an object' });
		return errors;
	}

	const l = layer as Record<string, unknown>;

	if (typeof l.id !== 'string' || !l.id) errors.push({ field: `${prefix}.id`, message: 'Missing or invalid id' });
	if (typeof l.name !== 'string') errors.push({ field: `${prefix}.name`, message: 'Missing or invalid name' });
	if (!VALID_LAYER_TYPES.has(l.type as string)) errors.push({ field: `${prefix}.type`, message: 'Invalid layer type' });
	if (!isValidPosition(l.x)) errors.push({ field: `${prefix}.x`, message: 'Invalid x coordinate' });
	if (!isValidPosition(l.y)) errors.push({ field: `${prefix}.y`, message: 'Invalid y coordinate' });
	if (!isValidDimension(l.width)) errors.push({ field: `${prefix}.width`, message: 'Invalid width' });
	if (!isValidDimension(l.height)) errors.push({ field: `${prefix}.height`, message: 'Invalid height' });
	if (!isValidOpacity(l.opacity)) errors.push({ field: `${prefix}.opacity`, message: 'Invalid opacity' });
	if (!isValidOrder(l.order)) errors.push({ field: `${prefix}.order`, message: 'Invalid order' });

	return errors;
}

export function validateProjectData(data: unknown): ValidationError[] {
	const errors: ValidationError[] = [];

	if (!data || typeof data !== 'object') {
		errors.push({ field: 'root', message: 'Project data is not an object' });
		return errors;
	}

	const p = data as Record<string, unknown>;

	if (typeof p.id !== 'string' || !p.id) errors.push({ field: 'id', message: 'Missing or invalid id' });
	if (typeof p.name !== 'string') errors.push({ field: 'name', message: 'Missing or invalid name' });

	if (!p.settings || typeof p.settings !== 'object') {
		errors.push({ field: 'settings', message: 'Missing settings' });
	} else {
		const s = p.settings as Record<string, unknown>;
		if (!isValidDimension(s.width)) errors.push({ field: 'settings.width', message: 'Invalid canvas width' });
		if (!isValidDimension(s.height)) errors.push({ field: 'settings.height', message: 'Invalid canvas height' });
	}

	if (!Array.isArray(p.layers)) {
		errors.push({ field: 'layers', message: 'Layers must be an array' });
	} else {
		if (p.layers.length > MAX_LAYERS) {
			errors.push({ field: 'layers', message: `Too many layers (max ${MAX_LAYERS})` });
		}
		for (let i = 0; i < p.layers.length; i++) {
			errors.push(...validateLayerData(p.layers[i], i));
		}
	}

	return errors;
}

const SVG_ALLOWED_ELEMENTS = new Set([
	'svg', 'g', 'defs', 'symbol', 'use',
	'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path',
	'text', 'tspan', 'textPath',
	'image', 'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient', 'stop',
	'filter', 'feGaussianBlur', 'feOffset', 'feMerge', 'feMergeNode', 'feColorMatrix', 'feBlend', 'feComposite',
	'title', 'desc', 'metadata',
	'switch', 'view'
]);

const SVG_ALLOWED_ATTRS = new Set([
	'xmlns', 'viewBox', 'preserveAspectRatio',
	'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r',
	'd', 'points', 'transform', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
	'opacity', 'fill-opacity', 'stroke-opacity',
	'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline',
	'id', 'class', 'style', 'display', 'visibility',
	'x1', 'y1', 'x2', 'y2',
	'offset', 'stop-color', 'stop-opacity',
	'stdDeviation', 'dx', 'dy', 'in', 'in2', 'result', 'type', 'mode', 'values',
	'href', 'xlink:href',
	'clip-path', 'mask', 'fill-rule', 'clip-rule',
	'requiredFeatures', 'systemLanguage',
	'startOffset', 'method', 'spacing',
	'orient', 'refX', 'refY', 'markerWidth', 'markerHeight',
	'patternUnits', 'patternTransform',
	'gradientUnits', 'gradientTransform', 'spreadMethod',
	'filterUnits', 'primitiveUnits',
	'vector-effect',
	'attributeName', 'attributeType', 'from', 'to', 'by', 'begin', 'end', 'dur',
	'repeatCount', 'repeatDur', 'keyTimes', 'keySplines', 'calcMode',
	'restart', 'additive', 'accumulate', 'min', 'max'
]);

const SVG_EVENT_ATTR_RE = /^on\w+/i;

export function sanitizeSvg(svgText: string): string {
	const parser = new DOMParser();
	const doc = parser.parseFromString(svgText, 'text/xml');

	const parseError = doc.querySelector('parsererror');
	if (parseError) {
		throw new Error('Invalid SVG: malformed XML');
	}

	const svgRoot = doc.documentElement;
	if (!svgRoot || svgRoot.tagName.toLowerCase() !== 'svg') {
		throw new Error('Invalid SVG: no root <svg> element');
	}

	sanitizeAttributes(svgRoot);
	walkAndSanitize(svgRoot);

	return new XMLSerializer().serializeToString(doc);
}

function walkAndSanitize(node: Element) {
	const children = Array.from(node.children);
	for (const child of children) {
		const tagLocal = child.localName || child.tagName;
		if (!SVG_ALLOWED_ELEMENTS.has(tagLocal)) {
			child.remove();
			continue;
		}

		sanitizeAttributes(child);
		walkAndSanitize(child);
	}
}

function sanitizeAttributes(el: Element) {
	const attrs = Array.from(el.attributes);
	for (const attr of attrs) {
		const name = attr.name;
		if (SVG_EVENT_ATTR_RE.test(name)) {
			el.removeAttribute(name);
			continue;
		}
		if (!SVG_ALLOWED_ATTRS.has(name)) {
			el.removeAttribute(name);
			continue;
		}
		if (name === 'href' || name === 'xlink:href') {
			const val = attr.value.trim();
			if (val && !val.startsWith('#')) {
				el.removeAttribute(name);
			}
		}
	}

	const style = el.getAttribute('style');
	if (style) {
		const cleaned = style.replace(/url\s*\([^)]*\)/gi, 'none');
		if (cleaned !== style) {
			el.setAttribute('style', cleaned);
		}
	}
}

export function getProjectSize(layers: Array<{ blob?: Blob; size?: number }>): number {
	let total = 0;
	for (const layer of layers) {
		if (layer.blob && layer.blob.size > 0) total += layer.blob.size;
		else if (typeof layer.size === 'number' && layer.size > 0) total += layer.size;
	}
	return total;
}

export interface ProjectLimitError {
	reason: string;
	value: number;
	limit: number;
}

export function validateProjectLimits(layers: Array<{ blob?: Blob }>): ProjectLimitError[] {
	const errors: ProjectLimitError[] = [];

	if (layers.length > MAX_LAYERS) {
		errors.push({ reason: 'too many layers', value: layers.length, limit: MAX_LAYERS });
	}

	const size = getProjectSize(layers);
	if (size > MAX_PROJECT_SIZE) {
		errors.push({ reason: 'project too large', value: size, limit: MAX_PROJECT_SIZE });
	}

	return errors;
}

export function checkMagicBytes(file: File, expected: string[]): Promise<boolean> {
	return new Promise((resolve) => {
		const maxLen = Math.max(...expected.map((e) => e.length / 2), 12);
		const reader = new FileReader();
		reader.onload = () => {
			const arr = new Uint8Array(reader.result as ArrayBuffer);
			if (arr.length === 0) { resolve(false); return; }
			resolve(expected.some((sig) => matchesMagic(arr, sig)));
		};
		reader.onerror = () => resolve(false);
		reader.readAsArrayBuffer(file.slice(0, maxLen));
	});
}

function matchesMagic(bytes: Uint8Array, sig: string): boolean {
	const sigBytes = sig.length / 2;
	if (bytes.length < sigBytes) return false;
	for (let i = 0; i < sigBytes; i++) {
		const expectedB = parseInt(sig.slice(i * 2, i * 2 + 2), 16);
		if (bytes[i] !== expectedB) return false;
	}
	return true;
}

const PNG_FULL_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(bytes: Uint8Array): boolean {
	if (bytes.length < 8) return false;
	for (let i = 0; i < 8; i++) {
		if (bytes[i] !== PNG_FULL_SIG[i]) return false;
	}
	return true;
}

export function isWebp(bytes: Uint8Array): boolean {
	if (bytes.length < 12) return false;
	const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF';
	const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === 'WEBP';
	return riff && webp;
}

export function isSvgOrHtmlPrefix(bytes: Uint8Array): boolean {
	if (bytes.length < 3) return false;
	let offset = 0;
	if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
		offset = 3;
	}
	if (offset >= bytes.length) return false;
	while (offset < bytes.length && (bytes[offset] === 0x20 || bytes[offset] === 0x0a || bytes[offset] === 0x0d || bytes[offset] === 0x09)) {
		offset++;
	}
	if (offset >= bytes.length) return false;
	return bytes[offset] === 0x3c;
}

const CONTENT_HASH_RE = /^[a-fA-F0-9]{64}$/;

export function validateContentHash(hash: unknown): string {
	if (typeof hash !== 'string' || !CONTENT_HASH_RE.test(hash)) {
		throw new Error('Invalid content hash: must be 64 hex characters');
	}
	return hash.toLowerCase();
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}