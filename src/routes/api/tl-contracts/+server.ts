import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/logger';
import { MANIFOLD_FACTORY_ADDRESS } from '$lib/mint/abi';

/* Rate limiter: process-local Map per instance.
 * Single-instance deployments share no state. For multi-instance production,
 * replace with Redis/Upstash or configure rate limiting in the reverse proxy/CDN.
 * The current cleanup prevents unbounded memory growth as defense-in-depth.
 */

const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';
const UNIVERSAL_DEPLOYER = '0x7c24805454F7972d36BEE9D139BD93423AA29f3f';
const DEPLOYERS = [UNIVERSAL_DEPLOYER, MANIFOLD_FACTORY_ADDRESS];

const PAGE_SIZE = 1000;
const MAX_PAGES = 10;
const MAX_TRANSACTIONS = 10000;
const MAX_DEPLOY_TXS = 500;
const MAX_CONTRACTS = 200;
const FETCH_TIMEOUT_MS = 10_000;

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_RATE_LIMIT_ENTRIES = 10_000;

function getRateLimitKey(event: RequestEvent): string {
	return event.getClientAddress();
}

function cleanupRateLimitMap() {
	if (rateLimitMap.size <= MAX_RATE_LIMIT_ENTRIES) return;
	const now = Date.now();
	for (const [key, entry] of rateLimitMap) {
		if (now > entry.resetAt) rateLimitMap.delete(key);
	}
	if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
		const sorted = [...rateLimitMap.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
		const toRemove = rateLimitMap.size - MAX_RATE_LIMIT_ENTRIES;
		for (let i = 0; i < toRemove; i++) rateLimitMap.delete(sorted[i][0]);
	}
}

function checkRateLimit(event: RequestEvent): void {
	const key = getRateLimitKey(event);
	const now = Date.now();
	const entry = rateLimitMap.get(key);

	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		cleanupRateLimitMap();
		return;
	}

	if (entry.count >= RATE_LIMIT_MAX) {
		error(429, 'Too many requests');
	}

	entry.count++;
}

function etherscanUrl(params: Record<string, string>): string {
	const merged = new URLSearchParams();
	merged.set('chainid', '1');
	for (const [k, v] of Object.entries(params)) {
		merged.set(k, v);
	}
	merged.set('apikey', env.ETHERSCAN_API_KEY ?? '');
	return `${ETHERSCAN_BASE}?${merged.toString()}`;
}

const ETHERSCAN_RATE_LIMIT_MS = 210;

let lastEtherscanCall = 0;

async function etherscanFetch(url: string): Promise<Response> {
	const now = Date.now();
	const wait = lastEtherscanCall + ETHERSCAN_RATE_LIMIT_MS - now;
	if (wait > 0) {
		await new Promise((resolve) => setTimeout(resolve, wait));
	}
	lastEtherscanCall = Date.now();
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		return await fetch(url, { signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

async function etherscanJson(url: string): Promise<{ status: string; message: string; result: unknown[] }> {
	const res = await etherscanFetch(url);
	if (!res.ok) return { status: '0', message: `HTTP ${res.status}`, result: [] };
	return res.json() as Promise<{ status: string; message: string; result: unknown[] }>;
}

export async function GET(event: RequestEvent) {
	checkRateLimit(event);

	if (!env.ETHERSCAN_API_KEY) {
		logger.error({ msg: 'ETHERSCAN_API_KEY is not set' });
		error(500, 'Server configuration error: ETHERSCAN_API_KEY is not set');
	}

	const wallet = event.url.searchParams.get('wallet');
	if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
		error(400, 'Invalid wallet address');
	}

	try {
		const deployTxs: { hash: string; factory: string }[] = [];
		let page = 1;
		let totalTransactions = 0;

		while (page <= MAX_PAGES) {
			const txListUrl = etherscanUrl({
				module: 'account',
				action: 'txlist',
				address: wallet,
				startblock: '0',
				endblock: '99999999',
				page: String(page),
				offset: String(PAGE_SIZE),
				sort: 'asc'
			});

			const txListData = await etherscanJson(txListUrl);

			if (txListData.status === '0') {
				if (txListData.message === 'No transactions found') {
					break;
				}
				logger.error({ msg: 'Etherscan txlist error', etherscanMessage: txListData.message });
				error(502, 'Indexer error');
			}

			const transactions = (txListData.result ?? []) as { hash: string; to: string }[];

			for (const tx of transactions) {
				if (totalTransactions >= MAX_TRANSACTIONS) break;
				totalTransactions++;
				const txTo = tx.to?.toLowerCase();
				if (txTo && DEPLOYERS.some((d) => d.toLowerCase() === txTo)) {
					if (deployTxs.length < MAX_DEPLOY_TXS) {
						deployTxs.push({ hash: tx.hash, factory: txTo });
					}
				}
			}

			if (totalTransactions >= MAX_TRANSACTIONS) break;
			if (transactions.length < PAGE_SIZE) break;
			page++;
		}

		const contracts: { address: string; chainId: number; factory: string; txHash: string }[] = [];

		for (const tx of deployTxs) {
			if (contracts.length >= MAX_CONTRACTS) break;

			try {
				const internalUrl = etherscanUrl({
					module: 'account',
					action: 'txlistinternal',
					txhash: tx.hash
				});

				const internalData = await etherscanJson(internalUrl);
				if (internalData.status === '0') continue;

				const traces = (internalData.result ?? []) as { contractAddress: string }[];

				for (const trace of traces) {
					if (contracts.length >= MAX_CONTRACTS) break;
					if (trace.contractAddress && trace.contractAddress !== '') {
						contracts.push({
							address: trace.contractAddress,
							chainId: 1,
							factory: tx.factory,
							txHash: tx.hash
						});
					}
				}
			} catch (err) {
				logger.error({ msg: 'Failed to fetch internal txs', txHash: tx.hash, err });
				continue;
			}
		}

		return json({ contracts });
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		logger.error({ msg: 'Contract discovery error', err });
		error(502, 'Indexer error');
	}
}