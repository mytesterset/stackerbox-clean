// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface SolanaPublicKey {
		toString(): string;
		toBytes?(): Uint8Array;
	}

	interface SolanaWallet {
		isPhantom?: boolean;
		isConnected: boolean;
		publicKey: SolanaPublicKey | null;
		connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: SolanaPublicKey }>;
		disconnect(): Promise<void>;
		signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
		signTransaction<T>(transaction: T): Promise<T>;
		on(event: string, callback: (arg: unknown) => void): void;
		off(event: string, callback: (arg: unknown) => void): void;
	}

	interface EthereumProvider {
		isMetaMask?: boolean;
		selectedAddress: string | null;
		chainId: string;
		request(args: { method: string; params?: unknown[] }): Promise<unknown>;
		on(event: string, callback: (...args: unknown[]) => void): void;
		removeListener(event: string, callback: (...args: unknown[]) => void): void;
	}

	interface Window {
		solana?: SolanaWallet;
		ethereum?: EthereumProvider;
	}
}

export {};