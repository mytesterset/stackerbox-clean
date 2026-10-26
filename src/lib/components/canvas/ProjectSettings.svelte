<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { CANVAS_PRESETS, CANVAS_MIN, CANVAS_MAX } from '$lib/types';
	import { handleFileUpload } from './upload-layer';

	let { onClose }: { onClose: () => void } = $props();

	let widthInput = $state(projectStore.project.settings.width);
	let heightInput = $state(projectStore.project.settings.height);
	let error = $state('');

	function validate(value: number): string {
		if (value < CANVAS_MIN || value > CANVAS_MAX) {
			return `Must be between ${CANVAS_MIN} and ${CANVAS_MAX}`;
		}
		return '';
	}

	function apply() {
		const wErr = validate(widthInput);
		const hErr = validate(heightInput);
		if (wErr || hErr) {
			error = wErr || hErr;
			return;
		}
		projectStore.updateSettings({ width: widthInput, height: heightInput });
		onClose();
	}

	function setPreset(width: number, height: number) {
		widthInput = width;
		heightInput = height;
		error = '';
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
</script>

<div
	class="settings-overlay"
	ondragover={handleDragOver}
	ondrop={handleDrop}
	role="dialog"
	aria-label="Canvas settings"
	tabindex="-1"
>
	<div class="settings-card">
		<h2 class="settings-title">New project</h2>
		<p class="settings-desc">Choose a canvas size for your composition</p>

		<div class="presets">
			{#each CANVAS_PRESETS as preset}
				<button
					class="preset-btn"
					class:active={widthInput === preset.width && heightInput === preset.height}
					onclick={() => setPreset(preset.width, preset.height)}
				>
					{preset.label}
				</button>
			{/each}
		</div>

		<div class="size-inputs">
			<label class="input-label">
				Width
				<input
					type="number"
					bind:value={widthInput}
					min={CANVAS_MIN}
					max={CANVAS_MAX}
					class="size-input"
					oninput={() => (error = '')}
				/>
			</label>
			<span class="size-sep">×</span>
			<label class="input-label">
				Height
				<input
					type="number"
					bind:value={heightInput}
					min={CANVAS_MIN}
					max={CANVAS_MAX}
					class="size-input"
					oninput={() => (error = '')}
				/>
			</label>
			<span class="size-unit">px</span>
		</div>

		{#if error}
			<p class="error-text">{error}</p>
		{/if}

		<div class="size-info">
			Min: {CANVAS_MIN}px, Max: {CANVAS_MAX}px
		</div>

		<div class="settings-actions">
			<button class="btn btn-primary" onclick={apply}> Apply </button>
		</div>
	</div>
</div>

<style>
	.settings-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.1);
		z-index: 10;
	}
	.settings-card {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		padding: var(--space-8);
		box-shadow: var(--shadow-lg);
		width: 380px;
		max-width: 90vw;
	}
	.settings-title {
		font-size: 20px;
		font-weight: 600;
		margin-bottom: var(--space-1);
	}
	.settings-desc {
		color: var(--color-text-muted);
		font-size: 14px;
		margin-bottom: var(--space-6);
	}
	.presets {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
		margin-bottom: var(--space-5);
	}
	.preset-btn {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.preset-btn:hover {
		background: var(--color-bg);
	}
	.preset-btn.active {
		border-color: var(--color-accent);
		color: var(--color-accent);
		background: #eff6ff;
	}
	.size-inputs {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-2);
	}
	.input-label {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: 12px;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.size-input {
		width: 110px;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 18px;
		font-variant-numeric: tabular-nums;
	}
	.size-input:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
	}
	.size-sep {
		font-size: 20px;
		color: var(--color-text-muted);
		margin-top: 16px;
	}
	.size-unit {
		font-size: 14px;
		color: var(--color-text-muted);
		margin-top: 16px;
	}
	.error-text {
		color: var(--color-danger);
		font-size: 13px;
		margin-bottom: var(--space-2);
	}
	.size-info {
		font-size: 12px;
		color: var(--color-text-muted);
		margin-bottom: var(--space-5);
	}
	.settings-actions {
		display: flex;
		justify-content: flex-end;
	}
	.btn {
		padding: var(--space-2) var(--space-5);
		border-radius: var(--radius-sm);
		font-size: 14px;
		font-weight: 500;
	}
	.btn-primary {
		background: var(--color-accent);
		color: white;
	}
	.btn-primary:hover {
		background: var(--color-accent-hover);
	}
</style>