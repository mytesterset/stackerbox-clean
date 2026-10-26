export type Chain = 'solana' | 'ethereum';

let address = $state<string | null>(null);
let chain = $state<Chain | null>(null);
let connecting = $state(false);
let error = $state('');
let walletName = $state<string | null>(null);

let _accountsChangedBound = false;
let _onAccountsChanged: ((...args: unknown[]) => void) | null = null;
let _onChainChanged: (() => void) | null = null;

function bindAccountsChanged(provider: EthereumProvider) {
	if (_accountsChangedBound) return;
	_accountsChangedBound = true;
	_onAccountsChanged = (...args: unknown[]) => {
		const accounts = args as string[];
		if (accounts.length === 0) {
			address = null;
			chain = null;
			walletName = null;
		} else if (accounts[0] !== address) {
			address = accounts[0];
		}
	};
	_onChainChanged = () => {
		chain = 'ethereum';
	};
	provider.on('accountsChanged', _onAccountsChanged);
	provider.on('chainChanged', _onChainChanged);
}

function getSolana(): SolanaWallet | null {
	if (typeof window === 'undefined') return null;
	return window.solana ?? null;
}

function getEth(): EthereumProvider | null {
	if (typeof window === 'undefined') return null;
	return window.ethereum ?? null;
}

export const walletStore = {
	get address(): string | null {
		return address;
	},

	get chain(): Chain | null {
		return chain;
	},

	get connecting(): boolean {
		return connecting;
	},

	get error(): string {
		return error;
	},

	get isConnected(): boolean {
		return address !== null;
	},

	get walletName(): string | null {
		return walletName;
	},

	getWallet(): SolanaWallet | null {
		return getSolana();
	},

	getEthProvider(): EthereumProvider | null {
		return getEth();
	},

	hasWallets(): { solana: boolean; ethereum: boolean } {
		const sol = getSolana();
		const eth = getEth();
		return {
			solana: sol !== null && sol.isPhantom === true,
			ethereum: eth !== null && eth.isMetaMask === true
		};
	},

	async connectSolana(): Promise<boolean> {
		const wallet = getSolana();
		if (!wallet) {
			error = 'No Solana wallet found. Please install Phantom.';
			return false;
		}

		if (wallet.isPhantom !== true) {
			error = 'This wallet is not Phantom. For security, only Phantom is supported for Solana.';
			return false;
		}

		connecting = true;
		error = '';

		try {
			await wallet.connect();
			if (wallet.publicKey) {
				address = wallet.publicKey.toString();
				chain = 'solana';
				walletName = 'Phantom';
				return true;
			}
			error = 'Wallet connected but returned no public key.';
			return false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to connect wallet';
			return false;
		} finally {
			connecting = false;
		}
	},

	async connectEthereum(): Promise<boolean> {
		const provider = getEth();
		if (!provider) {
			error = 'No Ethereum wallet found. Please install MetaMask.';
			return false;
		}

		if (provider.isMetaMask !== true) {
			error = 'This wallet is not MetaMask. For security, only MetaMask is supported for Ethereum.';
			return false;
		}

		connecting = true;
		error = '';

		try {
			const accounts = (await provider.request({
				method: 'eth_requestAccounts'
			})) as string[];

			if (accounts.length > 0) {
				address = accounts[0];
				chain = 'ethereum';
				walletName = 'MetaMask';
				bindAccountsChanged(provider);
				return true;
			}
			error = 'No accounts returned from wallet.';
			return false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to connect wallet';
			return false;
		} finally {
			connecting = false;
		}
	},

	async disconnect() {
		const sol = getSolana();
		try { await sol?.disconnect(); } catch { /* ignore */ }

		const eth = getEth();
		if (eth && _accountsChangedBound) {
			if (_onAccountsChanged) eth.removeListener('accountsChanged', _onAccountsChanged);
			if (_onChainChanged) eth.removeListener('chainChanged', _onChainChanged);
		}
		_onAccountsChanged = null;
		_onChainChanged = null;
		address = null;
		chain = null;
		walletName = null;
		_accountsChangedBound = false;
	}
};