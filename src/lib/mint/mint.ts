import { Contract } from 'ethers';
import type { Signer, TransactionReceipt } from 'ethers';
import { ERC721TL_ABI, MANIFOLD_ABI, ERC1155TL_ABI, MANIFOLD_ERC1155_ABI } from './abi';
import type { ContractKind, ContractStandard } from './abi';

const CUSTOM_ERRORS: Record<string, string> = {
	'0x5d68c6e1': 'Not role or owner',
	'0x3f4ba145': 'Empty token URI',
	'0x849cc4b2': 'Mint to zero address',
	'0x66336b85': 'Not specified role'
};

function decodeError(data: string): string {
	const selector = data.slice(0, 10);
	return CUSTOM_ERRORS[selector] ?? `Unknown error (${selector})`;
}

const TRANSFER_SINGLE_TOPIC = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';

export async function mintToTlCollection(params: {
	signer: Signer;
	contractAddress: string;
	kind: ContractKind;
	standard: ContractStandard;
	recipient: string;
	metadataTxId: string;
	royalty?: { address: string; percent: number };
	amount?: bigint;
}): Promise<{ tokenId: bigint; txHash: string }> {
	const { signer, contractAddress, kind, standard, recipient, metadataTxId, royalty, amount } = params;
	const abi = kind === 'tl'
		? (standard === 'erc1155' ? ERC1155TL_ABI : ERC721TL_ABI)
		: (standard === 'erc1155' ? MANIFOLD_ERC1155_ABI : MANIFOLD_ABI);
	const contract = new Contract(contractAddress, abi, signer);
	const provider = signer.provider;
	if (!provider) throw new Error('Signer has no provider');

	const network = await provider.getNetwork();
	if (network.chainId !== 1n) {
		throw new Error('Please switch your wallet to Ethereum mainnet to mint.');
	}

	const signerAddress = await signer.getAddress();

	if (kind === 'tl') {
		let isAdmin = false;
		try {
			const adminRole = await contract.ADMIN_ROLE();
			isAdmin = await contract.hasRole(adminRole, signerAddress);
		} catch {
			isAdmin = false;
		}

		if (!isAdmin) {
			try {
				const ownerAddr = await contract.owner();
				isAdmin = ownerAddr.toLowerCase() === signerAddress.toLowerCase();
			} catch {
				isAdmin = false;
			}
		}

		if (!isAdmin) {
			throw new Error('You are no longer an admin of this contract.');
		}
	} else {
		let isAdmin = false;
		try {
			isAdmin = await contract.isAdmin(signerAddress);
		} catch { /* fall through */ }

		if (!isAdmin) {
			try {
				const ownerAddr = await contract.owner();
				isAdmin = ownerAddr.toLowerCase() === signerAddress.toLowerCase();
			} catch {
				isAdmin = false;
			}
		}

		if (!isAdmin) {
			throw new Error('You are no longer an admin of this contract.');
		}
	}

	const uri = `https://arweave.net/${metadataTxId}`;

	if (standard === 'erc1155') {
		const mintAmount = amount ?? 1n;

		if (kind === 'tl' && royalty) {
			const basis = await contract.BASIS();
			if (BigInt(royalty.percent) > basis) {
				throw new Error(`Royalty percent exceeds BASIS (${basis.toString()}).`);
			}

			let currentAddress = await signer.getAddress();
			if (currentAddress.toLowerCase() !== recipient.toLowerCase()) {
				throw new Error('Connected wallet changed during mint. The NFT must be minted to the wallet that owns the contract. Please reconnect and try again.');
			}
			await simulateMint(contract, kind, standard, recipient, uri, mintAmount, royalty.address, royalty.percent);

			currentAddress = await signer.getAddress();
			if (currentAddress.toLowerCase() !== recipient.toLowerCase()) {
				throw new Error('Connected wallet changed during mint. The NFT must be minted to the wallet that owns the contract. Please reconnect and try again.');
			}
			const tx = await contract.mint(recipient, mintAmount, uri, royalty.address, royalty.percent);
			const receipt = await tx.wait();
			return extractTokenId(receipt, standard);
		}

		let currentAddress = await signer.getAddress();
		if (currentAddress.toLowerCase() !== recipient.toLowerCase()) {
			throw new Error('Connected wallet changed during mint. The NFT must be minted to the wallet that owns the contract. Please reconnect and try again.');
		}
		await simulateMint(contract, kind, standard, recipient, uri, mintAmount);

		currentAddress = await signer.getAddress();
		if (currentAddress.toLowerCase() !== recipient.toLowerCase()) {
			throw new Error('Connected wallet changed during mint. The NFT must be minted to the wallet that owns the contract. Please reconnect and try again.');
		}
		const tx = kind === 'tl'
			? await contract.mint(recipient, mintAmount, uri)
			: await contract.mintBaseNew([recipient], [mintAmount], [uri]);
		const receipt = await tx.wait();
		return extractTokenId(receipt, standard);
	}

	if (kind === 'tl' && royalty) {
		const basis = await contract.BASIS();
		if (BigInt(royalty.percent) > basis) {
			throw new Error(`Royalty percent exceeds BASIS (${basis.toString()}).`);
		}

		let currentAddress = await signer.getAddress();
		if (currentAddress.toLowerCase() !== recipient.toLowerCase()) {
			throw new Error('Connected wallet changed during mint. The NFT must be minted to the wallet that owns the contract. Please reconnect and try again.');
		}
		await simulateMint(contract, kind, standard, recipient, uri, undefined, royalty.address, royalty.percent);

		currentAddress = await signer.getAddress();
		if (currentAddress.toLowerCase() !== recipient.toLowerCase()) {
			throw new Error('Connected wallet changed during mint. The NFT must be minted to the wallet that owns the contract. Please reconnect and try again.');
		}
		const tx = await contract.mint(recipient, uri, royalty.address, royalty.percent);
		const receipt = await tx.wait();
		return extractTokenId(receipt, standard);
	}

	let currentAddress = await signer.getAddress();
	if (currentAddress.toLowerCase() !== recipient.toLowerCase()) {
		throw new Error('Connected wallet changed during mint. The NFT must be minted to the wallet that owns the contract. Please reconnect and try again.');
	}
	await simulateMint(contract, kind, standard, recipient, uri);

	currentAddress = await signer.getAddress();
	if (currentAddress.toLowerCase() !== recipient.toLowerCase()) {
		throw new Error('Connected wallet changed during mint. The NFT must be minted to the wallet that owns the contract. Please reconnect and try again.');
	}
	const tx = kind === 'tl'
		? await contract.mint(recipient, uri)
		: await contract.mintBase(recipient, uri);
	const receipt = await tx.wait();
	return extractTokenId(receipt, standard);
}

