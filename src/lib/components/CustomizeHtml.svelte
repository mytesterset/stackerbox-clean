<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';

	let { onClose }: { onClose: () => void } = $props();

	let artist = projectStore.project.htmlMeta.artist;
	let description = projectStore.project.htmlMeta.description;
	let year = projectStore.project.htmlMeta.year;

	function apply() {
		projectStore.updateHtmlMeta({ artist, description, year });
		onClose();
	}
</script>

<div class="overlay" onclick={onClose} role="presentation">
	<div class="card" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Customize HTML">
		<div class="header">
			<h2 class="title">Customize HTML</h2>
			<button class="close" onclick={onClose} aria-label="Close">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>
		</div>
		<p class="desc">Metadata included in exported HTML files</p>

		<label class="field">
			<span class="label">Artist</span>
			<input type="text" class="input" bind:value={artist} placeholder="Your name or pseudonym" />
		</label>

		<label class="field">
			<span class="label">Description</span>
			<textarea class="textarea" bind:value={description} placeholder="Short description of the artwork" rows="3"></textarea>
		</label>

		<label class="field">
			<span class="label">Year</span>
			<input type="text" class="input" bind:value={year} placeholder="2026" />
		</label>

		<div class="actions">
			<button class="btn btn-secondary" onclick={onClose}>Cancel</button>
			<button class="btn btn-primary" onclick={apply}>Apply</button>
		</div>
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
		width: 400px;
		max-width: 90vw;
	}
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-1);
	}
	.title {
		font-size: 20px;
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
	.desc {
		color: var(--color-text-muted);
		font-size: 14px;
		margin-bottom: var(--space-6);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		margin-bottom: var(--space-4);
	}
	.label {
		font-size: 12px;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.input {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 14px;
	}
	.input:focus,
	.textarea:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
	}
	.textarea {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 14px;
		resize: vertical;
		font-family: inherit;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		margin-top: var(--space-4);
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
	.btn-secondary {
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}
	.btn-secondary:hover {
		background: var(--color-bg);
	}
</style>
