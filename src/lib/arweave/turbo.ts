import type { AssetItem } from '../components/export/generate-export';
import type { SolanaWalletAdapter } from '@ardrive/turbo-sdk/web';
import type { Chain } from './wallet.svelte';
import type { LayerType } from '$lib/types';
import { validateContentHash, sanitizeSvg } from '$lib/utils/validation';

export const ARWEAVE_GATEWAYS = [
	'arweave.net',
	'ar-io.dev',
	'permagate.io',
	'perma.online'
] as const;

const KNOWN_SAFE_GATEWAY_DOMAINS = new Set([
	'arweave.net',
	'ar-io.dev',
	'permagate.io',
	'perma.online',
	'arweave.dev',
	'ar-io.net',
	'ardrive.io',
	'ardrive.net'
]);

const MAX_LIVE_GATEWAYS = 40;

const SOLANA_RPCS = [
	'https://solana-mainnet.rpc.extrnode.com',
	'https://api.mainnet-beta.solana.com'
];

export async function fetchLiveGateways(): Promise<string[]> {
	const peersUrls = [
		'https://ar-io.dev/ar-io/peers',
		'https://arweave.net/ar-io/peers',
		'https://permagate.io/ar-io/peers'
	];

	for (const url of peersUrls) {
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 5000);
			let res: Response;
			try {
				res = await fetch(url, { signal: controller.signal });
			} finally {
				clearTimeout(timer);
			}
			if (!res.ok) continue;
			const data = await res.json() as { gateways?: Record<string, { url: string }> };
			const gatewayUrls = new Set<string>(ARWEAVE_GATEWAYS);
			if (data.gateways) {
				for (const entry of Object.values(data.gateways)) {
					const gw = entry.url;
					if (gw && isValidGatewayUrl(gw) && isKnownSafeGateway(getHostname(gw))) {
						gatewayUrls.add(getHostname(gw));
					}
				}
			}
			const list = Array.from(gatewayUrls);
			if (list.length > MAX_LIVE_GATEWAYS) list.length = MAX_LIVE_GATEWAYS;
			if (list.length > 0) return list;
		} catch {
			continue;
		}
	}

	return [...ARWEAVE_GATEWAYS];
}

function getHostname(raw: string): string {
	try {
		const url = new URL(raw);
		return url.hostname;
	} catch {
		return raw.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
	}
}

function isValidGatewayUrl(raw: string): boolean {
	try {
		const url = new URL(raw);
		if (url.protocol !== 'https:') return false;
		if (url.username || url.password) return false;
		if (url.port) return false;
		if (url.pathname !== '/' || url.search || url.hash) return false;
		return true;
	} catch {
		return false;
	}
}

function isKnownSafeGateway(hostname: string): boolean {
	if (KNOWN_SAFE_GATEWAY_DOMAINS.has(hostname)) return true;
	const labels = hostname.split('.');
	if (labels.length < 2) return false;
	const rootDomain = labels.slice(-2).join('.');
	return KNOWN_SAFE_GATEWAY_DOMAINS.has(rootDomain);
}

export interface LayerUploadResult {
	txId: string;
	fileName: string;
	mime: string;
	layerId: string;
}

type TurboModule = typeof import('@ardrive/turbo-sdk/web');
export type TurboClient = ReturnType<TurboModule['TurboFactory']['authenticated']>;

function solanaAdapter(wallet: SolanaWallet): SolanaWalletAdapter {
	return {
		publicKey: wallet.publicKey!,
		signMessage: (m: Uint8Array) => wallet.signMessage(m),
		signTransaction: (tx: unknown) => wallet.signTransaction(tx)
	};
}

const SOLANA_RPC_CACHE_TTL_MS = 60_000;
let cachedSolanaRpc: string | null = null;
let cachedSolanaRpcAt = 0;

async function selectSolanaRpc(): Promise<string> {
	const now = Date.now();
	if (cachedSolanaRpc && now - cachedSolanaRpcAt < SOLANA_RPC_CACHE_TTL_MS) {
		return cachedSolanaRpc;
	}

	const testPayload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' });
	const opts: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: testPayload };
	for (const rpc of SOLANA_RPCS) {
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 3000);
			let res: Response;
			try {
				res = await fetch(rpc, { ...opts, signal: controller.signal });
			} finally {
				clearTimeout(timer);
			}
			if (res.ok) {
				cachedSolanaRpc = rpc;
				cachedSolanaRpcAt = now;
				return rpc;
			}
		} catch { continue; }
	}
	return SOLANA_RPCS[0];
}

