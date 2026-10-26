import type { HtmlMeta, LayerData, ProjectData, ProjectSettings } from '$lib/types';
import { CANVAS_MIN, CANVAS_MAX } from '$lib/types';
import { MAX_LAYERS, isValidDimension, isValidPosition, isValidOpacity, isValidOrder, validateContentHash } from '$lib/utils/validation';
import * as db from './db';

let project = $state<ProjectData>(createEmptyProject());
let selectedLayerId = $state<string | null>(null);

function createId(): string {
	return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function createEmptyProject(): ProjectData {
	return {
		id: createId(),
		name: 'New project',
		settings: { width: 1080, height: 1080 },
		layers: [],
		htmlMeta: { artist: '', description: '', year: String(new Date().getFullYear()) },
		createdAt: Date.now(),
		updatedAt: Date.now()
	};
}

function toPlainLayer(l: LayerData) {
	return {
		id: l.id,
		name: l.name,
		type: l.type,
		blob: l.blob,
		objectUrl: '',
		arTxId: l.arTxId,
		contentHash: l.contentHash,
		x: l.x,
		y: l.y,
		width: l.width,
		height: l.height,
		opacity: l.opacity,
		visible: l.visible,
		lockRatio: l.lockRatio,
		order: l.order
	};
}

function toPlainProject(p: ProjectData): ProjectData {
	return {
		id: p.id,
		name: p.name,
		settings: { width: p.settings.width, height: p.settings.height },
		layers: p.layers.map(toPlainLayer),
		htmlMeta: { ...p.htmlMeta },
		createdAt: p.createdAt,
		updatedAt: p.updatedAt
	};
}

export const projectStore = {
	get project(): ProjectData {
		return project;
	},

	get selectedLayerId(): string | null {
		return selectedLayerId;
	},

	getPlainProject(): ProjectData {
		return toPlainProject(project);
	},

	_revokeLayerUrls() {
		for (const layer of project.layers) {
			if (layer.objectUrl) URL.revokeObjectURL(layer.objectUrl);
		}
	},

	async listProjects(): Promise<db.ProjectMeta[]> {
		return db.listProjects();
	},

	async loadProject(id: string) {
		const data = await db.loadProject(id);
		this._revokeLayerUrls();
		project = data;
		selectedLayerId = null;
	},

	async newProject() {
		this._revokeLayerUrls();
		project = createEmptyProject();
		selectedLayerId = null;
	},

	async save() {
		const plain = this.getPlainProject();
		plain.updatedAt = Date.now();
		await db.saveProject(plain);
	},

	async deleteProject(id: string) {
		await db.deleteProject(id);
		if (project.id === id) {
			this._revokeLayerUrls();
			project = createEmptyProject();
			selectedLayerId = null;
		}
	},

	destroy() {
		this._revokeLayerUrls();
	},

	updateSettings(settings: Partial<ProjectSettings>) {
		const newWidth = settings.width ?? project.settings.width;
		const newHeight = settings.height ?? project.settings.height;
		if (newWidth < CANVAS_MIN || newWidth > CANVAS_MAX) return;
		if (newHeight < CANVAS_MIN || newHeight > CANVAS_MAX) return;
		project.settings = { ...project.settings, ...settings };
		project.updatedAt = Date.now();
	},

	updateHtmlMeta(meta: Partial<HtmlMeta>) {
		project.htmlMeta = { ...project.htmlMeta, ...meta };
		project.updatedAt = Date.now();
	},

	addLayer(layer: Omit<LayerData, 'id' | 'order'>) {
		const newLayer: LayerData = {
			...layer,
			id: createId(),
			order: project.layers.length
		};
		project.layers = [...project.layers, newLayer];
		project.updatedAt = Date.now();
		selectedLayerId = newLayer.id;
		return newLayer;
	},

	updateLayer(id: string, updates: Partial<Omit<LayerData, 'id'>>) {
		const old = project.layers.find((l) => l.id === id);
		if (updates.objectUrl !== undefined && old?.objectUrl && old.objectUrl !== updates.objectUrl) {
			URL.revokeObjectURL(old.objectUrl);
		}
		project.layers = project.layers.map((l) =>
			l.id === id ? { ...l, ...updates } : l
		);
		project.updatedAt = Date.now();
	},

	removeLayer(id: string) {
		const layer = project.layers.find((l) => l.id === id);
		if (layer?.objectUrl) URL.revokeObjectURL(layer.objectUrl);
		if (selectedLayerId === id) selectedLayerId = null;
		project.layers = project.layers
			.filter((l) => l.id !== id)
			.map((l, i) => ({ ...l, order: i }));
		project.updatedAt = Date.now();
	},

	selectLayer(id: string | null) {
		selectedLayerId = id;
	},

	reorderLayers(fromIndex: number, toIndex: number) {
		const layers = [...project.layers];
		const [moved] = layers.splice(fromIndex, 1);
		layers.splice(toIndex, 0, moved);
		project.layers = layers.map((l, i) => ({ ...l, order: i }));
		project.updatedAt = Date.now();
	},

	loadFromSharedComposition(data: {
		name: string;
		width: number;
		height: number;
		artist?: string;
		description?: string;
		year?: string;
		layers: Array<{
			arTxId: string;
			name: string;
			type: LayerData['type'];
			x: number;
			y: number;
			width: number;
			height: number;
			opacity: number;
			order: number;
			contentHash?: string;
		}>;
	}) {
		if (!data.layers || !Array.isArray(data.layers) || data.layers.length === 0) return;
		if (data.layers.length > MAX_LAYERS) return;

		for (const l of data.layers) {
			if (!l.arTxId || !l.contentHash) return;
			if (typeof l.arTxId !== 'string' || typeof l.contentHash !== 'string') return;

			try { validateContentHash(l.contentHash); } catch { return; }

			if (!isValidPosition(l.x) || !isValidPosition(l.y)) return;
			if (!isValidDimension(l.width) || !isValidDimension(l.height)) return;
			if (!isValidOpacity(l.opacity)) return;
			if (!isValidOrder(l.order)) return;
			if (typeof l.name !== 'string' || !l.name) return;
			if (typeof l.type !== 'string' || !['png', 'jpg', 'webp', 'svg', 'html'].includes(l.type)) return;
		}
		if (!isValidDimension(data.width) || !isValidDimension(data.height)) return;

		this._revokeLayerUrls();
		const layers: LayerData[] = data.layers.map((l) => ({
			id: createId(),
			name: l.name,
			type: l.type,
			blob: new Blob(),
			objectUrl: '',
			arTxId: l.arTxId,
			contentHash: l.contentHash,
			x: l.x,
			y: l.y,
			width: l.width,
			height: l.height,
			opacity: l.opacity,
			visible: true,
			lockRatio: true,
			order: l.order
		}));
		project = {
			id: createId(),
			name: data.name,
			settings: { width: data.width, height: data.height },
			layers,
			htmlMeta: {
				artist: data.artist || '',
				description: data.description || '',
				year: data.year || String(new Date().getFullYear())
			},
			createdAt: Date.now(),
			updatedAt: Date.now()
		};
		selectedLayerId = null;
	}
};