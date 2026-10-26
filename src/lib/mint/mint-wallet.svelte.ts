import { BrowserProvider } from 'ethers';
import type { Signer } from 'ethers';

let address = $state<string | null>(null);
let provider = $state<BrowserProvider | null>(null);
let signer = $state<Signer | null>(null);
let chainId = $state<bigint | null>(null);
let isConnecting = $state(false);
let error = $state<string | null>(null);
let walletName = $state<string | null>(null);

let _accountsChangedBound = false;
let _onAccountsChanged: ((...args: unknown[]) => void) | null = null;
let _onChainChanged: ((...args: unknown[]) => void) | null = null;

function getEth(): EthereumProvider | null {
	if (typeof window === 'undefined') return null;
	return window.ethereum ?? null;
}

function bindAccountsChanged(eth: EthereumProvider) {
	if (_accountsChangedBound) return;
	_accountsChangedBound = true;
	_onAccountsChanged = async (...args: unknown[]) => {
		const accounts = args as string[];
		if (accounts.length === 0) {
			reset();
			return;
		}
		const newAddr = accounts[0];
		if (newAddr === address) return;
		address = newAddr;
		if (provider) {
			try {
				const s = await provider.getSigner();
				if (address === newAddr) signer = s;
			} catch {
				reset();
			}
		}
	};
	_onChainChanged = async () => {
		try {
			const eth = getEth();
			if (!eth) { reset(); return; }
			const id = await eth.request({ method: 'eth_chainId' }) as string;
			chainId = BigInt(id);
		} catch {
			reset();
		}
	};
	eth.on('accountsChanged', _onAccountsChanged);
	eth.on('chainChanged', _onChainChanged);
}

function unbind(eth: EthereumProvider) {
	if (_onAccountsChanged) eth.removeListener('accountsChanged', _onAccountsChanged);
	if (_onChainChanged) eth.removeListener('chainChanged', _onChainChanged);
	_onAccountsChanged = null;
	_onChainChanged = null;
	_accountsChangedBound = false;
}

function reset() {
	address = null;
	provider = null;
	signer = null;
	chainId = null;
	walletName = null;
}

export const mintWallet = {
	get address() { return address; },
	get provider() { return provider; },
	get signer() { return signer; },
	get chainId() { return chainId; },
	get isConnecting() { return isConnecting; },
	get error() { return error; },
	get walletName() { return walletName; },
	get isConnected() { return address !== null; },
	get isOnMainnet() { return chainId === 1n; },

	hasWallet(): boolean {
		const eth = getEth();
		return eth !== null && eth.isMetaMask === true;
	},

	async connect(): Promise<boolean> {
		const eth = getEth();
		if (!eth) {
			error = 'No Ethereum wallet found. Please install MetaMask.';
			return false;
		}

		if (eth.isMetaMask === false) {
			error = 'This wallet is not MetaMask. For security, only MetaMask is supported.';
			return false;
		}

		isConnecting = true;
		error = null;

		try {
			const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[];
			if (accounts.length === 0) {
				error = 'No accounts returned from wallet.';
				return false;
			}

			address = accounts[0];
			walletName = 'MetaMask';

			const currentChainId = await eth.request({ method: 'eth_chainId' }) as string;
			const numericChainId = BigInt(currentChainId);

			if (numericChainId !== 1n) {
				try {
					await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] });
				} catch {
					try {
						await eth.request({
							method: 'wallet_addEthereumChain',
							params: [{
								chainId: '0x1',
								chainName: 'Ethereum Mainnet',
								rpcUrls: ['https://ethereum-rpc.publicnode.com'],
								nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
								blockExplorerUrls: ['https://etherscan.io']
							}]
						});
					} catch {
						error = 'Please switch to Ethereum mainnet to mint.';
						return false;
					}
				}

				const switchedChainId = await eth.request({ method: 'eth_chainId' }) as string;
				if (BigInt(switchedChainId) !== 1n) {
					error = 'Wallet must be on Ethereum mainnet (chainId 1) to mint.';
					return false;
				}
			}

			chainId = 1n;
			const bp = new BrowserProvider(eth, 'any');
			provider = bp;
			signer = await bp.getSigner();
			bindAccountsChanged(eth);

			return true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to connect wallet';
			return false;
		} finally {
			isConnecting = false;
		}
	},

	disconnect() {
		const eth = getEth();
		if (eth) unbind(eth);
		reset();
	},

	async ensureMainnet(): Promise<boolean> {
		if (chainId === 1n) return true;

		const eth = getEth();
		if (!eth) {
			error = 'No wallet connected';
			return false;
		}

		try {
			await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] });
			const switchedChainId = await eth.request({ method: 'eth_chainId' }) as string;
			if (BigInt(switchedChainId) !== 1n) {
				error = 'Please switch your wallet to Ethereum mainnet to mint.';
				return false;
			}
			chainId = BigInt(switchedChainId);
			error = null;
			return true;
		} catch {
			error = 'Please switch your wallet to Ethereum mainnet to mint.';
			return false;
		}
	}
};