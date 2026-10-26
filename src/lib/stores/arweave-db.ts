const DB_NAME = 'stackerbox';
const DB_VERSION = 2;
const STORE = 'arweave-uploads';

export interface ArweaveUploadMeta {
	txId: string;
	name: string;
	mime: string;
	contentHash?: string;
	thumbnail: Blob;
	uploadedAt: number;
	isArtwork: boolean;
}

function openDB(): Promise<IDBDatabase> {
	if (typeof indexedDB === 'undefined') {
		return Promise.reject(new Error('IndexedDB not available'));
	}
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains('projects')) {
				db.createObjectStore('projects', { keyPath: 'id' });
			}
			if (!db.objectStoreNames.contains(STORE)) {
				db.createObjectStore(STORE, { keyPath: 'txId' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export async function listUploads(): Promise<ArweaveUploadMeta[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly');
		const req = tx.objectStore(STORE).getAll();
		req.onsuccess = () => {
			const items = (req.result as ArweaveUploadMeta[]).sort(
				(a, b) => b.uploadedAt - a.uploadedAt
			);
			resolve(items);
		};
		req.onerror = () => reject(req.error);
	});
}

export async function saveUpload(item: ArweaveUploadMeta): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		const req = tx.objectStore(STORE).put(item);
		req.onsuccess = () => tx.oncomplete = () => resolve();
		req.onerror = () => reject(req.error);
	});
}

export async function deleteUpload(txId: string): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		const req = tx.objectStore(STORE).delete(txId);
		req.onsuccess = () => tx.oncomplete = () => resolve();
		req.onerror = () => reject(req.error);
	});
}