export async function ensureBaseChain() {
	const provider = window.ethereum;
	if (!provider) return;
	try {
		await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] });
	} catch {
		try {
			await provider.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0x2105', chainName: 'Base', rpcUrls: ['https://mainnet.base.org'], nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, blockExplorerUrls: ['https://basescan.org'] }] });
		} catch { /* user rejected */ }
	}
}

export async function createClient(chain: Chain): Promise<TurboClient> {
	const { TurboFactory } = await import('@ardrive/turbo-sdk/web');

	if (chain === 'solana') {
		const wallet = window.solana;
		if (!wallet?.publicKey) throw new Error('Solana wallet not connected');
		const rpcUrl = await selectSolanaRpc();
		return TurboFactory.authenticated({
			walletAdapter: solanaAdapter(wallet),
			token: 'solana',
			gatewayUrl: rpcUrl
		});
	}

	const provider = window.ethereum;
	if (!provider) throw new Error('Ethereum wallet not connected');

	const { BrowserProvider } = await import('ethers');
	const bp = new BrowserProvider(provider, 'any');
	const ethSigner = await bp.getSigner();

	return TurboFactory.authenticated({
		walletAdapter: {
			getSigner: () => ethSigner
		},
		token: 'base-eth'
	});
}

export function arweaveUrl(txId: string): string {
	return `ar://${txId}`;
}

export function gatewayUrls(txId: string): string[] {
	return ARWEAVE_GATEWAYS.map((gateway) => `https://${gateway}/${txId}`);
}

const _gatewayFetchCache = new Map<string, Promise<{ blob: Blob; mime: string }>>();

export async function fetchFromGateway(txId: string, expectedHash?: string): Promise<{ blob: Blob; mime: string }> {
	const cacheKey = expectedHash ? `${txId}:${expectedHash}` : txId;
	const cached = _gatewayFetchCache.get(cacheKey);
	if (cached) return cached;

	const promise = _doFetchFromGateway(txId, expectedHash);
	_gatewayFetchCache.set(cacheKey, promise);
	promise.finally(() => {
		if (_gatewayFetchCache.get(cacheKey) === promise) {
			_gatewayFetchCache.delete(cacheKey);
		}
	});
	return promise;
}

export const fetchFromGatewayUnverified = fetchFromGateway;

const GATEWAY_FETCH_TIMEOUT_MS = 10_000;

