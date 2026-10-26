<script lang="ts">
	import { mintState } from './mint-state.svelte';
	import { walletStore } from '../arweave/wallet.svelte';
	import { mintWallet } from './mint-wallet.svelte';
	import { uploadPreviewImage, uploadMetadataJson, computeSha256, preparePreview, validatePreviewFile } from './mint-upload';
	import { buildMetadataJson } from './build-metadata';

	let previewDataUrl = $state('');
	let internalError = $state('');

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const fileError = validatePreviewFile(file);
		if (fileError) {
			internalError = fileError;
			input.value = '';
			return;
		}
		internalError = '';
		mintState.previewFile = file;
		const reader = new FileReader();
		reader.onload = () => { previewDataUrl = reader.result as string; };
		reader.readAsDataURL(file);
	}

	function removePreview() {
		mintState.previewFile = null;
		previewDataUrl = '';
	}

	async function handleUpload() {
		const chain = walletStore.chain;
		if (!chain) {
			internalError = 'Wallet not connected. Please connect a wallet in the Arweave upload section first.';
			return;
		}

		mintState.isUploading = true;
		mintState.uploadProgress = 'Uploading preview image...';
		internalError = '';

		try {
			const previewFile = mintState.previewFile;
			if (!previewFile) throw new Error('Preview image is required');
			if (!mintState.workTxId) throw new Error('Work TX ID is required');

			const preview = await preparePreview(previewFile);
			const [previewTxId, previewSha256] = await Promise.all([
				uploadPreviewImage(preview, chain),
				computeSha256(preview.bytes)
			]);
			mintState.previewTxId = previewTxId;

			mintState.uploadProgress = 'Uploading metadata...';
			const tags = mintState.tags.split(',').map((t) => t.trim()).filter(Boolean);

			const metadataJson = buildMetadataJson({
				title: mintState.title,
				description: mintState.description,
				previewTxId,
				workTxId: mintState.workTxId,
				year: mintState.year,
				tags,
				previewMimeType: preview.mime,
				workMimeType: 'text/html',
				contractAddress: mintState.selectedContract?.address,
				previewSha256,
				previewBytes: preview.bytes.byteLength
			});

			const metadataTxId = await uploadMetadataJson(metadataJson, chain);
			mintState.metadataTxId = metadataTxId;
			mintState.uri = `https://arweave.net/${metadataTxId}`;
			mintState.uploadProgress = '';

			if (chain === 'ethereum') {
				const switched = await mintWallet.ensureMainnet();
				if (!switched) {
					internalError = mintWallet.error || 'Failed to switch to Ethereum mainnet.';
					return;
				}
			}

			mintState.step = 'review';
		} catch (e) {
			internalError = e instanceof Error ? e.message : 'Upload failed';
		} finally {
			mintState.isUploading = false;
		}
	}

	function goBack() {
		mintState.step = 'discovery';
	}
</script>