async function simulateMint(
	contract: Contract,
	kind: ContractKind,
	standard: ContractStandard,
	recipient: string,
	uri: string,
	amount?: bigint,
	royaltyAddr?: string,
	royaltyPct?: number
): Promise<void> {
	try {
		if (royaltyAddr !== undefined && royaltyPct !== undefined) {
			if (standard === 'erc1155') {
				await contract.mint.estimateGas(recipient, amount ?? 1n, uri, royaltyAddr, royaltyPct);
			} else {
				await contract.mint.estimateGas(recipient, uri, royaltyAddr, royaltyPct);
			}
		} else if (kind === 'tl') {
			if (standard === 'erc1155') {
				await contract.mint.estimateGas(recipient, amount ?? 1n, uri);
			} else {
				await contract.mint.estimateGas(recipient, uri);
			}
		} else {
			if (standard === 'erc1155') {
				await contract.mintBaseNew.estimateGas([recipient], [amount ?? 1n], [uri]);
			} else {
				await contract.mintBase.estimateGas(recipient, uri);
			}
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Transaction simulation failed';

		if (e && typeof e === 'object' && 'data' in e) {
			const data = (e as { data: string }).data;
			if (typeof data === 'string' && data.startsWith('0x')) {
				throw new Error(`Transaction would revert: ${decodeError(data)}`);
			}
		}

		if (msg.includes('user rejected')) {
			throw new Error('Transaction rejected in wallet.');
		}

		throw new Error(`Transaction would revert: ${msg}`);
	}
}

function extractTokenId(receipt: TransactionReceipt, standard: ContractStandard): { tokenId: bigint; txHash: string } {
	if (standard === 'erc1155') {
		for (const log of receipt.logs) {
			if (log.topics[0] === TRANSFER_SINGLE_TOPIC) {
				const data = log.data;
				if (data && data !== '0x') {
					const tokenId = BigInt('0x' + data.slice(2, 66));
					return { tokenId, txHash: receipt.hash };
				}
			}
		}
		throw new Error('No TransferSingle event found in receipt');
	}

	const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

	for (const log of receipt.logs) {
		if (log.topics[0] === transferTopic && BigInt(log.topics[1]) === 0n) {
			const tokenId = BigInt(log.topics[3]);
			return { tokenId, txHash: receipt.hash };
		}
	}

	throw new Error('No Transfer event found in receipt');
}