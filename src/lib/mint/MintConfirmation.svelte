<script lang="ts">
	import type { TlContract } from './discovery';
	import { mintState } from './mint-state.svelte';
	import { mintWallet } from './mint-wallet.svelte';
	import { mintToTlCollection } from './mint';
	import { Contract, isAddress } from 'ethers';
	import { ERC721TL_ABI, MANIFOLD_ABI } from './abi';
	import tlLogo from '$lib/assets/transientlabs_logo.png';
	import manifoldLogo from '$lib/assets/manifold_logo-only_black_transparentbg.svg';

	let { contract }: { contract: TlContract } = $props();

	let isCheckingRole = $state(false);
	let roleError = $state('');
	let mintError = $state('');
	let isMinting = $state(false);
	let showRoyaltyForm = $state(false);
	let royaltyAddr = $state('');
	let royaltyPct = $state('');
	let basisValue = $state(0n);

	const isTl = $derived(contract.kind === 'tl');
	const isErc1155 = $derived(contract.standard === 'erc1155');

	$effect(() => {
		checkRole();
		loadBasis();
	});

	async function checkRole() {
		const signer = mintWallet.signer;
		const address = mintWallet.address;
		if (!signer || !address) return;
		if (!isMainnet) return;

		isCheckingRole = true;
		roleError = '';

		try {
			const abi = isTl ? ERC721TL_ABI : MANIFOLD_ABI;
			const c = new Contract(contract.address, abi, signer);

			if (isTl) {
				let isAdmin = false;
				try {
					const adminRole = await c.ADMIN_ROLE();
					isAdmin = await c.hasRole(adminRole, address);
				} catch {
					/* ADMIN_ROLE not exposed — fall through to owner check */
				}

				if (!isAdmin) {
					const ownerAddr = await c.owner();
					if (ownerAddr.toLowerCase() !== address.toLowerCase()) {
						roleError = 'You are no longer an admin of this contract.';
					}
				}
			} else {
				const isAdmin = await c.isAdmin(address);

				if (!isAdmin) {
					const ownerAddr = await c.owner();
					if (ownerAddr.toLowerCase() !== address.toLowerCase()) {
						roleError = 'You are no longer an admin of this contract.';
					}
				}
			}
		} catch (e) {
			roleError = e instanceof Error ? e.message : 'Failed to verify admin role';
		} finally {
			isCheckingRole = false;
		}
	}

	async function loadBasis() {
		if (!isTl) return;
		const signer = mintWallet.signer;
		if (!signer) return;
		try {
			const c = new Contract(contract.address, ERC721TL_ABI, signer);
			basisValue = await c.BASIS();
		} catch { /* ignore */ }
	}

	function toggleRoyalty() {
		showRoyaltyForm = !showRoyaltyForm;
	}

	async function handleMint() {
		const signer = mintWallet.signer;
		const address = mintWallet.address;
		if (!signer || !address || !mintState.metadataTxId || !isMainnet) return;

		isMinting = true;
		mintError = '';
		mintState.step = 'minting';

		try {
			let royalty: { address: string; percent: number } | undefined;
			const pctEmpty = royaltyPct === '' || royaltyPct === null || royaltyPct === undefined;
			if (showRoyaltyForm && royaltyAddr && !pctEmpty) {
				const percent = parseInt(royaltyPct, 10);
				if (isNaN(percent) || percent < 0) {
					throw new Error('Invalid royalty percentage');
				}
				royalty = { address: royaltyAddr, percent };
			}

			const result = await mintToTlCollection({
				signer,
				contractAddress: contract.address,
				kind: contract.kind,
				standard: contract.standard,
				recipient: address,
				metadataTxId: mintState.metadataTxId,
				royalty,
				amount: isErc1155 ? (parseEditionAmount() ?? undefined) : undefined
			});

			mintState.mintTxHash = result.txHash;
			mintState.mintTokenId = result.tokenId;
			mintState.step = 'success';
		} catch (e) {
			mintError = e instanceof Error ? e.message : 'Mint failed';
			mintState.step = 'review';
		} finally {
			isMinting = false;
		}
	}

	function goBack() {
		mintState.step = 'metadata';
	}

	const isMainnet = $derived(mintWallet.chainId === 1n);

	const royaltyValidation = $derived.by(() => {
		if (!showRoyaltyForm) return null;
		const pctEmpty = royaltyPct === '' || royaltyPct === null || royaltyPct === undefined;
		if (!royaltyAddr || pctEmpty) return 'Fill in both royalty fields';
		if (!isAddress(royaltyAddr)) return 'Invalid royalty address';
		const pct = parseInt(royaltyPct, 10);
		if (isNaN(pct) || pct < 0 || !Number.isInteger(Number(royaltyPct))) return 'Royalty must be a non-negative integer';
		if (basisValue > 0n && BigInt(pct) > basisValue) return `Royalty exceeds BASIS (${basisValue.toString()})`;
		return null;
	});

	const canMint = $derived(!isMinting && !isCheckingRole && !roleError && isMainnet && royaltyValidation === null
		&& (!isErc1155 || parseEditionAmount() !== null));

	function parseEditionAmount(): bigint | null {
		if (!isErc1155) return null;
		const val = mintState.editionAmount;
		if (val === '' || val === null || val === undefined) return null;
		const n = parseInt(val, 10);
		if (isNaN(n) || n < 1 || !Number.isInteger(n)) return null;
		return BigInt(n);
	}
</script>

