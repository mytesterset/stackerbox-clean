import { Contract, keccak256 } from 'ethers';
import type { Provider } from 'ethers';
import { ERC721TL_ABI, MANIFOLD_ABI, ERC165_ABI, ERC721_INTERFACE_ID, ERC1155_INTERFACE_ID, MANIFOLD_CREATOR_RUNTIME_HASHES, MANIFOLD_FACTORY_ADDRESS, MANIFOLD_DEPLOYMENT_EVENT_TOPIC, verifyEip1167Proxy } from './abi';
import type { ContractKind, ContractStandard } from './abi';

export interface TlContract {
	address: string;
	chainId: number;
	name: string;
	symbol: string;
	kind: ContractKind;
	standard: ContractStandard;
}

interface ContractCandidate {
	address: string;
	chainId: number;
	factory?: string;
	txHash?: string;
}

interface DeploymentReceipt {
	to: string | null;
	status: number | null;
	hash: string;
	logs: readonly { address: string; topics: readonly string[]; data: string }[];
}

export function isAllowedManifoldCreatorCodeHash(codeHash: string): boolean {
	return MANIFOLD_CREATOR_RUNTIME_HASHES.has(codeHash.toLowerCase());
}

export function isVerifiedManifoldDeployment(candidate: ContractCandidate, receipt: DeploymentReceipt | null): boolean {
	const factory = candidate.factory?.toLowerCase();
	if (candidate.chainId !== 1 || factory !== MANIFOLD_FACTORY_ADDRESS || !candidate.txHash || !receipt) return false;
	if (receipt.status !== 1 || receipt.to?.toLowerCase() !== factory) return false;
	if (receipt.hash.toLowerCase() !== candidate.txHash.toLowerCase()) return false;

	return receipt.logs.some((log) => {
		if (log.address.toLowerCase() !== factory || log.topics[0]?.toLowerCase() !== MANIFOLD_DEPLOYMENT_EVENT_TOPIC) return false;
		return log.data.length >= 66 && `0x${log.data.slice(-40)}`.toLowerCase() === candidate.address.toLowerCase();
	});
}

async function fetchWithTimeout(url: string, timeoutMs = 15_000): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

async function fetchBackendContracts(walletAddress: string, retries = 2): Promise<ContractCandidate[]> {
	let response: Response;
	try {
		response = await fetchWithTimeout(`/api/tl-contracts?wallet=${encodeURIComponent(walletAddress)}`);
	} catch (e) {
		if (retries > 0) {
			await new Promise((r) => setTimeout(r, 1500));
			return fetchBackendContracts(walletAddress, retries - 1);
		}
		throw new Error('Failed to reach the contract discovery service. Check your network connection.');
	}
	if (!response.ok) {
		let body = '';
		try { body = await response.text(); } catch { /* ignore */ }
		let serverMessage: string | null = null;
		try {
			const parsed = JSON.parse(body);
			serverMessage = parsed?.message ?? null;
		} catch { /* non-JSON body — let retry handle it */ }
		if (serverMessage) throw new Error(serverMessage);
		if ((response.status >= 500 || response.status === 429) && retries > 0) {
			const delay = response.status === 429 ? 3000 : 1500;
			await new Promise((r) => setTimeout(r, delay));
			return fetchBackendContracts(walletAddress, retries - 1);
		}
		throw new Error(`Server error (${response.status}). Try refreshing or check that the Etherscan API key is configured.`);
	}
		const data = await response.json() as { contracts: ContractCandidate[] };
	return data.contracts;
}

async function detectStandardViaErc165(address: string, provider: Provider): Promise<ContractStandard | null> {
	try {
		const c = new Contract(address, ERC165_ABI, provider);
		const isErc721 = await c.supportsInterface(ERC721_INTERFACE_ID);
		if (isErc721) return 'erc721';
		const isErc1155 = await c.supportsInterface(ERC1155_INTERFACE_ID);
		if (isErc1155) return 'erc1155';
		return null;
	} catch {
		return null;
	}
}

async function tryManifoldContract(
	candidate: ContractCandidate,
	provider: Provider,
	walletAddress: string
): Promise<TlContract | null> {
	try {
		if (!isVerifiedManifoldDeployment(candidate, await provider.getTransactionReceipt(candidate.txHash ?? ''))) return null;
		const { address } = candidate;
		const bytecode = await provider.getCode(address);
		if (!bytecode || bytecode === '0x' || !isAllowedManifoldCreatorCodeHash(keccak256(bytecode))) return null;

		const c = new Contract(address, MANIFOLD_ABI, provider);
		const isAdmin = await c.isAdmin(walletAddress);

		let hasAccess = isAdmin;
		if (!hasAccess) {
			try {
				const ownerAddr = await c.owner();
				hasAccess = ownerAddr.toLowerCase() === walletAddress.toLowerCase();
			} catch { /* no owner access */ }
		}

		if (!hasAccess) return null;

		const standard = await detectStandardViaErc165(address, provider);
		if (!standard) return null;

		const name = await c.name().catch(() => '');
		const symbol = await c.symbol().catch(() => '');
		return { address, chainId: 1, name, symbol, kind: 'manifold', standard };
	} catch {
		return null;
	}
}

async function tryTlContract(
	candidate: ContractCandidate,
	provider: Provider,
	walletAddress: string
): Promise<TlContract | null> {
	try {
		const { address } = candidate;
		const bytecode = await provider.getCode(address);
		if (!verifyEip1167Proxy(bytecode, 1)) return null;

		const c = new Contract(address, ERC721TL_ABI, provider);
		let adminRole: string;
		try {
			adminRole = await c.ADMIN_ROLE();
		} catch {
			adminRole = '0x0000000000000000000000000000000000000000000000000000000000000000';
		}
		let isAdmin = await c.hasRole(adminRole, walletAddress);

		if (!isAdmin) {
			try {
				const ownerAddr = await c.owner();
				isAdmin = ownerAddr.toLowerCase() === walletAddress.toLowerCase();
			} catch { /* no owner access */ }
		}

		if (!isAdmin) return null;

		const standard = await detectStandardViaErc165(address, provider);
		if (!standard) return null;

		const name = await c.name().catch(() => '');
		const symbol = await c.symbol().catch(() => '');
		return { address, chainId: 1, name, symbol, kind: 'tl', standard };
	} catch {
		return null;
	}
}

async function verifyContract(
	candidate: ContractCandidate,
	provider: Provider,
	walletAddress: string
): Promise<TlContract | null> {
	return (await tryManifoldContract(candidate, provider, walletAddress))
		?? (await tryTlContract(candidate, provider, walletAddress));
}

export async function useTlContracts(
	walletAddress: string,
	provider: Provider
): Promise<TlContract[]> {
	const rawContracts = await fetchBackendContracts(walletAddress);
	const results: TlContract[] = [];

	for (const candidate of rawContracts) {
		const verified = await verifyContract(candidate, provider, walletAddress);
		if (verified) {
			results.push(verified);
		}
	}

	return results;
}