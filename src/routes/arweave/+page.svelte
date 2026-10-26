<script lang="ts">
	import { galleryStore } from '$lib/stores/arweave-gallery.svelte';
	import { walletStore } from '$lib/arweave/wallet.svelte';
	import { gatewayUrls, arweaveUrl, fetchTurboBalance } from '$lib/arweave/turbo';
	import type { TurboBalance } from '$lib/arweave/turbo';
	import { goto } from '$app/navigation';

	let loaded = $state(false);
	let thumbUrls = $state<Map<string, string>>(new Map());
	let balance = $state<TurboBalance | null>(null);
	let balanceLoading = $state(false);
	let balanceError = $state('');

	$effect(() => {
		galleryStore.load().then(() => (loaded = true));
	});

	$effect(() => {
		const urls = new Map<string, string>();
		for (const item of galleryStore.items) {
			urls.set(item.txId, URL.createObjectURL(item.thumbnail));
		}
		thumbUrls = urls;
		return () => {
			for (const url of urls.values()) URL.revokeObjectURL(url);
		};
	});

	$effect(() => {
		if (walletStore.isConnected && walletStore.chain) {
			loadBalance();
		} else {
			balance = null;
			balanceError = '';
		}
	});

	async function loadBalance() {
		const c = walletStore.chain;
		if (!c) return;

		balanceLoading = true;
		balanceError = '';
		try {
			balance = await fetchTurboBalance(c);
			if (!balance) balanceError = 'Could not fetch balance';
		} catch {
			balanceError = 'Could not fetch balance';
		} finally {
			balanceLoading = false;
		}
	}

	function formatBytes(bytes: number): string {
		if (bytes <= 0) return '0 B';
		if (bytes < 1024) return `${bytes.toFixed(0)} B`;
		if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
		return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
	}

	function formatWinc(winc: string): string {
		const n = BigInt(winc);
		if (n < 1_000_000n) return `${n} winc`;
		return `${(Number(n) / 1_000_000).toFixed(2)}M winc`;
	}

	async function handleRemove(txId: string) {
		await galleryStore.removeItem(txId);
	}

	function handleDownloadCSV() {
		const rows = galleryStore.items.map((item) => {
			const date = new Date(item.uploadedAt).toISOString();
			const arUrl = arweaveUrl(item.txId);
			const gwUrl = gatewayUrls(item.txId)[0];
			const name = item.name.replace(/"/g, '""');
			return `"${name}","${item.mime}","${arUrl}","${gwUrl}","${date}"`;
		});

		const header = 'name,mime,ar_tx,gateway_url,uploaded_at';
		const csv = [header, ...rows].join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `stackerbox-arweave-tx-${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function formatDate(ts: number): string {
		const d = new Date(ts);
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="gallery-page">
	<div class="gallery-topbar">
		<button class="topbar-btn" onclick={() => goto('/editor')}>Back to editor</button>
		<span class="topbar-title">Arweave Gallery</span>
		<div class="topbar-right">
			{#if walletStore.isConnected}
				{#if balanceLoading}
					<span class="topbar-balance">Loading credits…</span>
				{:else if balance}
					<span class="topbar-balance" title={`${balance.effectiveBalance} winc`}>
						{formatBytes(balance.bytesRemaining)} available · {formatWinc(balance.effectiveBalance)}
					</span>
				{:else if balanceError}
					<span class="topbar-balance topbar-balance-error">{balanceError}</span>
				{/if}
				<button class="topbar-btn" onclick={loadBalance} disabled={balanceLoading}>Refresh</button>
			{/if}
			<span class="topbar-wallet">
				{#if walletStore.address}
					{walletStore.address.slice(0, 6)}…
				{/if}
			</span>
		</div>
	</div>

	<div class="gallery-content">
		{#if !loaded}
			<p class="gallery-empty">Loading…</p>
		{:else if galleryStore.items.length === 0}
			<p class="gallery-empty">Nothing uploaded yet. Upload layers or artwork in the editor to see them here.</p>
		{:else}
			<div class="gallery-actions">
				{#if walletStore.isConnected}
					<button class="gallery-action-btn" onclick={loadBalance} disabled={balanceLoading}>
						Load balance
					</button>
				{/if}
				<button class="gallery-action-btn" onclick={handleDownloadCSV}>
					Download CSV
				</button>
			</div>
			<div class="gallery-grid">
				{#each galleryStore.items as item (item.txId)}
					<div class="gallery-item">
						<div class="gallery-thumb">
							{#if item.isArtwork}
								<span class="gallery-thumb-text">Art Work</span>
							{:else}
								<img src={thumbUrls.get(item.txId) ?? ''} alt={item.name} />
							{/if}
						</div>
						<div class="gallery-info">
							<span class="gallery-name" title={item.name}>{item.name}</span>
							<span class="gallery-meta">
								{formatDate(item.uploadedAt)}
								{item.isArtwork ? ' · Artwork' : ''}
							</span>
							<span class="gallery-meta gallery-mime">{item.mime}</span>
							<a
								class="gallery-link"
								href={gatewayUrls(item.txId)[0]}
								target="_blank"
								rel="noreferrer"
							>
								{arweaveUrl(item.txId)}
							</a>
						</div>
						<button class="gallery-remove" onclick={() => handleRemove(item.txId)} aria-label="Remove {item.name}">
							Remove
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.gallery-page {
		min-height: 100vh;
		background: var(--color-bg);
		display: flex;
		flex-direction: column;
	}
	.gallery-topbar {
		height: var(--topbar-height);
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: 0 var(--space-4);
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.topbar-btn {
		padding: var(--space-2) var(--space-3);
		font-size: 13px;
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}
	.topbar-btn:hover {
		background: var(--color-bg);
	}
	.topbar-title {
		font-weight: 600;
		font-size: 15px;
	}
	.topbar-right {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex: 1;
		justify-content: flex-end;
	}
	.topbar-balance {
		font-size: 12px;
		color: var(--color-text-muted);
		font-family: monospace;
	}
	.topbar-balance-error {
		color: var(--color-danger);
	}
	.topbar-wallet {
		font-size: 12px;
		color: var(--color-text-muted);
		font-family: monospace;
	}
	.gallery-content {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-6);
	}
	.gallery-empty {
		text-align: center;
		color: var(--color-text-muted);
		font-size: 14px;
		padding: var(--space-12) var(--space-4);
	}
	.gallery-actions {
		max-width: 640px;
		margin: 0 auto var(--space-4);
		display: flex;
		gap: var(--space-2);
	}
	.gallery-action-btn {
		padding: var(--space-2) var(--space-4);
		font-size: 13px;
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
	}
	.gallery-action-btn:hover:not(:disabled) {
		background: var(--color-bg);
		color: var(--color-accent);
		border-color: var(--color-accent);
	}
	.gallery-action-btn:disabled {
		opacity: 0.5;
	}
	.gallery-grid {
		max-width: 640px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.gallery-item {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-4);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
	}
	.gallery-thumb {
		width: 64px;
		height: 64px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--color-bg);
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.gallery-thumb img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.gallery-thumb-text {
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-muted);
		text-align: center;
		line-height: 1.2;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.gallery-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.gallery-name {
		font-size: 14px;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.gallery-meta {
		font-size: 11px;
		color: var(--color-text-muted);
	}
	.gallery-mime {
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.gallery-link {
		font-size: 12px;
		color: var(--color-accent);
		text-decoration: none;
		font-family: monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.gallery-link:hover {
		text-decoration: underline;
	}
	.gallery-remove {
		padding: var(--space-1) var(--space-3);
		font-size: 12px;
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}
	.gallery-remove:hover {
		border-color: var(--color-danger);
		color: var(--color-danger);
	}
</style>