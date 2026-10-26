<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import ExportButton from '$lib/components/export/ExportButton.svelte';
	import ArweaveButton from '$lib/components/export/ArweaveButton.svelte';
	import { projectStore } from '$lib/stores/project.svelte';

	let { onOpenSettings, onOpenProjects, onOpenGuide, onOpenAbout, onOpenTerms, onOpenCustomize, onOpenShare, onOpenMint, sidebarCollapsed, onToggleSidebar }: {
		onOpenSettings: () => void;
		onOpenProjects: () => void;
		onOpenGuide: () => void;
		onOpenAbout: () => void;
		onOpenTerms: () => void;
		onOpenCustomize: () => void;
		onOpenShare: () => void;
		onOpenMint: () => void;
		sidebarCollapsed: boolean;
		onToggleSidebar: () => void;
	} = $props();

	let menuOpen = $state(false);

	function toggle() {
		menuOpen = !menuOpen;
	}

	function close() {
		menuOpen = false;
	}
</script>

<div class="topbar">
	<div class="topbar-left">
		<Logo />
		<span class="logo">Stacker Box</span>
		<span class="project-name">{projectStore.project.name}</span>
	</div>
	<div class="topbar-right">
		<button
			class="menu-btn"
			class:open={menuOpen}
			onclick={toggle}
			aria-label="Menu"
			aria-expanded={menuOpen}
		>
			<span class="menu-line"></span>
			<span class="menu-line"></span>
			<span class="menu-line"></span>
		</button>
	</div>
</div>

{#if menuOpen}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="menu-backdrop"
		onclick={close}
		onkeydown={(e) => e.key === 'Escape' && close()}
		role="presentation"
	></div>
{/if}
<div class="menu" class:open={menuOpen} role="menu">
		<button class="menu-item" role="menuitem" onclick={() => { close(); onOpenProjects(); }}>
		Projects
	</button>
	<button class="menu-item" role="menuitem" onclick={() => { close(); onToggleSidebar(); }}>
		{#if sidebarCollapsed}Show layers{:else}Hide layers{/if}
	</button>
	<button class="menu-item" role="menuitem" onclick={() => { close(); onOpenSettings(); }}>
		Canvas settings
		<span class="menu-item-hint">{projectStore.project.settings.width} × {projectStore.project.settings.height}</span>
	</button>
	<button class="menu-item" role="menuitem" onclick={() => { close(); onOpenGuide(); }}>
		How to use
	</button>
	<button class="menu-item" role="menuitem" onclick={() => { close(); onOpenCustomize(); }}>
		Customize HTML
	</button>
	<button class="menu-item" role="menuitem" onclick={() => { close(); onOpenAbout(); }}>
		About
	</button>
	<button class="menu-item" role="menuitem" onclick={() => { close(); onOpenTerms(); }}>
		Terms of Use
	</button>

	<div class="menu-divider"></div>

	<div class="menu-export">
		<ExportButton />
	</div>
	<div class="menu-export">
		<ArweaveButton />
	</div>

	<div class="menu-divider"></div>

	<button class="menu-item" role="menuitem" onclick={() => { close(); onOpenShare(); }}>
		Share
	</button>

	<button class="menu-item" role="menuitem" onclick={() => { close(); onOpenMint(); }}>
		Mint
	</button>

	<div class="menu-divider"></div>

	<div class="menu-meta">
		<p>&copy; {new Date().getFullYear()} by <a class="menu-meta-link" href="https://rutgervandertas.com" target="_blank" rel="noreferrer">Rutger van der Tas</a></p>
		<p class="menu-meta-gdpr">No cookies. No tracking. Fonts are self-hosted. Analytics via Umami (anonymized, no personal data).</p>
	</div>
</div>

<style>
	.topbar {
		height: var(--topbar-height);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--space-4);
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.topbar-left {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	.logo {
		font-weight: 700;
		font-size: 17px;
		letter-spacing: -0.02em;
	}
	.project-name {
		color: var(--color-text-muted);
		font-size: 14px;
	}
	.topbar-right {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.menu-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 5px;
		width: 40px;
		height: 40px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		transition: background 0.15s;
	}
	.menu-btn:hover {
		background: var(--color-bg);
	}
	.menu-line {
		display: block;
		width: 18px;
		height: 2px;
		background: var(--color-text);
		border-radius: 1px;
		transition: transform 0.2s, opacity 0.2s;
	}
	.menu-btn.open .menu-line:nth-child(1) {
		transform: translateY(7px) rotate(45deg);
	}
	.menu-btn.open .menu-line:nth-child(2) {
		opacity: 0;
	}
	.menu-btn.open .menu-line:nth-child(3) {
		transform: translateY(-7px) rotate(-45deg);
	}

	.menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 90;
		background: transparent;
	}
	.menu {
		display: none;
		position: fixed;
		top: calc(var(--topbar-height) + 8px);
		right: var(--space-4);
		z-index: 91;
		width: 260px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		padding: var(--space-2);
		flex-direction: column;
	}
	.menu.open {
		display: flex;
	}
	.menu-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: var(--space-3) var(--space-3);
		font-size: 14px;
		color: var(--color-text);
		border-radius: var(--radius-sm);
		text-align: left;
	}
	.menu-item:hover {
		background: var(--color-bg);
	}
	.menu-item-hint {
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.menu-divider {
		height: 1px;
		background: var(--color-border);
		margin: var(--space-2) 0;
	}
	.menu-export {
		padding: var(--space-1) var(--space-1);
	}
	.menu-export :global(.export-wrapper),
	.menu-export :global(.arweave-wrapper) {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--space-2);
	}
	.menu-export :global(.export-btn),
	.menu-export :global(.arweave-btn) {
		width: 100%;
		text-align: center;
	}
	.menu-meta {
		padding: var(--space-2) var(--space-3);
		font-size: 11px;
		color: var(--color-text-muted);
		line-height: 1.5;
		text-align: center;
	}
	.menu-meta-link {
		color: var(--color-text-muted);
		text-decoration: none;
		font-weight: 500;
	}
	.menu-meta-link:hover {
		color: var(--color-accent);
		text-decoration: underline;
	}
	.menu-meta-gdpr {
		margin-top: var(--space-1);
		font-size: 10px;
		opacity: 0.7;
	}
</style>
