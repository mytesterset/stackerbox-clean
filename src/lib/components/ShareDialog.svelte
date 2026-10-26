<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { walletStore } from '$lib/arweave/wallet.svelte';
	import { createClient, uploadComposition } from '$lib/arweave/turbo';
	import { generateSharedCompositionJson } from '$lib/arweave/generate-arweave-html';

	let { onClose }: { onClose: () => void } = $props();

	let sharing = $state(false);
	let shareTxId = $state('');
	let shareHash = $state('');
	let message = $state('');
	let shareUrl = $derived(shareTxId ? `${location.origin}/editor#${shareTxId}:${shareHash}` : '');

	const layersWithTx = $derived(
		projectStore.project.layers.filter((l) => l.arTxId && l.visible)
	);

	async function handleShare() {
		const c = walletStore.chain;
		if (!c) { message = 'Connect wallet first'; return; }

		const refs = layersWithTx.map((l) => ({ layer: l, txId: l.arTxId! }));
		if (refs.length === 0) { message = 'No Arweave layers to share'; return; }

		sharing = true;
		message = '';
		try {
			const client = await createClient(c);
			const json = generateSharedCompositionJson({
				name: projectStore.project.name,
				settings: projectStore.project.settings,
				layers: refs,
				htmlMeta: projectStore.project.htmlMeta
			});
			const result = await uploadComposition(client, json, c);
			shareTxId = result.txId;
			shareHash = result.hash;
		} catch (e) {
			message = e instanceof Error ? e.message : 'Failed to share';
		} finally {
			sharing = false;
		}
	}

	function copyLink() {
		navigator.clipboard.writeText(shareUrl).catch(() => {});
	}
</script>

<div class="overlay" onclick={onClose} role="presentation">
	<div class="card" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Share composition">
		<div class="header">
			<h2>Share composition</h2>
			<button class="close" onclick={onClose} aria-label="Close">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>
		</div>

		{#if layersWithTx.length === 0}
			<p class="empty">No Arweave layers in this project. Upload layers to Arweave or add them from the Arweave Gallery first.</p>
		{:else if !walletStore.address}
			<p class="empty">Connect your wallet to share this composition.</p>
		{:else if shareTxId}
			<div class="field">
				<span class="label">Share link</span>
				<div class="link-row">
					<input type="text" class="input" value={shareUrl} readonly />
					<button class="btn btn-primary" onclick={copyLink}>Copy</button>
				</div>
			</div>
			<p class="hint">Send this link to anyone. They can open it and continue working on the composition using layers already on Arweave.</p>
		{:else}
			<p class="info">{layersWithTx.length} layer{layersWithTx.length !== 1 ? 's' : ''} with Arweave references ready to share.</p>
			<div class="actions">
				<button class="btn btn-secondary" onclick={onClose}>Cancel</button>
				<button class="btn btn-primary" onclick={handleShare} disabled={sharing}>
					{sharing ? 'Sharing...' : 'Share to Arweave'}
				</button>
			</div>
		{/if}

		{#if message}
			<p class="error">{message}</p>
		{/if}
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.card {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		padding: var(--space-8);
		box-shadow: var(--shadow-lg);
		width: 440px;
		max-width: 90vw;
	}
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-4);
	}
	.header h2 {
		font-size: 18px;
		font-weight: 600;
		margin: 0;
	}
	.close {
		padding: var(--space-1);
		color: var(--color-text-muted);
		border-radius: var(--radius-sm);
	}
	.close:hover {
		background: var(--color-bg);
		color: var(--color-text);
	}
	.empty {
		color: var(--color-text-muted);
		font-size: 14px;
		line-height: 1.6;
	}
	.info {
		font-size: 14px;
		margin-bottom: var(--space-4);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.label {
		font-size: 12px;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.link-row {
		display: flex;
		gap: var(--space-2);
	}
	.input {
		flex: 1;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 13px;
		font-family: monospace;
		color: var(--color-text);
		background: var(--color-bg);
	}
	.hint {
		font-size: 12px;
		color: var(--color-text-muted);
		margin-top: var(--space-3);
		line-height: 1.5;
	}
	.error {
		font-size: 13px;
		color: var(--color-danger);
		margin-top: var(--space-3);
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
	}
	.btn {
		padding: var(--space-2) var(--space-5);
		border-radius: var(--radius-sm);
		font-size: 14px;
		font-weight: 500;
		white-space: nowrap;
	}
	.btn-primary {
		background: var(--color-accent);
		color: white;
	}
	.btn-primary:hover:not(:disabled) {
		background: var(--color-accent-hover);
	}
	.btn-primary:disabled {
		opacity: 0.5;
	}
	.btn-secondary {
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}
	.btn-secondary:hover {
		background: var(--color-bg);
	}
</style>