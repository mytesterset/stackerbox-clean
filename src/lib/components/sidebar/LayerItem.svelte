<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { resolveRemoteLayer } from '$lib/arweave/turbo';
	import type { LayerData } from '$lib/types';

	let { data, index, onEditDraw }: { data: LayerData; index: number; onEditDraw?: (layerId: string) => void } = $props();

	let editing = $state(false);
	let thumbUrl = $state<string>('');
	let _thumbLoadingId = $state<string | null>(null);

	$effect(() => {
		if (data.objectUrl) {
			thumbUrl = data.objectUrl;
			return;
		}
		if (!data.arTxId || thumbUrl || _thumbLoadingId === data.id) return;

		_thumbLoadingId = data.id;
		resolveRemoteLayer(data.arTxId, data.contentHash, data.type).then(({ blob }) => {
			const url = URL.createObjectURL(blob);
			thumbUrl = url;
			projectStore.updateLayer(data.id, { objectUrl: url, blob });
		}).catch(() => {}).finally(() => {
			if (_thumbLoadingId === data.id) _thumbLoadingId = null;
		});
	});

	function toggleVisibility() {
		projectStore.updateLayer(data.id, { visible: !data.visible });
	}

	let editName = $state('');

	function startEdit() {
		editName = data.name;
		editing = true;
	}

	function commitEdit() {
		projectStore.updateLayer(data.id, { name: editName || 'Layer ' + (index + 1) });
		editing = false;
	}

	function cancelEdit() {
		editing = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') commitEdit();
		if (e.key === 'Escape') cancelEdit();
	}

	function removeLayer() {
		projectStore.removeLayer(data.id);
	}

	function updateOpacity(e: Event) {
		const target = e.target as HTMLInputElement;
		projectStore.updateLayer(data.id, { opacity: parseInt(target.value) });
	}

	function updateWidth(e: Event) {
		const target = e.target as HTMLInputElement;
		const v = parseInt(target.value);
		if (isNaN(v) || v <= 0) return;
		if (data.lockRatio) {
			const ratio = data.height / data.width;
			projectStore.updateLayer(data.id, {
				width: v,
				height: Math.max(1, Math.round(v * ratio))
			});
		} else {
			projectStore.updateLayer(data.id, { width: v });
		}
	}

	function updateHeight(e: Event) {
		const target = e.target as HTMLInputElement;
		const v = parseInt(target.value);
		if (isNaN(v) || v <= 0) return;
		if (data.lockRatio) {
			const ratio = data.width / data.height;
			projectStore.updateLayer(data.id, {
				width: Math.max(1, Math.round(v * ratio)),
				height: v
			});
		} else {
			projectStore.updateLayer(data.id, { height: v });
		}
	}

	function toggleLockRatio() {
		projectStore.updateLayer(data.id, { lockRatio: !data.lockRatio });
	}

	const typeLabel = $derived(
		data.type === 'svg' ? 'SVG' : data.type === 'html' ? 'HTML' : data.type.toUpperCase()
	);
</script>

<div
	class="layer-item"
	class:selected={projectStore.selectedLayerId === data.id}
	onclick={() => projectStore.selectLayer(data.id)}
	onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') projectStore.selectLayer(data.id); }}
	role="button"
	aria-label="Layer {data.name}"
	tabindex="0"
>
	<div class="layer-thumb">
		{#if data.type === 'html'}
			<span class="thumb-placeholder">HTML</span>
		{:else if thumbUrl}
			<img src={thumbUrl} alt={data.name} draggable="false" />
		{/if}
	</div>

	<div class="layer-info">
		{#if editing}
			<input
				class="name-input"
				type="text"
				bind:value={editName}
				onblur={commitEdit}
				onkeydown={handleKeydown}
			/>
		{:else}
			<span class="layer-name" role="button" tabindex="0" ondblclick={startEdit} onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') startEdit(); }}>{data.name}</span>
		{/if}
		<span class="layer-type">{typeLabel}</span>

		<div class="layer-controls">
			<button
				class="icon-btn"
				class:off={!data.visible}
				onclick={toggleVisibility}
				aria-label={data.visible ? 'Hide layer' : 'Show layer'}
			>
				{#if data.visible}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
				{:else}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
				{/if}
			</button>
			{#if data.type === 'png' && data.objectUrl && onEditDraw}
				<button
					class="icon-btn"
					onclick={() => onEditDraw(data.id)}
					aria-label="Edit drawing"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
				</button>
			{/if}
			<button
				class="icon-btn danger"
				onclick={removeLayer}
				aria-label="Delete layer"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
			</button>
		</div>

		<div class="opacity-row">
			<span class="opacity-label">{data.opacity}%</span>
			<input
				type="range"
				min="0"
				max="100"
				value={data.opacity}
				oninput={updateOpacity}
				class="opacity-slider"
			/>
		</div>
		<div class="size-row">
			<button
				class="lock-btn"
				class:locked={data.lockRatio}
				onclick={toggleLockRatio}
				title={data.lockRatio ? 'Ratio locked' : 'Ratio unlocked'}
				aria-label={data.lockRatio ? 'Ratio locked' : 'Ratio unlocked'}
			>
				{#if data.lockRatio}
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
				{:else}
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
				{/if}
			</button>
			<input
				type="number"
				class="size-input"
				value={data.width}
				oninput={updateWidth}
				aria-label="Width"
			/>
			<span class="size-sep">×</span>
			<input
				type="number"
				class="size-input"
				value={data.height}
				oninput={updateHeight}
				aria-label="Height"
			/>
		</div>
	</div>
</div>

<style>
	.layer-item {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-3);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: background 0.1s;
	}
	.layer-item:hover {
		background: var(--color-bg);
	}
	.layer-item.selected {
		background: #eff6ff;
	}
	.layer-thumb {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--color-bg);
		flex-shrink: 0;
	}
	.layer-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.thumb-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: 600;
		color: var(--color-text-muted);
	}
	.layer-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.layer-name {
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		user-select: none;
	}
	.name-input {
		font-size: 13px;
		font-weight: 500;
		border: 1px solid var(--color-accent);
		border-radius: var(--radius-sm);
		padding: 1px var(--space-1);
		outline: none;
		width: 100%;
	}
	.layer-type {
		font-size: 11px;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.layer-controls {
		display: flex;
		gap: var(--space-1);
		margin-top: 2px;
	}
	.icon-btn {
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
	}
	.icon-btn:hover {
		background: var(--color-border);
	}
	.icon-btn.off {
		opacity: 0.4;
	}
	.icon-btn.danger:hover {
		color: var(--color-danger);
		background: #fef2f2;
	}
	.opacity-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-1);
	}
	.opacity-label {
		font-size: 11px;
		color: var(--color-text-muted);
		min-width: 32px;
		font-variant-numeric: tabular-nums;
	}
	.opacity-slider {
		flex: 1;
		height: 4px;
		-webkit-appearance: none;
		appearance: none;
		background: var(--color-border);
		border-radius: 2px;
		outline: none;
	}
	.opacity-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-accent);
		cursor: pointer;
	}
	.size-row {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		margin-top: var(--space-1);
	}
	.lock-btn {
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.lock-btn:hover {
		background: var(--color-border);
	}
	.lock-btn.locked {
		color: var(--color-accent);
	}
	.size-input {
		width: 56px;
		padding: 2px var(--space-1);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
		text-align: center;
	}
	.size-input:focus {
		outline: none;
		border-color: var(--color-accent);
	}
	.size-sep {
		font-size: 10px;
		color: var(--color-text-muted);
	}
</style>