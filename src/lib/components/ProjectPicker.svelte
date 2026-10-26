<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import type { ProjectMeta } from '$lib/stores/db';

	let { onClose }: { onClose?: () => void } = $props();

	let projects = $state<ProjectMeta[]>([]);
	let loaded = $state(false);
	let error = $state('');
	let creating = $state(false);
	let newName = $state('');

	$effect(() => {
		if (!loaded) {
			projectStore.listProjects().then((list) => {
				projects = list;
				loaded = true;
			});
		}
	});

	function showNewForm() {
		creating = true;
		newName = '';
		error = '';
	}

	async function createNew() {
		const name = newName.trim();
		if (!name) {
			error = 'Please give the project a name.';
			return;
		}
		try {
			await projectStore.newProject();
			projectStore.project.name = name;
			await projectStore.save();
			onClose?.();
		} catch (e) {
			error = (e as Error).message || 'Could not create project';
		}
	}

	async function openProject(id: string) {
		try {
			await projectStore.loadProject(id);
			onClose?.();
		} catch (e) {
			error = 'Could not open project: ' + (e as Error).message;
		}
	}

	async function removeProject(id: string) {
		if (!confirm('Delete this project?')) return;
		await projectStore.deleteProject(id);
		projects = await projectStore.listProjects();
	}

	async function renameProject(meta: ProjectMeta, newName: string) {
		const name = newName.trim();
		if (!name || name === meta.name) return;
		await projectStore.loadProject(meta.id);
		projectStore.project.name = name;
		await projectStore.save();
		projects = await projectStore.listProjects();
	}

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="picker-overlay">
	<div class="picker-card">
		<div class="picker-head">
			<h2 class="picker-title">Stacker Box</h2>
			<p class="picker-sub">Open a project or start something new</p>
		</div>

		{#if creating}
			<div class="new-form">
				<label class="new-label" for="project-name">Project name</label>
				<input
					id="project-name"
					type="text"
					class="new-input"
					bind:value={newName}
					placeholder="My composition"
					onkeydown={(e) => e.key === 'Enter' && createNew()}
					autofocus
				/>
				{#if error}
					<p class="error">{error}</p>
				{/if}
				<div class="new-actions">
					<button class="btn btn-secondary" onclick={() => (creating = false)}>Cancel</button>
					<button class="btn btn-primary" onclick={createNew}>Create</button>
				</div>
			</div>
		{:else}
			<button class="new-btn" onclick={showNewForm}>+ New project</button>

			{#if error}
				<p class="error">{error}</p>
			{/if}

			<div class="project-list">
				{#if !loaded}
					<p class="empty">Loading...</p>
				{:else if projects.length === 0}
					<p class="empty">No saved projects yet</p>
				{:else}
					{#each projects as meta}
						<div class="project-row">
							<button class="project-open" onclick={() => openProject(meta.id)}>
								<span class="project-name">{meta.name}</span>
								<span class="project-meta">
									{meta.settings.width} × {meta.settings.height} · {meta.layerCount} layers
								</span>
							</button>
							<div class="project-actions">
								<button
									class="icon-btn"
									title="Rename"
									onclick={() => {
										const name = prompt('Project name:', meta.name);
										if (name !== null) renameProject(meta, name);
									}}
								>✎</button>
								<button
									class="icon-btn danger"
									title="Delete"
									onclick={() => removeProject(meta.id)}
								>🗑</button>
							</div>
						</div>
						<p class="project-when">{formatDate(meta.updatedAt)}</p>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.picker-overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg);
		z-index: 30;
	}
	.picker-card {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		padding: var(--space-8);
		box-shadow: var(--shadow-lg);
		width: 460px;
		max-width: 92vw;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
	}
	.picker-head {
		margin-bottom: var(--space-5);
	}
	.picker-title {
		font-size: 24px;
		font-weight: 700;
		letter-spacing: -0.02em;
	}
	.picker-sub {
		color: var(--color-text-muted);
		font-size: 14px;
		margin-top: var(--space-1);
	}
	.new-btn {
		width: 100%;
		padding: var(--space-3);
		background: var(--color-accent);
		color: white;
		border-radius: var(--radius-md);
		font-size: 15px;
		font-weight: 500;
		margin-bottom: var(--space-5);
	}
	.new-btn:hover {
		background: var(--color-accent-hover);
	}
	.new-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}
	.new-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text);
	}
	.new-input {
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 15px;
		outline: none;
	}
	.new-input:focus {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
	}
	.new-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
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
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}
	.btn-secondary:hover {
		background: var(--color-border);
	}
	.project-list {
		overflow-y: auto;
		flex: 1;
	}
	.project-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-1);
	}
	.project-open {
		flex: 1;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.project-open:hover .project-name {
		color: var(--color-accent);
	}
	.project-name {
		font-size: 15px;
		font-weight: 600;
	}
	.project-meta {
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.project-when {
		font-size: 11px;
		color: var(--color-text-muted);
		text-align: right;
		margin: 0 0 var(--space-3);
	}
	.project-actions {
		display: flex;
		gap: var(--space-1);
	}
	.icon-btn {
		width: 30px;
		height: 30px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
		font-size: 14px;
	}
	.icon-btn:hover {
		background: var(--color-bg);
		color: var(--color-text);
	}
	.icon-btn.danger:hover {
		background: #fee2e2;
		color: var(--color-danger);
	}
	.empty {
		color: var(--color-text-muted);
		text-align: center;
		padding: var(--space-6) 0;
		font-size: 14px;
	}
	.error {
		color: var(--color-danger);
		font-size: 13px;
		margin-bottom: var(--space-3);
	}
</style>