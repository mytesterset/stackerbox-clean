<script lang="ts">
	import { mintState, resetMintState } from './mint-state.svelte';
	import { mintWallet } from './mint-wallet.svelte';
	import ContractPicker from './ContractPicker.svelte';
	import MetadataForm from './MetadataForm.svelte';
	import MintConfirmation from './MintConfirmation.svelte';
	import type { TlContract } from './discovery';

	let { workTxId, onClose }: { workTxId: string | null; onClose: () => void } = $props();

	$effect(() => {
		if (workTxId) {
			mintState.workTxId = workTxId;
		}
	});

	function handleClose() {
		resetMintState();
		onClose();
	}

	async function handleConnect() {
		await mintWallet.connect();
	}

	function handleContractSelected(contract: TlContract) {
		mintState.selectedContract = contract;
		mintState.step = 'metadata';
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="wizard-backdrop" onclick={handleClose} onkeydown={(e) => e.key === 'Escape' && handleClose()} role="dialog" aria-label="Mint to Transient Labs" tabindex="0">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="wizard-panel" onclick={(e) => e.stopPropagation()} role="document">
		<div class="wizard-header">
			<h2 class="wizard-title">Mint to Transient Labs</h2>
			<button class="wizard-close" onclick={handleClose} aria-label="Close">&times;</button>
		</div>

		<div class="wizard-body">
			{#if mintState.step === 'discovery'}
				<div class="wizard-step">
					<h3 class="step-title">Select Contract</h3>

					{#if mintWallet.isConnected}
						<div class="wizard-wallet-info">
							<span>{mintWallet.address?.slice(0, 6)}…{mintWallet.address?.slice(-4)}</span>
							<span class="wizard-chain">Ethereum Mainnet</span>
						</div>
						<ContractPicker onSelect={handleContractSelected} />
					{:else if mintWallet.hasWallet()}
						<p class="step-desc">Connect your MetaMask wallet on Ethereum mainnet to discover your contracts.</p>
						<button class="connect-btn" onclick={handleConnect} disabled={mintWallet.isConnecting}>
							{#if mintWallet.isConnecting}Connecting...{:else}Connect MetaMask{/if}
						</button>
						{#if mintWallet.error}
							<p class="step-error">{mintWallet.error}</p>
						{/if}
					{:else}
						<p class="step-error">No MetaMask wallet detected. Please install MetaMask to continue.</p>
					{/if}

					{#if !mintState.workTxId}
						<p class="step-note">Upload your artwork to Arweave first (via the menu) to get a work TX ID.</p>
					{/if}
				</div>

			{:else if mintState.step === 'metadata'}
				<MetadataForm />

			{:else if mintState.step === 'review' && mintState.selectedContract}
				<MintConfirmation contract={mintState.selectedContract} />

			{:else if mintState.step === 'minting'}
				<div class="wizard-step wizard-step-center">
					<span class="wizard-spinner"></span>
					<p class="step-desc">Confirm the transaction in your wallet...</p>
				</div>

			{:else if mintState.step === 'success'}
				<div class="wizard-step">
					<h3 class="step-title step-title-success">Minted</h3>
					<div class="success-details">
						<div class="success-row">
							<span class="success-label">Token ID</span>
							<span class="success-value">#{mintState.mintTokenId?.toString()}</span>
						</div>
						<div class="success-row">
							<span class="success-label">Transaction</span>
							<a class="success-link" href={`https://etherscan.io/tx/${mintState.mintTxHash}`} target="_blank" rel="noreferrer">
								{mintState.mintTxHash?.slice(0, 10)}…{mintState.mintTxHash?.slice(-8)}
							</a>
						</div>
						<div class="success-row">
							<span class="success-label">Metadata</span>
							<span class="success-value success-mono">{mintState.uri}</span>
							{#if mintState.metadataTxId}
								<a class="success-link" href={`https://arweave.net/${mintState.metadataTxId}`} target="_blank" rel="noreferrer">arweave.net</a>
							{/if}
						</div>
						{#if mintState.previewTxId}
							<div class="success-row">
								<span class="success-label">Preview image</span>
								<span class="success-value success-mono">ar://{mintState.previewTxId}</span>
								<a class="success-link" href={`https://arweave.net/${mintState.previewTxId}`} target="_blank" rel="noreferrer">arweave.net</a>
							</div>
						{/if}
						{#if mintState.workTxId}
							<div class="success-row">
								<span class="success-label">Work</span>
								<span class="success-value success-mono">ar://{mintState.workTxId}</span>
								<a class="success-link" href={`https://arweave.net/${mintState.workTxId}`} target="_blank" rel="noreferrer">arweave.net</a>
							</div>
						{/if}
					</div>
					<button class="connect-btn" onclick={handleClose}>Done</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.wizard-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.wizard-panel {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		width: min(440px, 92vw);
		max-height: 84vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.wizard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.wizard-title {
		font-size: 15px;
		font-weight: 600;
		margin: 0;
	}
	.wizard-close {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		font-size: 18px;
		color: var(--color-text-muted);
		border: none;
		background: none;
	}
	.wizard-close:hover {
		background: var(--color-bg);
	}
	.wizard-body {
		padding: var(--space-5);
		overflow-y: auto;
		flex: 1;
	}
	.wizard-step {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.wizard-step-center {
		align-items: center;
		padding: var(--space-6) 0;
	}
	.step-title {
		font-size: 15px;
		font-weight: 600;
		margin: 0;
	}
	.step-title-success {
		color: #16a34a;
	}
	.step-desc {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0;
		line-height: 1.5;
	}
	.step-error {
		font-size: 12px;
		color: var(--color-danger);
		margin: 0;
	}
	.step-note {
		font-size: 12px;
		color: var(--color-text-muted);
		margin: 0;
		font-style: italic;
	}
	.wizard-wallet-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 12px;
		color: var(--color-text-muted);
		padding: var(--space-2) 0;
	}
	.wizard-chain {
		font-family: monospace;
		font-size: 11px;
		color: var(--color-accent);
	}
	.connect-btn {
		padding: var(--space-3) var(--space-6);
		background: var(--color-accent);
		color: white;
		border: none;
		border-radius: var(--radius-sm);
		font-size: 14px;
		font-weight: 500;
		align-self: flex-start;
	}
	.connect-btn:hover:not(:disabled) {
		background: var(--color-accent-hover);
	}
	.connect-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.wizard-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-border);
		border-top-color: var(--color-accent);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	.success-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.success-row {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.success-label {
		font-size: 11px;
		color: var(--color-text-muted);
		font-weight: 500;
	}
	.success-value {
		font-size: 14px;
	}
	.success-mono {
		font-family: monospace;
		font-size: 12px;
		word-break: break-all;
		color: var(--color-accent);
	}
	.success-link {
		font-size: 13px;
		color: var(--color-accent);
		font-family: monospace;
		text-decoration: none;
	}
	.success-link:hover {
		text-decoration: underline;
	}
</style>