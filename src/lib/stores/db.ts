import type { ProjectData } from '$lib/types';
import { validateProjectData, validateProjectLimits } from '$lib/utils/validation';

const DB_NAME = 'stackerbox';
const DB_VERSION = 2;
const STORE = 'projects';

function openDB(): Promise<IDBDatabase> {
	if (typeof indexedDB === 'undefined') {
		return Promise.reject(new Error('IndexedDB not available on server'));
	}
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) {
				db.createObjectStore(STORE, { keyPath: 'id' });
			}
			if (!db.objectStoreNames.contains('arweave-uploads')) {
				db.createObjectStore('arweave-uploads', { keyPath: 'txId' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export interface ProjectMeta {
	id: string;
	name: string;
	settings: { width: number; height: number };
	layerCount: number;
	createdAt: number;
	updatedAt: number;
}

export async function listProjects(): Promise<ProjectMeta[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly');
		const req = tx.objectStore(STORE).getAll();
		req.onsuccess = () => {
			const projects = (req.result as ProjectData[]).map((p) => ({
				id: p.id,
				name: p.name,
				settings: { ...p.settings },
				layerCount: p.layers.length,
				createdAt: p.createdAt,
				updatedAt: p.updatedAt
			}));
			projects.sort((a, b) => b.updatedAt - a.updatedAt);
			resolve(projects);
		};
		req.onerror = () => reject(req.error);
	});
}

export async function loadProject(id: string): Promise<ProjectData> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly');
		const req = tx.objectStore(STORE).get(id);
		req.onsuccess = () => {
			const project = req.result as ProjectData | undefined;
			if (!project) {
				reject(new Error('Project not found'));
				return;
			}

			const limitErrors = validateProjectLimits(project.layers);
			if (limitErrors.length > 0) {
				reject(new Error(`Project exceeds limits: ${limitErrors[0].reason}`));
				return;
			}

			const dataErrors = validateProjectData(project);
			if (dataErrors.length > 0) {
				reject(new Error(`Invalid project data: ${dataErrors[0].message}`));
				return;
			}

			for (const layer of project.layers) {
				layer.objectUrl = URL.createObjectURL(layer.blob);
			}
			resolve(project);
		};
		req.onerror = () => reject(req.error);
	});
}

export async function saveProject(project: ProjectData): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		const req = tx.objectStore(STORE).put(project);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
}

export async function deleteProject(id: string): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		const req = tx.objectStore(STORE).delete(id);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
}