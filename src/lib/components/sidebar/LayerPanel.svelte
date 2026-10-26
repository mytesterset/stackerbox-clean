<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { galleryStore } from '$lib/stores/arweave-gallery.svelte';
	import LayerItem from './LayerItem.svelte';
	import { handleFileUpload, loadArweaveLayer } from '../canvas/upload-layer';

	let { onToggleCollapse, onOpenDraw, onEditDraw }: { onToggleCollapse: () => void; onOpenDraw?: () => void; onEditDraw?: (layerId: string) => void } = $props();
	let draggingIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let showAddMenu = $state(false);
	let showArweavePicker = $state(false);
	let pickerLoading = $state<string | null>(null);
	let thumbUrls = $state<Map<string, string>>(new Map());

	const layers = $derived(
		[...projectStore.project.layers].sort((a, b) => b.order - a.order)
	);

	const arweaveItems = $derived(
		galleryStore.items.filter((i) => !i.isArtwork)
	);

	$effect(() => {
		const urls = new Map<string, string>();
		for (const item of arweaveItems) {
			urls.set(item.txId, URL.createObjectURL(item.thumbnail));
		}
		thumbUrls = urls;
		return () => {
			for (const url of urls.values()) URL.revokeObjectURL(url);
		};
	});

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			handleFileUpload(input.files);
			input.value = '';
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFileUpload(files);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	function handleLayerDragStart(index: number) {
		draggingIndex = index;
	}

	function handleLayerDragOver(index: number) {
		dragOverIndex = index;
	}

	function handleLayerDrop() {
		if (draggingIndex !== null && dragOverIndex !== null && draggingIndex !== dragOverIndex) {
			const fromIndex = projectStore.project.layers.length - 1 - draggingIndex;
			const toIndex = projectStore.project.layers.length - 1 - dragOverIndex;
			projectStore.reorderLayers(fromIndex, toIndex);
		}
		draggingIndex = null;
		dragOverIndex = null;
	}

	function openArweavePicker() {
		showAddMenu = false;
		galleryStore.load();
		showArweavePicker = true;
	}

	async function handleUseLayer(txId: string, name: string, mime: string, contentHash?: string) {
		pickerLoading = txId;
		try {
			await loadArweaveLayer(txId, name, mime, contentHash);
			showArweavePicker = false;
		} catch {
			// silently ignore fetch failures
		} finally {
			pickerLoading = null;
		}
	}

	function closeMenus() {
		showAddMenu = false;
		showArweavePicker = false;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" class:active={showAddMenu || showArweavePicker} onclick={closeMenus} onkeydown={(e) => e.key === 'Escape' && closeMenus()}></div>

<div class="sidebar" ondragover={handleDragOver} ondrop={handleDrop} role="region" aria-label="Layers panel">
	<div class="sidebar-header">
		<h2 class="sidebar-title">Layers</h2>
		<button class="collapse-btn" onclick={onToggleCollapse} aria-label="Hide sidebar">
			◀
		</button>
	</div>

	<div class="layer-list">
		{#each layers as layer, index (layer.id)}
			<div
				class="layer-drag-zone"
				class:dragging={draggingIndex === index}
				class:drag-over={dragOverIndex === index}
				draggable="true"
				role="listitem"
				ondragstart={() => handleLayerDragStart(index)}
				ondragover={(e: DragEvent) => {
					e.preventDefault();
					handleLayerDragOver(index);
				}}
				ondrop={handleLayerDrop}
				ondragend={handleLayerDrop}
			>
				<LayerItem data={layer} index={index} onEditDraw={onEditDraw} />
			</div>
		{:else}
			<p class="no-layers">No layers yet. Drop files here.</p>
		{/each}
	</div>

	<div class="sidebar-footer">
		<div class="add-menu-wrapper">
			<button class="upload-btn" onclick={() => (showAddMenu = !showAddMenu)}>
				+ Add layer
			</button>
			{#if showAddMenu}
				<div class="add-menu-dropdown">
					<label class="add-menu-item">
						Upload local file
						<input
							type="file"
							accept=".png,.jpg,.jpeg,.webp,.svg,.html"
							multiple
							class="file-input"
							onchange={(e) => { handleFileInput(e); showAddMenu = false; }}
						/>
					</label>
					<button class="add-menu-item" onclick={openArweavePicker}>
						Use Arweave layers
					</button>
				</div>
			{/if}
		</div>
		<button class="draw-btn" onclick={() => onOpenDraw?.()}>Draw</button>
	</div>
</div>

{#if showArweavePicker}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="picker-backdrop" onclick={() => (showArweavePicker = false)} onkeydown={(e) => e.key === 'Escape' && (showArweavePicker = false)} role="dialog" aria-label="Arweave layer picker" tabindex="0">
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div class="picker-panel" onclick={(e) => e.stopPropagation()} role="document">
			<div class="picker-header">
				<h3>Use Arweave layers</h3>
				<button class="picker-close" onclick={() => (showArweavePicker = false)} aria-label="Close">&times;</button>
			</div>
			<div class="picker-body">
				{#if arweaveItems.length === 0}
					<p class="picker-empty">No layers uploaded yet.</p>
				{:else}
					{#each arweaveItems as item (item.txId)}
						<div class="picker-item">
							<div class="picker-thumb">
								<img src={thumbUrls.get(item.txId) ?? ''} alt={item.name} />
							</div>
							<span class="picker-name">{item.name}</span>
							<button
								class="picker-use-btn"
								onclick={() => handleUseLayer(item.txId, item.name, item.mime, item.contentHash)}
								disabled={pickerLoading === item.txId}
							>
								{#if pickerLoading === item.txId}
									Loading…
								{:else}
									Use
								{/if}
							</button>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		display: none;
	}
	.overlay.active {
		display: block;
		position: fixed;
		inset: 0;
		z-index: 50;
		background: transparent;
	}

	.sidebar {
		width: var(--sidebar-width);
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}
	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}
	.sidebar-title {
		font-size: 14px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.collapse-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.collapse-btn:hover {
		background: var(--color-bg);
	}
	.layer-list {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-3);
		min-height: 0;
	}
	.no-layers {
		color: var(--color-text-muted);
		font-size: 13px;
		text-align: center;
		padding: var(--space-8) var(--space-4);
	}
	.layer-drag-zone {
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-1);
	}
	.layer-drag-zone.dragging {
		opacity: 0.5;
	}
	.layer-drag-zone.drag-over {
		box-shadow: 0 2px 0 0 var(--color-accent);
	}
	.sidebar-footer {
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--color-border);
	}
	.add-menu-wrapper {
		position: relative;
	}
	.upload-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: var(--space-3);
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-md);
		font-size: 13px;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: border-color 0.15s;
		background: none;
		font-family: inherit;
	}
	.upload-btn:hover {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
	.add-menu-dropdown {
		position: absolute;
		bottom: calc(100% + 4px);
		left: 0;
		right: 0;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
		z-index: 60;
		overflow: hidden;
	}
	.add-menu-item {
		display: flex;
		align-items: center;
		width: 100%;
		padding: var(--space-3) var(--space-4);
		font-size: 13px;
		color: var(--color-text);
		cursor: pointer;
		border: none;
		background: none;
		font-family: inherit;
		text-align: left;
	}
	.add-menu-item:hover {
		background: var(--color-bg);
	}
	.file-input {
		display: none;
	}
	.draw-btn {
		width: 100%;
		margin-top: var(--space-2);
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.draw-btn:hover {
		border-color: var(--color-accent);
		background: var(--color-bg);
	}

	.picker-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(0, 0, 0, 0.35);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.picker-panel {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		width: min(400px, 90vw);
		max-height: 60vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.picker-header h3 {
		font-size: 14px;
		font-weight: 600;
	}
	.picker-close {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		font-size: 18px;
		color: var(--color-text-muted);
	}
	.picker-close:hover {
		background: var(--color-bg);
	}
	.picker-body {
		overflow-y: auto;
		flex: 1;
		padding: var(--space-3) var(--space-4);
	}
	.picker-empty {
		text-align: center;
		color: var(--color-text-muted);
		font-size: 13px;
		padding: var(--space-6) 0;
	}
	.picker-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		margin-bottom: var(--space-2);
	}
	.picker-thumb {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--color-bg);
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.picker-thumb img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.picker-name {
		flex: 1;
		font-size: 13px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.picker-use-btn {
		padding: var(--space-1) var(--space-3);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-accent);
		border: 1px solid var(--color-accent);
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		flex-shrink: 0;
	}
	.picker-use-btn:hover:not(:disabled) {
		background: var(--color-accent);
		color: white;
	}
	.picker-use-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>