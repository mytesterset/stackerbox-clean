<script lang="ts">
	import { useTlContracts } from './discovery';
	import type { TlContract } from './discovery';
	import { mintWallet } from './mint-wallet.svelte';
	import tlLogo from '$lib/assets/transientlabs_logo.png';
	import manifoldLogo from '$lib/assets/manifold_logo-only_black_transparentbg.svg';

	type Phase = 'loading' | 'error' | 'empty' | 'list' | 'selected';

	let { onSelect }: { onSelect: (contract: TlContract) => void } = $props();

	let phase = $state<Phase>('loading');
	let contracts = $state<TlContract[]>([]);
	let errorMsg = $state('');
	let selectedAddr = $state('');
	let loadId = 0;

	const walletAddress = $derived(mintWallet.address);
	const provider = $derived(mintWallet.provider);

	$effect(() => {
		if (walletAddress && provider) {
			const id = ++loadId;
			loadContracts(id);
		}
	});

	async function loadContracts(id: number) {
		if (!walletAddress || !provider) return;
		phase = 'loading';
		errorMsg = '';
		contracts = [];

		try {
			const result = await useTlContracts(walletAddress, provider);
			if (id !== loadId) return;
			contracts = result;
			phase = result.length === 0 ? 'empty' : 'list';
		} catch (e) {
			if (id !== loadId) return;
			errorMsg = e instanceof Error ? e.message : 'Failed to discover contracts';
			phase = 'error';
		}
	}

	function handleSelect(contract: TlContract) {
		selectedAddr = contract.address;
		phase = 'selected';
		onSelect(contract);
	}
</script>

<div class="contract-picker">
	{#if phase === 'loading'}
		<div class="picker-state">
			<span class="picker-spinner"></span>
			Discovering your contracts...
		</div>
	{:else if phase === 'error'}
		<div class="picker-state picker-error">
			{errorMsg}
			<button class="picker-retry" onclick={() => loadContracts(++loadId)}>Retry</button>
		</div>
	{:else if phase === 'empty'}
		<div class="picker-state">
			No contracts found for this wallet.
			<span class="picker-note">Note: only contracts deployed directly via an EOA transaction are discoverable (multisig/Safe deployments are not detected).</span>
			<span class="picker-note">Also ensure <code>.env</code> has a valid <code>ETHERSCAN_API_KEY</code> (free at etherscan.io/apis).</span>
			<button class="picker-retry" onclick={() => loadContracts(++loadId)}>Retry</button>
		</div>
	{:else if phase === 'list'}
		<div class="picker-list">
			{#each contracts as contract}
				<button class="picker-item" class:picker-item-selected={selectedAddr === contract.address} onclick={() => handleSelect(contract)}>
					<span class="picker-item-name">{contract.name || 'Unnamed'}</span>
					<span class="picker-item-symbol">{contract.symbol || '???'}</span>
					<span class="picker-item-standard" class:standard-erc1155={contract.standard === 'erc1155'}>{contract.standard === 'erc1155' ? 'Edition' : '1/1'}</span>
					<img class="picker-item-logo" src={contract.kind === 'tl' ? tlLogo : manifoldLogo} alt={contract.kind === 'tl' ? 'Transient Labs' : 'Manifold'} />
					<span class="picker-item-addr">{contract.address.slice(0, 6)}…{contract.address.slice(-4)}</span>
				</button>
			{/each}
		</div>
	{:else if phase === 'selected'}
		<div class="picker-selected">
			{#each contracts as contract}
				{#if contract.address === selectedAddr}
					<span class="picker-selected-name">{contract.name || 'Unnamed'} ({contract.symbol || '???'})</span>
					<span class="picker-selected-standard">{contract.standard === 'erc1155' ? 'Edition' : '1/1'}</span>
					<span class="picker-selected-addr">{contract.address}</span>
				{/if}
			{/each}
			<button class="picker-change" onclick={() => { phase = 'list'; }}>Change</button>
		</div>
	{/if}
</div>

<style>
	.contract-picker {
		width: 100%;
	}
	.picker-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-6) var(--space-4);
		font-size: 14px;
		color: var(--color-text-muted);
		text-align: center;
	}
	.picker-error {
		color: var(--color-danger);
	}
	.picker-note {
		font-size: 12px;
		opacity: 0.8;
		max-width: 280px;
		line-height: 1.5;
	}
	.picker-spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--color-border);
		border-top-color: var(--color-accent);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	.picker-retry {
		padding: var(--space-2) var(--space-4);
		font-size: 13px;
		color: var(--color-accent);
		border: 1px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: transparent;
	}
	.picker-retry:hover {
		background: var(--color-bg);
	}
	.picker-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		max-height: 240px;
		overflow-y: auto;
	}
	.picker-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-3) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		font-size: 13px;
		text-align: left;
	}
	.picker-item:hover {
		background: var(--color-bg);
	}
	.picker-item-selected {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
	}
	.picker-item-name {
		font-weight: 500;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.picker-item-symbol {
		color: var(--color-text-muted);
		font-family: monospace;
		font-size: 12px;
	}
	.picker-item-standard {
		font-size: 10px;
		font-weight: 600;
		padding: 1px 6px;
		border-radius: 3px;
		background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		color: var(--color-accent);
		flex-shrink: 0;
	}
	.picker-item-standard.standard-erc1155 {
		background: color-mix(in srgb, #7c3aed 15%, transparent);
		color: #7c3aed;
	}
	.picker-item-logo {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}
	.picker-item-addr {
		color: var(--color-text-muted);
		font-family: monospace;
		font-size: 11px;
	}
	.picker-selected {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: var(--space-3);
		border: 1px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
	}
	.picker-selected-name {
		font-size: 14px;
		font-weight: 500;
	}
	.picker-selected-standard {
		font-size: 11px;
		font-weight: 600;
		color: var(--color-accent);
	}
	.picker-selected-addr {
		font-size: 11px;
		color: var(--color-text-muted);
		font-family: monospace;
		word-break: break-all;
	}
	.picker-change {
		margin-top: var(--space-1);
		padding: var(--space-1) 0;
		font-size: 12px;
		color: var(--color-accent);
		background: none;
		border: none;
		text-align: left;
	}
	.picker-change:hover {
		text-decoration: underline;
	}
</style>