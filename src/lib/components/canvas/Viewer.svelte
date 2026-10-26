<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { handleFileUpload } from './upload-layer';
	import { resolveRemoteLayer } from '$lib/arweave/turbo';

	let viewerEl = $state<HTMLElement>();
	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let panStartX = $state(0);
	let panStartY = $state(0);
	let spaceHeld = $state(false);

	let resolvedUrls = $state<Record<string, string>>({});

	let resizing = $state<{ layerId: string; handle: string; startX: number; startY: number; startW: number; startH: number; startLX: number; startLY: number } | null>(null);

	let dragging = $state<{ layerId: string; offsetX: number; offsetY: number } | null>(null);

	let canvasW = $derived(projectStore.project.settings.width);
	let canvasH = $derived(projectStore.project.settings.height);

	const visibleLayers = $derived(
		[...projectStore.project.layers]
			.filter((l) => l.visible)
			.sort((a, b) => a.order - b.order)
	);

	const hasNoLayers = $derived(projectStore.project.layers.length === 0);

	$effect(() => {
		void canvasW;
		void canvasH;
		requestAnimationFrame(() => {
			centerCanvas();
		});
	});

	$effect(() => {
		for (const layer of projectStore.project.layers) {
			if (layer.arTxId && !layer.objectUrl && !resolvedUrls[layer.arTxId]) {
				resolveRemoteLayer(layer.arTxId, layer.contentHash, layer.type).then(({ blob }) => {
					const url = URL.createObjectURL(blob);
					projectStore.updateLayer(layer.id, { objectUrl: url, blob });
				}).catch(() => {
					resolvedUrls = { ...resolvedUrls, [layer.arTxId!]: 'failed' };
				});
				resolvedUrls = { ...resolvedUrls, [layer.arTxId]: 'loading' };
			}
		}
	});

	function centerCanvas() {
		if (!viewerEl) return;
		const r = viewerEl.getBoundingClientRect();
		const pad = 64;
		const sx = (r.width - pad) / canvasW;
		const sy = (r.height - pad) / canvasH;
		zoom = Math.min(sx, sy, 1);
		panX = (r.width - canvasW * zoom) / 2;
		panY = (r.height - canvasH * zoom) / 2;
	}

	function getTransform(x: number, y: number): { x: number; y: number } {
		if (!viewerEl) return { x: 0, y: 0 };
		const rect = viewerEl.getBoundingClientRect();
		return {
			x: (x - rect.left - panX) / zoom,
			y: (y - rect.top - panY) / zoom
		};
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? -0.1 : 0.1;
		zoom = Math.max(0.1, Math.min(10, zoom + delta));
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.button === 1 || spaceHeld) {
			e.preventDefault();
			isPanning = true;
			panStartX = e.clientX - panX;
			panStartY = e.clientY - panY;
			return;
		}
		if (e.button === 0 && !(e.target as HTMLElement).closest('.layer-wrapper')) {
			isPanning = true;
			panStartX = e.clientX - panX;
			panStartY = e.clientY - panY;
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (dragging) {
			const pos = getTransform(e.clientX, e.clientY);
			projectStore.updateLayer(dragging.layerId, {
				x: Math.round(pos.x - dragging.offsetX),
				y: Math.round(pos.y - dragging.offsetY)
			});
			return;
		}
		if (resizing) {
			const pos = getTransform(e.clientX, e.clientY);
			const dx = pos.x - resizing.startX;
			const dy = pos.y - resizing.startY;
			let { startW, startH, startLX, startLY } = resizing;
			let nw = startW, nh = startH, nx = startLX, ny = startLY;

			if (resizing.handle.includes('e')) nw = Math.max(10, startW + dx);
			if (resizing.handle.includes('w')) { nw = Math.max(10, startW - dx); nx = startLX + startW - nw; }
			if (resizing.handle.includes('s')) nh = Math.max(10, startH + dy);
			if (resizing.handle.includes('n')) { nh = Math.max(10, startH - dy); ny = startLY + startH - nh; }

			projectStore.updateLayer(resizing.layerId, { width: Math.round(nw), height: Math.round(nh), x: Math.round(nx), y: Math.round(ny) });
			return;
		}
		if (!isPanning) return;
		panX = e.clientX - panStartX;
		panY = e.clientY - panStartY;
	}

	function handleMouseUp() {
		isPanning = false;
		dragging = null;
		resizing = null;
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

	function deselectCanvas() {
		projectStore.selectLayer(null);
	}

	function startResize(layerId: string, handle: string, e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		const layer = projectStore.project.layers.find((l) => l.id === layerId);
		if (!layer) return;
		const pos = getTransform(e.clientX, e.clientY);
		resizing = {
			layerId,
			handle,
			startX: pos.x,
			startY: pos.y,
			startW: layer.width,
			startH: layer.height,
			startLX: layer.x,
			startLY: layer.y
		};
	}

	function startDrag(layerId: string, e: MouseEvent) {
		projectStore.selectLayer(layerId);
		const layer = projectStore.project.layers.find((l) => l.id === layerId);
		if (!layer) return;
		const pos = getTransform(e.clientX, e.clientY);
		dragging = {
			layerId,
			offsetX: pos.x - layer.x,
			offsetY: pos.y - layer.y
		};
	}

	function zoomIn() {
		zoom = Math.min(10, zoom + 0.25);
	}

	function zoomOut() {
		zoom = Math.max(0.1, zoom - 0.25);
	}

	function fitToScreen() {
		centerCanvas();
	}
</script>

<svelte:window onmouseup={handleMouseUp} onmousemove={handleMouseMove} onkeydown={(e: KeyboardEvent) => { if (e.key === ' ') { const tag = (e.target as HTMLElement).tagName; const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable; if (!isInput) { e.preventDefault(); spaceHeld = true; } } }} onkeyup={(e: KeyboardEvent) => { if (e.key === ' ') { spaceHeld = false; } }} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	bind:this={viewerEl}
	class="viewer-container"
	class:panning={isPanning}
	class:spaceheld={spaceHeld}
	ondrop={handleDrop}
	ondragover={handleDragOver}
	onmousedown={handleMouseDown}
	onwheel={handleWheel}
	onclick={deselectCanvas}
	onkeydown={(e: KeyboardEvent) => { if (e.key === 'Escape') deselectCanvas(); }}
	role="application"
	aria-label="Canvas viewer"
>
	<div
		class="canvas-transform"
		style="transform: translate({panX}px, {panY}px) scale({zoom}); transform-origin: 0 0;"
	>
		<div
			class="canvas"
			style="width: {canvasW}px; height: {canvasH}px;"
		>
			{#each visibleLayers as layer (layer.id)}
				<div
					class="layer-wrapper"
					class:selected={projectStore.selectedLayerId === layer.id}
					style="
						left: {layer.x}px;
						top: {layer.y}px;
						width: {layer.width}px;
						height: {layer.height}px;
						opacity: {layer.opacity / 100};
						z-index: {layer.order};
					"
					onmousedown={(e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.handle')) startDrag(layer.id, e); }}
					role="button"
					aria-label="Layer {layer.name}"
					tabindex="0"
				>
					{#if layer.type === 'html'}
						<iframe
							title={layer.name}
							src={layer.objectUrl}
							style="width: 100%; height: 100%; border: none; pointer-events: none;"
							sandbox="allow-scripts"
						></iframe>
					{:else if layer.objectUrl}
						<img
							src={layer.objectUrl}
							alt={layer.name}
							style="width: 100%; height: 100%; object-fit: fill; pointer-events: none;"
							draggable="false"
						/>
					{/if}
					{#if projectStore.selectedLayerId === layer.id}
						<span class="handle nw" role="button" tabindex="-1" onmousedown={(e: MouseEvent) => startResize(layer.id, 'nw', e)}></span>
						<span class="handle ne" role="button" tabindex="-1" onmousedown={(e: MouseEvent) => startResize(layer.id, 'ne', e)}></span>
						<span class="handle sw" role="button" tabindex="-1" onmousedown={(e: MouseEvent) => startResize(layer.id, 'sw', e)}></span>
						<span class="handle se" role="button" tabindex="-1" onmousedown={(e: MouseEvent) => startResize(layer.id, 'se', e)}></span>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<div class="zoom-controls">
		<button class="zoom-btn" onclick={zoomOut} aria-label="Zoom uit">−</button>
		<span class="zoom-value">{Math.round(zoom * 100)}%</span>
		<button class="zoom-btn" onclick={zoomIn} aria-label="Zoom in">+</button>
		<button class="zoom-btn" onclick={fitToScreen} aria-label="Fit to screen">⊡</button>
	</div>

	{#if hasNoLayers}
		<div class="empty-overlay">
			<p class="empty-title">Drop or upload layers to get started</p>
		</div>
	{/if}
</div>

<style>
	.viewer-container {
		width: 100%;
		height: 100%;
		overflow: hidden;
		position: relative;
		cursor: default;
	}
	.viewer-container.panning {
		cursor: grabbing;
	}
	.viewer-container.spaceheld {
		cursor: grab;
	}
	.canvas-transform {
		position: absolute;
		top: 0;
		left: 0;
	}
	.canvas {
		position: relative;
		background: white;
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.15),
			0 4px 24px rgba(0, 0, 0, 0.12);
	}
	.layer-wrapper {
		position: absolute;
		transition: box-shadow 0.1s;
	}
	.layer-wrapper:hover {
		box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.3);
	}
	.layer-wrapper.selected {
		box-shadow: 0 0 0 2px var(--color-accent);
	}
	.handle {
		position: absolute;
		width: 12px;
		height: 12px;
		background: white;
		border: 2px solid var(--color-accent);
		border-radius: 2px;
		pointer-events: auto;
		cursor: pointer;
		z-index: 10;
	}
	.handle.nw { top: -6px; left: -6px; cursor: nwse-resize; }
	.handle.ne { top: -6px; right: -6px; cursor: nesw-resize; }
	.handle.sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
	.handle.se { bottom: -6px; right: -6px; cursor: nwse-resize; }
	.zoom-controls {
		position: absolute;
		bottom: var(--space-4);
		right: var(--space-4);
		display: flex;
		align-items: center;
		gap: var(--space-1);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-1);
		box-shadow: var(--shadow-sm);
	}
	.zoom-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		font-size: 16px;
		color: var(--color-text);
	}
	.zoom-btn:hover {
		background: var(--color-bg);
	}
	.zoom-value {
		font-size: 12px;
		color: var(--color-text-muted);
		min-width: 40px;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
	.empty-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}
	.empty-title {
		color: var(--color-text-muted);
		font-size: 18px;
		pointer-events: none;
		user-select: none;
	}
</style>