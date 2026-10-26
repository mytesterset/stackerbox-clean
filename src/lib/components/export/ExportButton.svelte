<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { generateExport } from './generate-export';

	let exporting = $state(false);
	let exportError = $state('');
	let exportSuccess = $state(false);

	async function handleExport() {
		exporting = true;
		exportError = '';
		exportSuccess = false;

		try {
			const plain = projectStore.getPlainProject();
			const result = await generateExport(plain);

			if (result.success && result.blob) {
				const slug = sanitizeFilename(plain.name) || 'stackerbox-export';
				const url = URL.createObjectURL(result.blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `${slug}.zip`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				exportSuccess = true;
			} else {
				exportError = result.error || 'Export failed';
			}
		} catch (e) {
			exportError = e instanceof Error ? e.message : 'Unknown export error';
		} finally {
			exporting = false;
		}
	}

	function sanitizeFilename(name: string): string {
		return name
			.replace(/[\\/:*?"<>|]+/g, '-')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 80);
	}
</script>

<div class="export-wrapper">
	<button
		class="export-btn"
		onclick={handleExport}
		disabled={exporting || projectStore.project.layers.length === 0}
	>
		{#if exporting}
			Exporting...
		{:else}
			Export as zip
		{/if}
	</button>

	{#if exportError}
		<span class="export-error">{exportError}</span>
	{/if}

	{#if exportSuccess}
		<span class="export-success">Download started</span>
	{/if}
</div>

<style>
	.export-wrapper {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.export-btn {
		padding: var(--space-2) var(--space-4);
		background: var(--color-accent);
		color: white;
		border-radius: var(--radius-sm);
		font-size: 14px;
		font-weight: 500;
		white-space: nowrap;
	}
	.export-btn:hover:not(:disabled) {
		background: var(--color-accent-hover);
	}
	.export-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.export-error {
		font-size: 11px;
		color: var(--color-danger);
	}
	.export-success {
		font-size: 11px;
		color: #16a34a;
	}
</style>