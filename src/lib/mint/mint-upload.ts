import { createClient, ensureBaseChain } from '../arweave/turbo';
import type { Chain } from '../arweave/wallet.svelte';
import { isPng, isWebp } from '../utils/validation';

const ALLOWED_PREVIEW_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_PREVIEW_BYTES = 50 * 1024 * 1024;

export interface PreparedPreview {
	bytes: Uint8Array;
	mime: string;
}

export function validatePreviewFile(file: File): string | null {
	if (!ALLOWED_PREVIEW_MIMES.includes(file.type)) {
		return `Unsupported file type "${file.type}". Accepted: ${ALLOWED_PREVIEW_MIMES.join(', ')}.`;
	}
	if (file.size > MAX_PREVIEW_BYTES) {
		return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: ${MAX_PREVIEW_BYTES / 1024 / 1024} MB.`;
	}
	return null;
}

function checkRasterMagic(bytes: Uint8Array, mime: string): boolean {
	switch (mime) {
		case 'image/jpeg':
			return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
		case 'image/png':
			return isPng(bytes);
		case 'image/gif': {
			const signature = String.fromCharCode(...bytes.subarray(0, 6));
			return signature === 'GIF87a' || signature === 'GIF89a';
		}
		case 'image/webp':
			return isWebp(bytes);
		default:
			return false;
	}
}

export async function preparePreview(file: File): Promise<PreparedPreview> {
	const validationError = validatePreviewFile(file);
	if (validationError) throw new Error(validationError);

	const bytes = new Uint8Array(await file.arrayBuffer());
	if (!checkRasterMagic(bytes, file.type)) {
		throw new Error('File contents do not match the selected image type.');
	}
	return { bytes, mime: file.type };
}

export async function computeSha256(data: Uint8Array): Promise<string> {
	const hashBuffer = await crypto.subtle.digest('SHA-256', data as globalThis.BufferSource);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadPreviewImage(
	preview: PreparedPreview,
	chain: Chain
): Promise<string> {
	const { OnDemandFunding, ETHToTokenAmount, SOLToTokenAmount } = await import('@ardrive/turbo-sdk/web');

	if (chain === 'ethereum') await ensureBaseChain();
	const client = await createClient(chain);

	const maxAmount = chain === 'solana'
		? SOLToTokenAmount(0.01)
		: ETHToTokenAmount(0.005);

	const response = await client.upload({
		data: preview.bytes,
		dataItemOpts: {
			tags: [
				{ name: 'Content-Type', value: preview.mime },
				{ name: 'App-Name', value: 'StackerBox' },
				{ name: 'App-Version', value: '1.0.0' }
			]
		},
		fundingMode: new OnDemandFunding({
			maxTokenAmount: maxAmount,
			topUpBufferMultiplier: 1.1
		})
	});

	return response.id;
}

export async function uploadMetadataJson(
	json: string,
	chain: Chain
): Promise<string> {
	const { OnDemandFunding, ETHToTokenAmount, SOLToTokenAmount } = await import('@ardrive/turbo-sdk/web');

	if (chain === 'ethereum') await ensureBaseChain();
	const client = await createClient(chain);

	const maxAmount = chain === 'solana'
		? SOLToTokenAmount(0.01)
		: ETHToTokenAmount(0.005);

	const response = await client.upload({
		data: json,
		dataItemOpts: {
			tags: [
				{ name: 'Content-Type', value: 'application/json' },
				{ name: 'App-Name', value: 'StackerBox' },
				{ name: 'App-Version', value: '1.0.0' },
				{ name: 'StackerBox-Type', value: 'token-metadata' }
			]
		},
		fundingMode: new OnDemandFunding({
			maxTokenAmount: maxAmount,
			topUpBufferMultiplier: 1.1
		})
	});

	return response.id;
}