async function gatewayFetch(url: string): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), GATEWAY_FETCH_TIMEOUT_MS);
	try {
		return await fetch(url, { mode: 'cors', signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

export async function fetchFromGatewayVerified(txId: string, expectedHash: string): Promise<{ blob: Blob; mime: string }> {
	validateContentHash(expectedHash);

	for (const gateway of ARWEAVE_GATEWAYS) {
		try {
			const url = `https://${gateway}/${txId}`;
			const res = await gatewayFetch(url);
			if (!res.ok) continue;
			const blob = await res.blob();

			const actualHash = await sha256(blob);
			if (actualHash !== expectedHash.toLowerCase()) continue;

			const mime = res.headers.get('Content-Type')?.split(';')[0].trim() || blob.type || 'application/octet-stream';
			if (!isAllowedContentType(mime)) continue;

			return { blob, mime };
		} catch {
			continue;
		}
	}
	throw new Error('Failed to fetch verified content from any gateway');
}

function isAllowedContentType(mime: string): boolean {
	const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'text/plain', 'text/html', 'application/json'];
	return allowed.some((a) => mime.toLowerCase().startsWith(a));
}

export async function fetchVerifiedJsonFromGateway<T>(txId: string, expectedHash: string): Promise<T> {
	validateContentHash(expectedHash);

	for (const gateway of ARWEAVE_GATEWAYS) {
		try {
			const url = `https://${gateway}/${txId}`;
			const res = await gatewayFetch(url);
			if (!res.ok) continue;
			const blob = await res.blob();

			const actualHash = await sha256(blob);
			if (actualHash !== expectedHash.toLowerCase()) continue;

			let text: string;
			try {
				text = await blob.text();
				return JSON.parse(text) as T;
			} catch {
				continue;
			}
		} catch {
			continue;
		}
	}
	throw new Error('Failed to fetch verified JSON from any gateway');
}

const LAYER_TYPE_MIME: Record<LayerType, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	webp: 'image/webp',
	svg: 'image/svg+xml',
	html: 'text/plain'
};

export async function resolveRemoteLayer(txId: string, contentHash: string | undefined, layerType: LayerType): Promise<{ blob: Blob; mime: string }> {
	if (!contentHash) {
		throw new Error('Content hash is required for remote layer loading');
	}

	const result = await fetchFromGatewayVerified(txId, contentHash);

	const expectedMime = LAYER_TYPE_MIME[layerType];
	const isHtmlMime = layerType === 'html' && (result.mime.startsWith('text/plain') || result.mime.startsWith('text/html'));
	if (!isHtmlMime && !result.mime.startsWith(expectedMime)) {
		throw new Error(`Content type mismatch: expected ${expectedMime}, got ${result.mime}`);
	}

	if (layerType === 'svg') {
		const text = await result.blob.text();
		const sanitized = sanitizeSvg(text);
		return { blob: new Blob([sanitized], { type: 'image/svg+xml' }), mime: 'image/svg+xml' };
	}
	if (layerType === 'html') {
		return { blob: new Blob([await result.blob.text()], { type: 'text/html' }), mime: 'text/html' };
	}

	return result;
}

async function _doFetchFromGateway(txId: string, expectedHash?: string): Promise<{ blob: Blob; mime: string }> {
	for (const gateway of ARWEAVE_GATEWAYS) {
		try {
			const url = `https://${gateway}/${txId}`;
			const res = await fetch(url, { mode: 'cors' });
			if (!res.ok) continue;
			const blob = await res.blob();

			if (expectedHash) {
				const actualHash = await sha256(blob);
				if (actualHash !== expectedHash) {
					continue;
				}
			}

			const mime = res.headers.get('Content-Type')?.split(';')[0].trim() || blob.type || 'image/png';
			return { blob, mime };
		} catch {
			continue;
		}
	}
	throw new Error('Failed to fetch file from any gateway');
}

export function allocateUploadBudgets(maxBatchAmount: bigint, assetSizes: number[]): bigint[] {
	if (assetSizes.some((size) => !Number.isSafeInteger(size) || size < 0)) {
		throw new Error('Asset sizes must be non-negative safe integers');
	}
	if (assetSizes.length === 0) return [];

	const totalBytes = assetSizes.reduce((sum, size) => sum + size, 0);
	let allocatedAmount = 0n;

	return assetSizes.map((size, index) => {
		const amount = index === assetSizes.length - 1
			? maxBatchAmount - allocatedAmount
			: totalBytes > 0
				? maxBatchAmount * BigInt(size) / BigInt(totalBytes)
				: maxBatchAmount / BigInt(assetSizes.length);
		allocatedAmount += amount;
		return amount;
	});
}

export async function uploadAssets(
	client: TurboClient,
	assets: AssetItem[],
	chain: Chain,
	onProgress?: (done: number, total: number) => void,
	onUploaded?: (result: LayerUploadResult, contentHash?: string) => void,
	signal?: AbortSignal
): Promise<LayerUploadResult[]> {
	const { OnDemandFunding, SOLToTokenAmount, ETHToTokenAmount } = await import('@ardrive/turbo-sdk/web');
	const maxBatchAmount = BigInt(chain === 'solana'
		? SOLToTokenAmount(0.1)
		: ETHToTokenAmount(0.005));
	const assetSizes = assets.map((asset) => asset.content instanceof Blob
		? asset.content.size
		: new TextEncoder().encode(asset.content).byteLength);
	const assetBudgets = allocateUploadBudgets(maxBatchAmount, assetSizes);
	const results: LayerUploadResult[] = [];
	const failures: { index: number; fileName: string; error: string }[] = [];

	for (let i = 0; i < assets.length; i++) {
		const asset = assets[i];
		const assetMaxAmount = assetBudgets[i];
		try {
			const response = await client.upload({
				data: asset.content,
				dataItemOpts: {
					tags: [
						{ name: 'Content-Type', value: asset.layer.type === 'html' ? 'text/plain' : asset.mime },
						{ name: 'App-Name', value: 'StackerBox' },
						{ name: 'App-Version', value: '1.0.0' }
					]
				},
				fundingMode: new OnDemandFunding({
					maxTokenAmount: assetMaxAmount.toString(),
					topUpBufferMultiplier: 1.1
				}),
				signal
			});

			const content = asset.content instanceof Blob
				? new Uint8Array(await asset.content.arrayBuffer())
				: new TextEncoder().encode(asset.content);
			const contentHash = await sha256Raw(content);

			const result: LayerUploadResult = {
				txId: response.id,
				fileName: asset.fileName,
				mime: asset.mime,
				layerId: asset.layer.id
			};
			results.push(result);
			onUploaded?.(result, contentHash);
		} catch (e) {
			failures.push({
				index: i,
				fileName: asset.fileName,
				error: e instanceof Error ? e.message : 'Upload failed'
			});
		}
		onProgress?.(i + 1, assets.length);
	}

	if (failures.length > 0 && results.length === 0) {
		throw new Error(`All ${failures.length} uploads failed: ${failures[0].error}`);
	}
	if (failures.length > 0) {
		const msg = `${results.length} of ${assets.length} uploaded. ${failures.length} failed: ${failures.map((f) => f.fileName).join(', ')}`;
		throw new UploadError(results, failures, msg);
	}

	return results;
}

export class UploadError extends Error {
	constructor(
		public readonly uploaded: LayerUploadResult[],
		public readonly failures: { index: number; fileName: string; error: string }[],
		message: string
	) {
		super(message);
		this.name = 'UploadError';
	}
}

export async function uploadHtml(client: TurboClient, html: string, chain: Chain, signal?: AbortSignal): Promise<string> {
	const { OnDemandFunding, SOLToTokenAmount, ETHToTokenAmount } = await import('@ardrive/turbo-sdk/web');
	const maxAmount = chain === 'solana'
		? SOLToTokenAmount(0.01)
		: ETHToTokenAmount(0.005);
	const response = await client.upload({
		data: html,
		dataItemOpts: {
			tags: [
				{ name: 'Content-Type', value: 'text/html' },
				{ name: 'App-Name', value: 'StackerBox' }
			]
		},
		fundingMode: new OnDemandFunding({
			maxTokenAmount: maxAmount,
			topUpBufferMultiplier: 1.1
		}),
		signal
	});
	return response.id;
}

export async function uploadComposition(client: TurboClient, json: string, chain: Chain, signal?: AbortSignal): Promise<{ txId: string; hash: string }> {
	const { OnDemandFunding, SOLToTokenAmount, ETHToTokenAmount } = await import('@ardrive/turbo-sdk/web');
	const maxAmount = chain === 'solana'
		? SOLToTokenAmount(0.01)
		: ETHToTokenAmount(0.005);
	const response = await client.upload({
		data: json,
		dataItemOpts: {
			tags: [
				{ name: 'Content-Type', value: 'application/json' },
				{ name: 'App-Name', value: 'StackerBox' },
				{ name: 'StackerBox-Type', value: 'shared-composition' }
			]
		},
		fundingMode: new OnDemandFunding({
			maxTokenAmount: maxAmount,
			topUpBufferMultiplier: 1.1
		}),
		signal
	});

	const hash = await sha256Raw(new TextEncoder().encode(json));
	return { txId: response.id, hash };
}

export async function fetchJsonFromGateway<T>(txId: string): Promise<T> {
	for (const gateway of ARWEAVE_GATEWAYS) {
		try {
			const url = `https://${gateway}/${txId}`;
			const res = await gatewayFetch(url);
			if (!res.ok) continue;
			const data = await res.json() as T;
			if (!data || typeof data !== 'object') continue;
			return data;
		} catch {
			continue;
		}
	}
	throw new Error('Failed to fetch composition from any gateway');
}

export async function sha256(blob: Blob): Promise<string> {
	const buffer = await blob.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function sha256Raw(data: Uint8Array): Promise<string> {
	const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export interface TurboBalance {
	winc: string;
	effectiveBalance: string;
	bytesRemaining: number;
}

let cachedPricePerByte: number | null = null;

export async function fetchTurboBalance(chain: Chain): Promise<TurboBalance | null> {
	try {
		const client = await createClient(chain);
		const balance = await client.getBalance();

		if (cachedPricePerByte === null) {
			try {
				const costs = await client.getUploadCosts({ bytes: [1_073_741_824] });
				if (costs && costs.length > 0) {
					const costForOneGiB = BigInt(costs[0].winc);
					cachedPricePerByte = Number(costForOneGiB) / 1_073_741_824;
				}
			} catch { /* keep default */ }
		}

		const effectiveWinc = BigInt(balance.effectiveBalance || '0');
		const bytesRemaining = cachedPricePerByte && cachedPricePerByte > 0
			? Number(effectiveWinc) / cachedPricePerByte
			: 0;

		return {
			winc: balance.winc || '0',
			effectiveBalance: balance.effectiveBalance || '0',
			bytesRemaining
		};
	} catch {
		return null;
	}
}