import { describe, expect, it } from 'vitest';
import { MANIFOLD_DEPLOYMENT_EVENT_TOPIC, MANIFOLD_FACTORY_ADDRESS } from './abi';
import { isAllowedManifoldCreatorCodeHash, isVerifiedManifoldDeployment } from './discovery';

const contractAddress = '0x1234567890123456789012345678901234567890';
const transactionHash = `0x${'ab'.repeat(32)}`;

describe('isAllowedManifoldCreatorCodeHash', () => {
	it('accepts official Creator Core hashes case-insensitively', () => {
		expect(isAllowedManifoldCreatorCodeHash('0x402900e374bf4adbda9ee9c9f1fbc1d4c27df3c6e3bf795a42f25c04d2a3cd1e')).toBe(true);
		expect(isAllowedManifoldCreatorCodeHash('0x402900E374BF4ADBDA9EE9C9F1FBC1D4C27DF3C6E3BF795A42F25C04D2A3CD1E')).toBe(true);
	});

	it('rejects bytecode hashes outside official Creator Core artifacts', () => {
		expect(isAllowedManifoldCreatorCodeHash(`0x${'00'.repeat(32)}`)).toBe(false);
	});
});

function createReceipt(address = contractAddress, status = 1, hash = transactionHash) {
	return {
		to: MANIFOLD_FACTORY_ADDRESS,
		status,
		hash,
		logs: [{
			address: MANIFOLD_FACTORY_ADDRESS,
			topics: [MANIFOLD_DEPLOYMENT_EVENT_TOPIC],
			data: `0x${'0'.repeat(24)}${address.slice(2)}`
		}]
	};
}

describe('isVerifiedManifoldDeployment', () => {
	it('accepts a successful deployment emitted by the official factory', () => {
		expect(isVerifiedManifoldDeployment({
			address: contractAddress,
			chainId: 1,
			factory: MANIFOLD_FACTORY_ADDRESS,
			txHash: transactionHash
		}, createReceipt())).toBe(true);
	});

	it('rejects a receipt that does not prove the candidate deployment', () => {
		const candidate = {
			address: contractAddress,
			chainId: 1,
			factory: MANIFOLD_FACTORY_ADDRESS,
			txHash: transactionHash
		};

		expect(isVerifiedManifoldDeployment({ ...candidate, address: '0x0000000000000000000000000000000000000001' }, createReceipt())).toBe(false);
		expect(isVerifiedManifoldDeployment({ ...candidate, factory: contractAddress }, createReceipt())).toBe(false);
		expect(isVerifiedManifoldDeployment(candidate, createReceipt(contractAddress, 0))).toBe(false);
		expect(isVerifiedManifoldDeployment(candidate, createReceipt(contractAddress, 1, `0x${'cd'.repeat(32)}`))).toBe(false);
	});
});