<div class="confirmation">
	<h3 class="step-title">Review & Confirm</h3>

	{#if isCheckingRole}
		<div class="conf-checking">Verifying admin role...</div>
	{:else if roleError}
		<div class="conf-error">{roleError}</div>
	{:else}
		<div class="conf-details">
			<div class="conf-row">
				<span class="conf-label">Contract</span>
				<span class="conf-value">
					<img class="conf-logo" src={isTl ? tlLogo : manifoldLogo} alt={isTl ? 'Transient Labs' : 'Manifold'} />
					{contract.name || 'Unnamed'} ({contract.symbol || '???'})
				</span>
				<span class="conf-addr">{contract.address}</span>
			</div>

			<div class="conf-row">
				<span class="conf-label">Title</span>
				<span class="conf-value">{mintState.title || '(empty)'}</span>
			</div>

			{#if mintState.description}
				<div class="conf-row">
					<span class="conf-label">Description</span>
					<span class="conf-value conf-desc">{mintState.description}</span>
				</div>
			{/if}

			{#if mintState.year}
				<div class="conf-row">
					<span class="conf-label">Year</span>
					<span class="conf-value">{mintState.year}</span>
				</div>
			{/if}

			<div class="conf-row">
				<span class="conf-label">Preview image</span>
				<span class="conf-value conf-mono">https://arweave.net/{mintState.previewTxId}</span>
			</div>

			<div class="conf-row">
				<span class="conf-label">Work</span>
				<span class="conf-value conf-mono">https://arweave.net/{mintState.workTxId}</span>
			</div>

			<div class="conf-row">
				<span class="conf-label">Recipient</span>
				<span class="conf-value conf-mono">{mintWallet.address}</span>
			</div>

			<div class="conf-row">
				<span class="conf-label">Metadata URI</span>
				<span class="conf-value conf-mono">{mintState.uri}</span>
			</div>

			<div class="conf-row">
				<span class="conf-label">Network</span>
				<span class="conf-value">{isMainnet ? 'Ethereum Mainnet' : 'Wrong network'}</span>
			</div>

			{#if !isMainnet}
				<div class="conf-error">Wallet must be on Ethereum mainnet to mint.</div>
			{/if}

			{#if isTl}
			<label class="conf-royalty-toggle">
				<input type="checkbox" checked={showRoyaltyForm} onchange={toggleRoyalty} />
				Set custom royalty per token
			</label>
			{/if}

			{#if showRoyaltyForm}
				<div class="royalty-form">
					<div class="form-field">
						<label class="form-label">Royalty Address</label>
						<input class="form-input" type="text" bind:value={royaltyAddr} placeholder="0x..." />
					</div>
					<div class="form-field">
						<label class="form-label">Royalty (basis points, max {basisValue.toString()})</label>
						<input class="form-input form-input-short" type="number" bind:value={royaltyPct} placeholder="0" min="0" />
					</div>
					{#if royaltyValidation}
						<div class="conf-error">{royaltyValidation}</div>
					{/if}
				</div>
			{/if}
		</div>

		{#if isErc1155}
			<div class="conf-row">
				<span class="conf-label">Aantal edities</span>
				<span class="conf-value">{mintState.editionAmount || '1'}</span>
			</div>
		{/if}

		{#if mintError}
			<div class="conf-error">{mintError}</div>
		{/if}

		<div class="form-actions">
			<button class="form-btn form-btn-back" onclick={goBack} disabled={isMinting}>Back</button>
			<button
				class="form-btn form-btn-primary"
				onclick={handleMint}
				disabled={!canMint}
			>
				{#if isMinting}
					Confirm in wallet...
				{:else}
					Mint
				{/if}
			</button>
		</div>
	{/if}
</div>

<style>
	.confirmation {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.step-title {
		font-size: 15px;
		font-weight: 600;
		margin: 0;
	}
	.conf-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.conf-row {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.conf-label {
		font-size: 11px;
		color: var(--color-text-muted);
		font-weight: 500;
	}
	.conf-value {
		font-size: 14px;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.conf-desc {
		font-size: 13px;
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.conf-logo {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}
	.conf-mono {
		font-family: monospace;
		font-size: 12px;
		word-break: break-all;
		color: var(--color-accent);
	}
	.conf-addr {
		font-size: 11px;
		color: var(--color-text-muted);
		font-family: monospace;
	}
	.conf-error {
		padding: var(--space-2) var(--space-3);
		font-size: 12px;
		color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		border-radius: var(--radius-sm);
	}
	.conf-royalty-toggle {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 13px;
		color: var(--color-text-muted);
		cursor: pointer;
		margin-top: var(--space-1);
	}
	.royalty-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
	}
	.royalty-form .form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.royalty-form .form-label {
		font-size: 11px;
		color: var(--color-text-muted);
	}
	.royalty-form .form-input {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 13px;
		background: var(--color-surface);
		color: var(--color-text);
	}
	.royalty-form .form-input:focus {
		outline: none;
		border-color: var(--color-accent);
	}
	.royalty-form .form-input-short {
		max-width: 100px;
	}
	.form-actions {
		display: flex;
		justify-content: space-between;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}
	.form-btn {
		padding: var(--space-2) var(--space-5);
		border-radius: var(--radius-sm);
		font-size: 14px;
		font-weight: 500;
	}
	.form-btn-primary {
		background: var(--color-accent);
		color: white;
		border: none;
	}
	.form-btn-primary:hover:not(:disabled) {
		background: var(--color-accent-hover);
	}
	.form-btn-primary:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.form-btn-back {
		background: transparent;
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
	}
	.form-btn-back:hover {
		background: var(--color-bg);
	}
	.conf-checking {
		font-size: 13px;
		color: var(--color-text-muted);
	}
</style>