<div class="metadata-form">
	<h3 class="step-title">Metadata</h3>

	<div class="form-field">
		<label class="form-label" for="mint-title">Title *</label>
		<input
			id="mint-title"
			class="form-input"
			type="text"
			maxlength="200"
			bind:value={mintState.title}
			placeholder="Artwork title"
		/>
		{#if mintState.title.length > 0}
			<span class="form-hint">{mintState.title.length}/200</span>
		{/if}
	</div>

	<div class="form-field">
		<label class="form-label" for="mint-year">Year *</label>
		<input
			id="mint-year"
			class="form-input form-input-short"
			type="text"
			maxlength="4"
			bind:value={mintState.year}
			placeholder="2024"
		/>
	</div>

	<div class="form-field">
		<label class="form-label" for="mint-desc">Description</label>
		<textarea
			id="mint-desc"
			class="form-textarea"
			maxlength="2000"
			bind:value={mintState.description}
			placeholder="Describe your artwork..."
			rows="3"
		></textarea>
		{#if mintState.description.length > 0}
			<span class="form-hint">{mintState.description.length}/2000</span>
		{/if}
	</div>

	<div class="form-field">
		<label class="form-label" for="mint-tags">Tags</label>
		<input
			id="mint-tags"
			class="form-input"
			type="text"
			bind:value={mintState.tags}
			placeholder="tag1, tag2, tag3"
		/>
	</div>

	{#if mintState.selectedContract?.standard === 'erc1155'}
		<div class="form-field">
			<label class="form-label" for="mint-editions">Aantal edities *</label>
			<input
				id="mint-editions"
				class="form-input form-input-short"
				type="number"
				min="1"
				bind:value={mintState.editionAmount}
				placeholder="1"
			/>
		</div>
	{/if}

	<div class="form-field">
		<label class="form-label">Preview image *</label>
		{#if previewDataUrl}
			<div class="preview-thumb-wrap">
				<img class="preview-thumb" src={previewDataUrl} alt="Preview thumbnail" />
				<button class="preview-remove" onclick={removePreview}>&times;</button>
			</div>
		{:else}
			<label class="file-input-label">
				<input
					type="file"
					accept="image/jpeg,image/png,image/gif,image/webp"
					onchange={handleFileChange}
					hidden
				/>
				<span class="file-input-btn">Choose image</span>
			</label>
		{/if}
	</div>

	<div class="form-field">
		<label class="form-label">Work</label>
		<div class="work-badge">
			<span class="work-badge-label">Arweave TX:</span>
			<span class="work-badge-id">{mintState.workTxId}</span>
		</div>
	</div>

	{#if internalError}
		<div class="form-error">{internalError}</div>
	{/if}

	{#if mintState.isUploading}
		<div class="form-uploading">
			<span class="picker-spinner"></span>
			{mintState.uploadProgress}
		</div>
	{/if}

	<div class="form-actions">
		<button class="form-btn form-btn-back" onclick={goBack}>Back</button>
		<button
			class="form-btn form-btn-primary"
			onclick={handleUpload}
			disabled={!mintState.isFormValid || mintState.isUploading || !walletStore.isConnected}
		>
			Upload & Review
		</button>
	</div>

	{#if !walletStore.isConnected}
		<div class="form-note">
			Arweave upload requires a connected wallet. Use the "Upload to Arweave" button in the menu first.
		</div>
	{/if}
</div>

<style>
	.metadata-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.step-title {
		font-size: 15px;
		font-weight: 600;
		margin: 0;
	}
	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.form-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-muted);
	}
	.form-input {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 14px;
		background: var(--color-bg);
		color: var(--color-text);
	}
	.form-input:focus {
		outline: none;
		border-color: var(--color-accent);
	}
	.form-input-short {
		max-width: 100px;
	}
	.form-textarea {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 14px;
		background: var(--color-bg);
		color: var(--color-text);
		resize: vertical;
		font-family: inherit;
	}
	.form-textarea:focus {
		outline: none;
		border-color: var(--color-accent);
	}
	.form-hint {
		font-size: 11px;
		color: var(--color-text-muted);
		text-align: right;
	}
	.file-input-label {
		cursor: pointer;
	}
	.file-input-btn {
		display: inline-block;
		padding: var(--space-2) var(--space-4);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.file-input-btn:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.preview-thumb-wrap {
		position: relative;
		display: inline-block;
	}
	.preview-thumb {
		max-width: 120px;
		max-height: 120px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		object-fit: contain;
	}
	.preview-remove {
		position: absolute;
		top: -8px;
		right: -8px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--color-danger);
		color: white;
		font-size: 14px;
		line-height: 1;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.work-badge {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 12px;
	}
	.work-badge-label {
		color: var(--color-text-muted);
	}
	.work-badge-id {
		font-family: monospace;
		color: var(--color-accent);
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
	.form-error {
		padding: var(--space-2) var(--space-3);
		font-size: 12px;
		color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		border-radius: var(--radius-sm);
	}
	.form-uploading {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.form-note {
		font-size: 12px;
		color: var(--color-text-muted);
		text-align: center;
	}
	.picker-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--color-border);
		border-top-color: var(--color-accent);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>