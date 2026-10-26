<script lang="ts">
	import TopBar from '$lib/components/TopBar.svelte';
	import Sidebar from '$lib/components/sidebar/LayerPanel.svelte';
	import Viewer from '$lib/components/canvas/Viewer.svelte';
	import DrawingTool from '$lib/components/canvas/DrawingTool.svelte';
	import ProjectSettings from '$lib/components/canvas/ProjectSettings.svelte';
	import ProjectPicker from '$lib/components/ProjectPicker.svelte';
	import GuideViewer from '$lib/components/GuideViewer.svelte';
	import AboutViewer from '$lib/components/AboutViewer.svelte';
	import TermsViewer from '$lib/components/TermsViewer.svelte';
	import CustomizeHtml from '$lib/components/CustomizeHtml.svelte';
	import ShareDialog from '$lib/components/ShareDialog.svelte';
	import MintWizard from '$lib/mint/MintWizard.svelte';
	import { projectStore } from '$lib/stores/project.svelte';
	import { galleryStore } from '$lib/stores/arweave-gallery.svelte';
	import { fetchVerifiedJsonFromGateway, fetchJsonFromGateway } from '$lib/arweave/turbo';
	import type { SharedComposition } from '$lib/arweave/generate-arweave-html';

	let showPicker = $state(true);
	let loadingShared = $state(false);
	let showSettings = $state(false);
	let showDrawing = $state(false);
	let drawingLayerId = $state<string | null>(null);
	let drawingIsNew = $state(false);
	let sidebarCollapsed = $state(false);
	let showGuide = $state(false);
	let showAbout = $state(false);
	let showTerms = $state(false);
	let showCustomize = $state(false);
	let showShare = $state(false);
	let showMint = $state(false);

	let workTxId = $derived(galleryStore.getLatestArtworkTxId());

	$effect(() => {
		if (!showPicker) {
			showSettings = projectStore.project.layers.length === 0;
		}
	});

	let didHashCheck = $state(false);
	$effect(() => {
		if (didHashCheck) return;
		didHashCheck = true;
		if (typeof window === 'undefined') return;
		const hash = window.location.hash.replace(/^#/, '');
		if (!hash || hash.length < 10) return;

		const separatorIdx = hash.indexOf(':');
		const txId = separatorIdx > 0 ? hash.slice(0, separatorIdx) : hash;
		const contentHash = separatorIdx > 0 ? hash.slice(separatorIdx + 1) : null;
		if (!contentHash && !window.confirm('This composition has no integrity hash. Its contents may have changed. Continue loading it?')) return;

		loadingShared = true;

		const fetcher = contentHash
			? fetchVerifiedJsonFromGateway<SharedComposition>(txId, contentHash)
			: fetchJsonFromGateway<SharedComposition>(txId);

		fetcher
			.then((data) => {
				if (data.stackerbox !== 1) return;
				projectStore.loadFromSharedComposition(data);
				showPicker = false;
				window.history.replaceState(null, '', window.location.pathname);
			})
			.catch(() => {})
			.finally(() => { loadingShared = false; });
	});

	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		void projectStore.project.updatedAt;
		void projectStore.project.layers.length;
		if (showPicker) return;
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			projectStore.save();
		}, 500);
		return () => clearTimeout(saveTimer);
	});

	function handleOpenDraw(existingLayerId?: string) {
		if (existingLayerId) {
			drawingLayerId = existingLayerId;
			drawingIsNew = false;
			showDrawing = true;
			return;
		}
		const { width, height } = projectStore.project.settings;
		const blankCanvas = document.createElement('canvas');
		blankCanvas.width = width;
		blankCanvas.height = height;
		blankCanvas.toBlob(async (blob) => {
			if (!blob) return;
			const objectUrl = URL.createObjectURL(blob);
			const layer = projectStore.addLayer({
				name: 'Drawing',
				type: 'png',
				blob,
				objectUrl,
				x: 0,
				y: 0,
				width,
				height,
				opacity: 100,
				visible: true,
				lockRatio: true
			});
			drawingLayerId = layer.id;
			drawingIsNew = true;
			showDrawing = true;
		});
	}

	function handleCloseDraw(saved?: boolean) {
		if (!saved && drawingLayerId && drawingIsNew) {
			projectStore.removeLayer(drawingLayerId);
		}
		showDrawing = false;
		drawingLayerId = null;
		drawingIsNew = false;
	}
</script>

{#if loadingShared}
	<div class="loading-overlay">
		<p>Loading shared composition&hellip;</p>
	</div>
{:else if showPicker}
	<ProjectPicker onClose={() => (showPicker = false)} />
{:else}
	<div class="root">
		<TopBar onOpenSettings={() => (showSettings = !showSettings)} onOpenProjects={() => (showPicker = true)} onOpenGuide={() => (showGuide = true)} onOpenAbout={() => (showAbout = true)} onOpenTerms={() => (showTerms = true)} onOpenCustomize={() => (showCustomize = true)} onOpenShare={() => (showShare = true)} onOpenMint={() => (showMint = true)} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => (sidebarCollapsed = !sidebarCollapsed)} />
		<div class="main">
			{#if !sidebarCollapsed}
				<Sidebar onToggleCollapse={() => (sidebarCollapsed = true)} onOpenDraw={() => handleOpenDraw()} onEditDraw={(id) => handleOpenDraw(id)} />
			{/if}
			<div class="viewer-area">
				{#if showDrawing && drawingLayerId}
					<DrawingTool layerId={drawingLayerId} onClose={handleCloseDraw} />
				{:else if showSettings}
					<ProjectSettings onClose={() => (showSettings = false)} />
				{:else}
					<Viewer />
				{/if}
			</div>
		</div>
	</div>
	{#if showGuide}
		<GuideViewer onClose={() => (showGuide = false)} />
	{/if}
	{#if showAbout}
		<AboutViewer onClose={() => (showAbout = false)} />
	{/if}
	{#if showTerms}
		<TermsViewer onClose={() => (showTerms = false)} />
	{/if}
	{#if showCustomize}
		<CustomizeHtml onClose={() => (showCustomize = false)} />
	{/if}
	{#if showShare}
		<ShareDialog onClose={() => (showShare = false)} />
	{/if}
	{#if showMint}
		<MintWizard workTxId={workTxId} onClose={() => (showMint = false)} />
	{/if}
{/if}

<style>
	.root {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}
	.main {
		display: flex;
		flex: 1;
		overflow: hidden;
	}
	.viewer-area {
		flex: 1;
		position: relative;
		overflow: hidden;
		background: #e8e6e3;
		background-image: radial-gradient(circle, #d6d3d1 1px, transparent 1px);
		background-size: 20px 20px;
	}
	.loading-overlay {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		font-size: 18px;
		color: var(--color-text-muted);
	}
</style>