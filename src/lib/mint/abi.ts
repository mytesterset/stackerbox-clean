export const ERC721TL_ABI = [
	{ inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
	{ inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
	{ inputs: [{ internalType: 'bytes32', name: 'role', type: 'bytes32' }, { internalType: 'address', name: 'account', type: 'address' }], name: 'hasRole', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
	{ inputs: [], name: 'ADMIN_ROLE', outputs: [{ type: 'bytes32' }], stateMutability: 'view', type: 'function' },
	{ inputs: [], name: 'owner', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
	{ inputs: [], name: 'BASIS', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
	{ inputs: [{ internalType: 'address', name: 'recipient', type: 'address' }, { internalType: 'string', name: 'uri', type: 'string' }], name: 'mint', outputs: [], stateMutability: 'nonpayable', type: 'function' },
	{ inputs: [{ internalType: 'address', name: 'recipient', type: 'address' }, { internalType: 'string', name: 'uri', type: 'string' }, { internalType: 'address', name: 'royaltyAddress', type: 'address' }, { internalType: 'uint256', name: 'royaltyPercent', type: 'uint256' }], name: 'mint', outputs: [], stateMutability: 'nonpayable', type: 'function' }
] as const;

export const MANIFOLD_ABI = [
	{ inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
	{ inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
	{ inputs: [{ internalType: 'address', name: 'admin', type: 'address' }], name: 'isAdmin', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
	{ inputs: [], name: 'owner', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
	{ inputs: [{ internalType: 'address', name: 'to', type: 'address' }, { internalType: 'string', name: 'uri', type: 'string' }], name: 'mintBase', outputs: [], stateMutability: 'nonpayable', type: 'function' }
] as const;

export type ContractKind = 'tl' | 'manifold';
export type ContractStandard = 'erc721' | 'erc1155';

export const ERC165_ABI = [
	{ inputs: [{ internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' }], name: 'supportsInterface', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' }
] as const;

export const ERC721_INTERFACE_ID = '0x80ac58cd';
export const ERC1155_INTERFACE_ID = '0xd9b67a26';

export const ERC1155TL_ABI = [
	{ inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
	{ inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
	{ inputs: [{ internalType: 'bytes32', name: 'role', type: 'bytes32' }, { internalType: 'address', name: 'account', type: 'address' }], name: 'hasRole', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
	{ inputs: [], name: 'ADMIN_ROLE', outputs: [{ type: 'bytes32' }], stateMutability: 'view', type: 'function' },
	{ inputs: [], name: 'owner', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
	{ inputs: [], name: 'BASIS', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
	{ inputs: [{ internalType: 'address', name: 'recipient', type: 'address' }, { internalType: 'uint256', name: 'numberOfTokens', type: 'uint256' }, { internalType: 'string', name: 'uri', type: 'string' }], name: 'mint', outputs: [], stateMutability: 'nonpayable', type: 'function' },
	{ inputs: [{ internalType: 'address', name: 'recipient', type: 'address' }, { internalType: 'uint256', name: 'numberOfTokens', type: 'uint256' }, { internalType: 'string', name: 'uri', type: 'string' }, { internalType: 'address', name: 'royaltyAddress', type: 'address' }, { internalType: 'uint256', name: 'royaltyPercent', type: 'uint256' }], name: 'mint', outputs: [], stateMutability: 'nonpayable', type: 'function' }
] as const;

export const MANIFOLD_ERC1155_ABI = [
	{ inputs: [], name: 'name', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
	{ inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
	{ inputs: [{ internalType: 'address', name: 'admin', type: 'address' }], name: 'isAdmin', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
	{ inputs: [], name: 'owner', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
	{ inputs: [{ internalType: 'address[]', name: 'to', type: 'address[]' }, { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }, { internalType: 'string[]', name: 'uris', type: 'string[]' }], name: 'mintBaseNew', outputs: [], stateMutability: 'nonpayable', type: 'function' }
] as const;

export const MANIFOLD_DETECT_ABI = [
	{ inputs: [{ internalType: 'address', name: 'admin', type: 'address' }], name: 'isAdmin', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' }
] as const;

export const ERC721TL_IMPLEMENTATIONS: Record<number, string[]> = {
	1: [
		'0x44a46be01bf45358bbc850a1fa1e1fa390756166',
		'0x86d8608c912be35a81b21aa692d67eb73d173daa',
		'0x516b8ca95eb59e7a69d79a27522ed63fcbe22b64',
		'0xd631b04e8fdbe152ee4c05273588f444efdedfaf',
		'0x72be8d37610ee69c72a50fa9728cb4a795fbcf38',
		'0x610538c97f8049b2bfa30990c66eb98b046ff336',
		'0xD724c9223760278933A6F90c531e809Ec1Baca1c',
		'0x154DAc76755d2A372804a9C409683F2eeFa9e5e9',
		'0x12Ab97BDe4a92e6261fca39fe2d9670E40c5dAF2',
		'0xFb1647BD77D28d0aCAB0c3632CeEF87E7CD62b04',
		'0x2De0972Fcd8ab0788697f92984b0D578F4c9ECA3'
	]
};

export const ERC1155TL_IMPLEMENTATIONS: Record<number, string[]> = {
	1: [
		'0x44a46be01bf45358bbc850a1fa1e1fa390756166',
		'0x86d8608c912be35a81b21aa692d67eb73d173daa',
		'0x516b8ca95eb59e7a69d79a27522ed63fcbe22b64',
		'0xd631b04e8fdbe152ee4c05273588f444efdedfaf',
		'0x72be8d37610ee69c72a50fa9728cb4a795fbcf38',
		'0xD724c9223760278933A6F90c531e809Ec1Baca1c',
		'0x154DAc76755d2A372804a9C409683F2eeFa9e5e9',
		'0x12Ab97BDe4a92e6261fca39fe2d9670E40c5dAF2',
		'0xFb1647BD77D28d0aCAB0c3632CeEF87E7CD62b04',
		'0x2De0972Fcd8ab0788697f92984b0D578F4c9ECA3'
	]
};

const EIP1167_PREFIX = '0x363d3d373d3d3d363d73';
const EIP1167_SUFFIX = '5af43d82803e903d91602b57fd5bf3';

export const MANIFOLD_FACTORY_ADDRESS = '0xf3cd1e9326d1965935b287b1ee75c7183359a88a';
export const MANIFOLD_DEPLOYMENT_EVENT_TOPIC = '0x4db17dd5e4732fb6da34a148104a592783ca119a1e7bb8829eba6cbadef0b511';
export const MANIFOLD_CREATOR_RUNTIME_HASHES = new Set([
	'0x077598f7086e19b1ae5b877e0bd92c6598d5ec6b962d383fdd666fa552e56caa',
	'0x0cd8236736e7854b23c354309161eb46fed15b7ecde903da9159a0dc318301c2',
	'0x27c73ce677cb3a10ba6a560e4423b507b3da3a3b02e5ef7e63493c497f9c7432',
	'0x28a315abf01dcfadb13cd15add13d0d303f860ec1aaff0b3500e834bab8fec13',
	'0x2f4000f2f95385d6fa0f446fd54766c0e06f36ceec476099f00c48b27ac8295a',
	'0x2fb813e38195ecc8dc395a13caf7591edafc6ca62ba8d995c7cb922e513faca1',
	'0x402900e374bf4adbda9ee9c9f1fbc1d4c27df3c6e3bf795a42f25c04d2a3cd1e',
	'0x4399c8799e49b49fab46e5936950361a5b4c7de4060d92595fc17694c97172f4',
	'0x48e3271581e3791a68bd993c3e5ca8c2fe3af791834ac9dbb685bb6098c131bb',
	'0x49530967afe4e9db8bdf75ac4b459cad7b1a30d4fdc5efb25656fdb7c79efec0',
	'0x561d2c22917907fd799aab16241e1bc280f6b5dcc3a2ea29a0d26ffd0ed9d329',
	'0x5c482a08499bd31d1b6d92be0e6493ae705d6b6f147492d991a5a82fa374be59',
	'0x6ae6e259021e0d7e9cd1548bd0545ca19c227262347e92101d7651b7515ad654',
	'0x6be3e8a118daedba4b6645bbea71b033c4c973b4b50b3c5c43d43dc68c7dc0ef',
	'0x6c7920d0469c978ceec2ea63f1ba650c64a56fe7efaebace7595634a2d3a14c3',
	'0x6eb575f05a370ef8bd65059ae61239346a9a60899a6de0e41ad21695291b99be',
	'0x70c2e89868838a875ce46c8518255c978bb6d4e33eb41aa94b7b3446bf687765',
	'0x756efafd6752ca65b2790d972a763e256bd1442f1b8fe288a36524364ad2ae21',
	'0x7e566f2138ad3234f54a9f109eb5a4d476153fb48e46b481fc130446ed40ca76',
	'0x84191475a52665246ecf29f10005e9db8daefa66689c254946c9cbd2269e79d2',
	'0x9237ca749d2829bd85125d0d83b2cc93e3b9047ba65b6d2e8e0e509422d1ca79',
	'0xba4c4b38630fae5e4664f7ea2b05e5fdb34f6bc1fb9332b1797867a9320cb331',
	'0xc00ae8d79b9e163df64d24e3cb24e9f694336e1fb95f1597ca9c2bd8d029157c',
	'0xc2dbfefc5eed8e0b91f9e42c6bcab8d13df0148250247d2ab07b11a6060fd8b7',
	'0xd6ed2025b97c6a414db5f3dcbbb1918dc125d68d38a6d82090eedbfaedfb1df7',
	'0xea04e6f89591c85e8c9d7b0891da8311d33be7b04524e5d0ebe323bc81d2e1c0',
	'0xebaa6872d82193f669afbe803fd4f6ff415355ccf462f54b634537865fb7c530',
	'0xf75941100f3dd71ae307858b8ac91fc49a35d8bb762cf9cc0ea5397231c96a03'
]);

export function verifyEip1167Proxy(bytecode: string, chainId: number): { impl: string; standard: ContractStandard } | null {
	if (!bytecode || bytecode === '0x') return null;

	const len = (bytecode.length - 2) / 2;
	if (len !== 45) return null;

	const prefix = bytecode.slice(0, 22);
	const suffix = bytecode.slice(bytecode.length - 30);

	if (prefix.toLowerCase() !== EIP1167_PREFIX.toLowerCase()) return null;
	if (suffix.toLowerCase() !== EIP1167_SUFFIX.toLowerCase()) return null;

	const implAddr = '0x' + bytecode.slice(22, 62);

	const erc721Allowed = ERC721TL_IMPLEMENTATIONS[chainId];
	const erc1155Allowed = ERC1155TL_IMPLEMENTATIONS[chainId];

	if (!erc721Allowed && !erc1155Allowed) return null;

	const implLower = implAddr.toLowerCase();

	if (erc721Allowed) {
		const match = erc721Allowed.find((a) => a.toLowerCase() === implLower);
		if (match) return { impl: implAddr, standard: 'erc721' };
	}

	if (erc1155Allowed) {
		const match = erc1155Allowed.find((a) => a.toLowerCase() === implLower);
		if (match) return { impl: implAddr, standard: 'erc1155' };
	}

	return null;
}