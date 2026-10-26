import { listUploads, saveUpload, deleteUpload } from './arweave-db';
import type { ArweaveUploadMeta } from './arweave-db';

let items = $state<ArweaveUploadMeta[]>([]);
let loaded = $state(false);

function makeThumbnail(blob: Blob, mime: string): Promise<Blob> {
	if (mime === 'text/html') {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#2563eb"/><text x="40" y="48" text-anchor="middle" fill="white" font-size="11" font-family="sans-serif">HTML</text></svg>`;
		return Promise.resolve(new Blob([svg], { type: 'image/svg+xml' }));
	}

	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(blob);
		img.onload = () => {
			const canvas = document.createElement('canvas');
			const maxSide = 160;
			let w = img.naturalWidth;
			let h = img.naturalHeight;
			if (w > h) { h = Math.round(h * (maxSide / w)); w = maxSide; }
			else { w = Math.round(w * (maxSide / h)); h = maxSide; }
			canvas.width = w;
			canvas.height = h;
			const ctx = canvas.getContext('2d');
			if (!ctx) { URL.revokeObjectURL(url); resolve(new Blob()); return; }
			ctx.drawImage(img, 0, 0, w, h);
			canvas.toBlob((b) => {
				URL.revokeObjectURL(url);
				resolve(b || new Blob());
			}, 'image/png');
		};
		img.onerror = () => { URL.revokeObjectURL(url); resolve(new Blob()); };
		img.src = url;
	});
}

export const galleryStore = {
	get items(): ArweaveUploadMeta[] {
		return items;
	},

	get loaded(): boolean {
		return loaded;
	},

	async load() {
		if (loaded) return;
		try {
			items = await listUploads();
		} catch {
			items = [];
		}
		loaded = true;
	},

	async addItem(txId: string, name: string, mime: string, isArtwork: boolean, blob?: Blob, contentHash?: string) {
		const thumbnail = blob ? await makeThumbnail(blob, mime) : new Blob();
		await saveUpload({ txId, name, mime, contentHash, thumbnail, uploadedAt: Date.now(), isArtwork });
		const idx = items.findIndex((i) => i.txId === txId);
		const entry = { txId, name, mime, contentHash, thumbnail, uploadedAt: Date.now(), isArtwork };
		if (idx >= 0) items = [...items.slice(0, idx), entry, ...items.slice(idx + 1)];
		else items = [entry, ...items];
	},

	async removeItem(txId: string) {
		await deleteUpload(txId);
		items = items.filter((i) => i.txId !== txId);
	},

	getLatestArtworkTxId(): string | null {
		const artwork = items.find((i) => i.isArtwork);
		return artwork?.txId ?? null;
	}
};