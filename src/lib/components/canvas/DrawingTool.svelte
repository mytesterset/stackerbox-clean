<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { resolveRemoteLayer } from '$lib/arweave/turbo';
	import { tick } from 'svelte';
	import { getShapeLocalPoints } from '$lib/utils/ribbon-geometry';
	import { computeNextHalfWidth, computeWaveOffset, hexToHue, shadeHex } from '$lib/utils/ribbon-behavior';

	let { layerId, onClose }: { layerId: string; onClose: (saved?: boolean) => void } = $props();

	let canvasEl = $state<HTMLCanvasElement>();
	let ctx: CanvasRenderingContext2D | null = null;

	let canvasWrapEl = $state<HTMLDivElement>();

	let strokeEl = $state<HTMLCanvasElement>();
	let strokeCtx: CanvasRenderingContext2D | null = null;

	const MAX_RIBBON_STEPS = 500;

	interface Stamp {
		x: number; y: number;
		halfW: number;
		dirX: number; dirY: number;
		perpX: number; perpY: number;
		halfLen: number;
		top: string;
		stripe: string;
		sideTop: string;
		sideDark: string;
	}

	let drawing = $state(false);
	let lastX = $state(0);
	let lastY = $state(0);
	let history: Blob[] = [];
	let activePointerId: number | null = null;

	let ribbonLastStampX = $state(0);
	let ribbonLastStampY = $state(0);
	let ribbonDistanceTravelled = $state(0);
	let ribbonCurrentHalfWidth = $state(18);

let brushType = $state('normal');
	let brushColor = $state('#7c9eff');
	let brushSize = $state(6);
	let brushOpacity = $state(100);
	let ribbonShape = $state('rect');
	let ribbonWidthVal = $state(36);
	let widthMode = $state('constant');
	let widthVarianceVal = $state(40);
	let ribbonSpacingVal = $state(28);
	let ribbonGapVal = $state(0);
	let hueSpeedVal = $state(3);
	let fillMode = $state('hue');
	let duotoneColor = $state('#d9c9a3');
	let waveAmplitude = $state(0);
	let waveFreq = $state(5);
	let wavePhase = $state(0);

	let stampShape = $state('rect');
	let stampSizeVal = $state(40);
	let stampSpacingVal = $state(50);
	let stampRotationMode = $state('follow');
	let stampFixedRotation = $state(0);
	let stampFillColor = $state('#7c9eff');
	let stampFillAlpha = $state(100);
	let stampStrokeColor = $state('#2a2a2a');
	let stampStrokeWidth = $state(2);
	let stampStrokeAlpha = $state(100);

	let canvasWidth = $state(800);
	let canvasHeight = $state(500);

	let stampLastX = $state(0);
	let stampLastY = $state(0);
	let stampDistanceTravelled = $state(0);

	function loadBrushPreset() {
		try {
			const raw = localStorage.getItem('stackerbox-drawing-preset');
			if (!raw) return;
			const preset = JSON.parse(raw);
			if (preset.brushType !== undefined) brushType = preset.brushType;
			if (preset.brushColor !== undefined) brushColor = preset.brushColor;
			if (preset.brushSize !== undefined) brushSize = preset.brushSize;
			if (preset.brushOpacity !== undefined) brushOpacity = preset.brushOpacity;
			if (preset.ribbonShape !== undefined) ribbonShape = preset.ribbonShape;
			if (preset.ribbonWidthVal !== undefined) ribbonWidthVal = preset.ribbonWidthVal;
			if (preset.widthMode !== undefined) widthMode = preset.widthMode;
			if (preset.widthVarianceVal !== undefined) widthVarianceVal = preset.widthVarianceVal;
			if (preset.ribbonSpacingVal !== undefined) ribbonSpacingVal = preset.ribbonSpacingVal;
			if (preset.ribbonGapVal !== undefined) ribbonGapVal = preset.ribbonGapVal;
			if (preset.hueSpeedVal !== undefined) hueSpeedVal = preset.hueSpeedVal;
			if (preset.fillMode !== undefined) fillMode = preset.fillMode;
			if (preset.duotoneColor !== undefined) duotoneColor = preset.duotoneColor;
			if (preset.waveAmplitude !== undefined) waveAmplitude = preset.waveAmplitude;
			if (preset.waveFreq !== undefined) waveFreq = preset.waveFreq;
			if (preset.wavePhase !== undefined) wavePhase = preset.wavePhase;
			if (preset.stampShape !== undefined) stampShape = preset.stampShape;
			if (preset.stampSizeVal !== undefined) stampSizeVal = preset.stampSizeVal;
			if (preset.stampSpacingVal !== undefined) stampSpacingVal = preset.stampSpacingVal;
			if (preset.stampRotationMode !== undefined) stampRotationMode = preset.stampRotationMode;
			if (preset.stampFixedRotation !== undefined) stampFixedRotation = preset.stampFixedRotation;
			if (preset.stampFillColor !== undefined) stampFillColor = preset.stampFillColor;
			if (preset.stampFillAlpha !== undefined) stampFillAlpha = preset.stampFillAlpha;
			if (preset.stampStrokeColor !== undefined) stampStrokeColor = preset.stampStrokeColor;
			if (preset.stampStrokeWidth !== undefined) stampStrokeWidth = preset.stampStrokeWidth;
			if (preset.stampStrokeAlpha !== undefined) stampStrokeAlpha = preset.stampStrokeAlpha;
		} catch { /* ignore corrupt data */ }
	}

	function saveBrushPreset() {
		try {
			localStorage.setItem('stackerbox-drawing-preset', JSON.stringify({
				brushType, brushColor, brushSize, brushOpacity,
				ribbonShape, ribbonWidthVal, widthMode, widthVarianceVal,
				ribbonSpacingVal, ribbonGapVal, hueSpeedVal, fillMode, duotoneColor,
				waveAmplitude, waveFreq, wavePhase,
				stampShape, stampSizeVal, stampSpacingVal,
				stampRotationMode, stampFixedRotation,
				stampFillColor, stampFillAlpha,
				stampStrokeColor, stampStrokeWidth, stampStrokeAlpha
			}));
		} catch { /* ignore quota exceeded */ }
	}

	let _brushedLoaded = false;
	$effect(() => {
		if (_brushedLoaded) return;
		_brushedLoaded = true;
		loadBrushPreset();
	});

	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let panStartX = $state(0);
	let panStartY = $state(0);
	let spaceHeld = $state(false);
	let panToolActive = $state(false);
	let hasInitialized = $state(false);

	$effect(() => {
		const { width, height } = projectStore.project.settings;
		canvasWidth = width;
		canvasHeight = height;
	});

	$effect(() => {
		if (canvasEl) {
			ctx = canvasEl.getContext('2d', { alpha: true });
		}
	});

	let loadedExisting = $state(false);
	let _drawFallbackUrl = '';

	$effect(() => {
		if (!canvasEl || !ctx) return;
		const layer = projectStore.project.layers.find((l) => l.id === layerId);
		if (!layer) return;

		if (layer.width !== canvasWidth || layer.height !== canvasHeight) {
			canvasWidth = layer.width;
			canvasHeight = layer.height;
			loadedExisting = false;
			tick().then(() => fitCenter());
			return;
		}

		if (loadedExisting) return;
		const src = layer.objectUrl || null;
		if (!src) return;
		if (!canvasWidth || !canvasHeight) return;

		tick().then(() => {
			if (!ctx || !canvasEl) return;
			loadedExisting = true;
			const el = canvasEl;
			const cw = el.width;
			const ch = el.height;
			const img = new Image();
			img.onload = () => {
				if (!ctx) return;
				ctx.clearRect(0, 0, cw, ch);
				ctx.drawImage(img, 0, 0, cw, ch);
			};
			img.onerror = () => {
				if (!layer.arTxId || layer.objectUrl) return;
				resolveRemoteLayer(layer.arTxId, layer.contentHash, layer.type).then(({ blob }) => {
					if (_drawFallbackUrl) URL.revokeObjectURL(_drawFallbackUrl);
					const url = URL.createObjectURL(blob);
					_drawFallbackUrl = url;
					projectStore.updateLayer(layerId, { objectUrl: url, blob });
				}).catch(() => {});
			};
			img.src = src;
		});
	});

	$effect(() => {
		if (strokeEl) {
			strokeCtx = strokeEl.getContext('2d', { alpha: true });
		}
	});

	$effect(() => {
		void canvasWidth; void canvasHeight;
		if (canvasWrapEl && !hasInitialized) {
			hasInitialized = true;
			fitCenter();
		}
	});

	function getPos(e: PointerEvent): { x: number; y: number } {
		const c = canvasEl;
		if (!c) return { x: 0, y: 0 };
		const rect = c.getBoundingClientRect();
		const scaleX = c.width / rect.width;
		const scaleY = c.height / rect.height;
		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY
		};
	}

	function maxHistoryDepth(): number {
		const area = canvasWidth * canvasHeight;
		if (area >= 9_000_000) return 6;
		if (area >= 4_000_000) return 12;
		if (area >= 1_000_000) return 20;
		return 30;
	}

	function saveHistory() {
		const c = canvasEl;
		if (!c) return;
		c.toBlob((blob) => {
			if (!blob) return;
			history.push(blob);
			if (history.length > maxHistoryDepth()) history.shift();
		}, 'image/png');
	}

	function ensureStrokeCanvas(): CanvasRenderingContext2D | null {
		return strokeCtx;
	}

	let prevStamp: Stamp | null = null;
	let ribbonStampIndex = 0;

	function zoomIn() {
		zoom = Math.min(10, zoom + 0.25);
	}

	function zoomOut() {
		zoom = Math.max(0.1, zoom - 0.25);
	}

	function fitCenter() {
		const wrap = canvasWrapEl;
		if (!wrap) return;
		const r = wrap.getBoundingClientRect();
		const pad = 64;
		const sx = (r.width - pad) / canvasWidth;
		const sy = (r.height - pad) / canvasHeight;
		zoom = Math.min(sx, sy, 1);
		panX = (r.width - canvasWidth * zoom) / 2;
		panY = (r.height - canvasHeight * zoom) / 2;
	}

	function centerCurrent() {
		const wrap = canvasWrapEl;
		if (!wrap) return;
		const r = wrap.getBoundingClientRect();
		panX = (r.width - canvasWidth * zoom) / 2;
		panY = (r.height - canvasHeight * zoom) / 2;
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? -0.1 : 0.1;
		zoom = Math.max(0.1, Math.min(10, zoom + delta));
	}

	function onPointerDown(e: PointerEvent) {
		if (e.button === 1 || (e.pointerType === 'pen' && e.button === 5) || (e.button === 0 && (spaceHeld || panToolActive))) {
			e.preventDefault();
			isPanning = true;
			panStartX = e.clientX - panX;
			panStartY = e.clientY - panY;
			const c = canvasEl;
			if (c) {
				try { c.setPointerCapture(e.pointerId); } catch { /* not supported */ }
			}
			activePointerId = e.pointerId;
			return;
		}
		if (activePointerId !== null) return;
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		const c = canvasEl;
		if (!c) return;
		activePointerId = e.pointerId;
		try {
			c.setPointerCapture(e.pointerId);
		} catch {
			// pointer capture not supported
		}
		startDraw(e);
	}

	function onPointerMove(e: PointerEvent) {
		if (activePointerId !== e.pointerId) return;
		if (isPanning) {
			panX = e.clientX - panStartX;
			panY = e.clientY - panStartY;
			return;
		}
		moveDraw(e);
	}

	function onPointerUp(e: PointerEvent) {
		if (activePointerId !== e.pointerId) return;
		activePointerId = null;
		if (isPanning) { isPanning = false; return; }
		stopDraw();
	}

	function onPointerCancel(e: PointerEvent) {
		if (activePointerId !== e.pointerId) return;
		activePointerId = null;
		if (isPanning) { isPanning = false; return; }
		stopDraw();
	}

	function startDraw(e: PointerEvent) {
		e.preventDefault();
		if (!ctx || !canvasEl) return;
		const sc = ensureStrokeCanvas();
		if (!sc) return;
		saveHistory();
		sc.clearRect(0, 0, canvasEl.width, canvasEl.height);
		drawing = true;
		const pos = getPos(e);
		lastX = pos.x;
		lastY = pos.y;

		if (brushType === 'ribbon') {
			ribbonLastStampX = pos.x;
			ribbonLastStampY = pos.y;
			ribbonDistanceTravelled = 0;
			ribbonCurrentHalfWidth = ribbonWidthVal / 2;
			ribbonStampIndex = 0;
			prevStamp = null;
		} else if (brushType === 'stamp') {
			stampLastX = pos.x;
			stampLastY = pos.y;
			stampDistanceTravelled = 0;
		} else {
			drawSegment(sc, pos.x, pos.y, pos.x, pos.y);
		}
	}

	function moveDraw(e: PointerEvent) {
		if (!drawing) return;
		e.preventDefault();
		const sc = strokeCtx;
		if (!sc) return;
		const pos = getPos(e);

		if (brushType === 'ribbon') {
			stepRibbon(sc, pos.x, pos.y);
		} else if (brushType === 'stamp') {
			stepStamp(sc, pos.x, pos.y);
		} else {
			drawSegment(sc, lastX, lastY, pos.x, pos.y);
		}

		lastX = pos.x;
		lastY = pos.y;
	}

	function stopDraw() {
		if (!drawing) return;
		drawing = false;
		compositeStroke();
	}

	function compositeStroke() {
		if (!ctx || !strokeEl || !strokeCtx) return;
		ctx.save();
		ctx.globalAlpha = brushOpacity / 100;
		ctx.drawImage(strokeEl, 0, 0);
		ctx.restore();
		strokeCtx.clearRect(0, 0, strokeEl.width, strokeEl.height);
		prevStamp = null;
	}

	function drawSegment(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
		c.save();
		c.globalAlpha = 1;
		c.strokeStyle = brushColor;
		c.lineWidth = brushSize;
		c.lineCap = 'round';
		c.lineJoin = 'round';
		c.beginPath();
		c.moveTo(x1, y1);
		c.lineTo(x2, y2);
		c.stroke();
		c.restore();
	}

	function stepRibbon(c: CanvasRenderingContext2D, x: number, y: number) {
		const dx = x - ribbonLastStampX;
		const dy = y - ribbonLastStampY;
		const dist = Math.hypot(dx, dy);
		const spacing = ribbonSpacingVal;

		if (dist < spacing) return;

		const rawSteps = Math.floor(dist / spacing);
		const steps = Math.min(rawSteps, MAX_RIBBON_STEPS);
		if (steps === 0) return;

		const stepX = (dx / dist) * spacing;
		const stepY = (dy / dist) * spacing;
		const baseHue = hexToHue(brushColor);
		const gapRatio = ribbonGapVal / 100;
		const halfLen = (spacing * (1 - gapRatio)) / 2;
		if (halfLen < 0.5) return;

		let cx = ribbonLastStampX;
		let cy = ribbonLastStampY;

		for (let i = 0; i < steps; i++) {
			const nx = cx + stepX;
			const ny = cy + stepY;
			ribbonDistanceTravelled += spacing;

			const halfW = getNextHalfWidth();
			const segLen = Math.hypot(nx - cx, ny - cy) || 1;
			const sDirX = (nx - cx) / segLen;
			const sDirY = (ny - cy) / segLen;
			const sPerpX = -sDirY;
			const sPerpY = sDirX;

			const wave = computeWaveOffset(ribbonDistanceTravelled, waveAmplitude, waveFreq, wavePhase);
			const colors = getStampColors(baseHue);

			const seg: Stamp = {
				x: (cx + nx) / 2 + sPerpX * wave,
				y: (cy + ny) / 2 + sPerpY * wave,
				halfW, dirX: sDirX, dirY: sDirY,
				perpX: sPerpX, perpY: sPerpY,
				halfLen,
				...colors
			};

			if (prevStamp) {
				drawSidePanel(c, prevStamp, seg);
			}
			drawStampFace(c, seg);

			prevStamp = seg;
			ribbonStampIndex++;
			cx = nx;
			cy = ny;
		}

		ribbonLastStampX = cx;
		ribbonLastStampY = cy;
	}

	function getStampColors(baseHue: number): { top: string; stripe: string; sideTop: string; sideDark: string } {
		if (fillMode === 'duotone') {
			const color = ribbonStampIndex % 2 === 0 ? brushColor : duotoneColor;
			return {
				top: color,
				stripe: shadeHex(color, -0.45),
				sideTop: shadeHex(color, -0.45),
				sideDark: shadeHex(color, -0.6)
			};
		}
		const hue = (baseHue + ribbonDistanceTravelled * hueSpeedVal) % 360;
		return {
			top: `hsl(${hue}, 85%, 65%)`,
			stripe: `hsl(${hue}, 75%, 32%)`,
			sideTop: `hsl(${hue}, 75%, 30%)`,
			sideDark: `hsl(${hue}, 70%, 25%)`
		};
	}

	function drawSidePanel(c: CanvasRenderingContext2D, prev: Stamp, seg: Stamp) {
		const sp = 0.5;
		const pBL = { x: prev.x - prev.dirX * prev.halfLen + prev.perpX * prev.halfW * sp, y: prev.y - prev.dirY * prev.halfLen + prev.perpY * prev.halfW * sp };
		const pBR = { x: prev.x - prev.dirX * prev.halfLen - prev.perpX * prev.halfW * sp, y: prev.y - prev.dirY * prev.halfLen - prev.perpY * prev.halfW * sp };
		const sBL = { x: seg.x - seg.dirX * seg.halfLen + seg.perpX * seg.halfW * sp, y: seg.y - seg.dirY * seg.halfLen + seg.perpY * seg.halfW * sp };
		const sBR = { x: seg.x - seg.dirX * seg.halfLen - seg.perpX * seg.halfW * sp, y: seg.y - seg.dirY * seg.halfLen - seg.perpY * seg.halfW * sp };
		const ex = seg.halfW * 0.3;
		const ey = seg.halfW * 0.38;

		c.fillStyle = seg.sideTop;
		c.beginPath();
		c.moveTo(pBL.x, pBL.y);
		c.lineTo(sBL.x, sBL.y);
		c.lineTo(sBL.x + ex, sBL.y + ey);
		c.lineTo(pBL.x + ex, pBL.y + ey);
		c.closePath();
		c.fill();

		c.fillStyle = seg.sideDark;
		c.beginPath();
		c.moveTo(pBR.x, pBR.y);
		c.lineTo(sBR.x, sBR.y);
		c.lineTo(sBR.x + ex, sBR.y + ey);
		c.lineTo(pBR.x + ex, pBR.y + ey);
		c.closePath();
		c.fill();
	}

	function drawStampFace(c: CanvasRenderingContext2D, seg: Stamp) {
		const { x: cx, y: cy, halfW, dirX, dirY, perpX, perpY, halfLen, top, stripe } = seg;

		const localPts = getShapeLocalPoints(ribbonShape, halfLen, halfW);
		const worldPts = localPts.map((p) => ({
			x: cx + dirX * p.x + perpX * p.y,
			y: cy + dirY * p.x + perpY * p.y
		}));

		c.save();
		c.beginPath();
		worldPts.forEach((p, j) => (j === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y)));
		c.closePath();
		c.fillStyle = top;
		c.fill();

		const stripeCount = Math.max(3, Math.round((halfLen * 2) / 3.5));
		c.save();
		c.beginPath();
		worldPts.forEach((p, j) => (j === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y)));
		c.closePath();
		c.clip();
		c.strokeStyle = stripe;
		c.lineWidth = 1.2;
		for (let k = 0; k <= stripeCount; k++) {
			const t = k / stripeCount;
			const lx = -halfLen + halfLen * 2 * t;
			const bx = cx + dirX * lx;
			const by = cy + dirY * lx;
			c.beginPath();
			c.moveTo(bx + perpX * halfW, by + perpY * halfW);
			c.lineTo(bx - perpX * halfW, by - perpY * halfW);
			c.stroke();
		}
		c.restore();

		c.strokeStyle = stripe;
		c.lineWidth = 1;
		c.beginPath();
		worldPts.forEach((p, j) => (j === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y)));
		c.closePath();
		c.stroke();

		c.restore();
	}

	function drawRepeatedStamp(
		c: CanvasRenderingContext2D,
		cx: number, cy: number,
		dirX: number, dirY: number,
		rotationDeg: number
	) {
		const halfSize = stampSizeVal / 2;
		const localPts = getShapeLocalPoints(stampShape, halfSize, halfSize);
		const rad = (rotationDeg * Math.PI) / 180;
		const rDirX = Math.cos(rad);
		const rDirY = Math.sin(rad);
		const rPerpX = -rDirY;
		const rPerpY = rDirX;
		const worldPts = localPts.map((p) => ({
			x: cx + rDirX * p.x + rPerpX * p.y,
			y: cy + rDirY * p.x + rPerpY * p.y
		}));

		c.save();
		c.beginPath();
		worldPts.forEach((p, j) => (j === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y)));
		c.closePath();

		if (stampFillAlpha > 0) {
			c.globalAlpha = stampFillAlpha / 100;
			c.fillStyle = stampFillColor;
			c.fill();
		}
		if (stampStrokeWidth > 0 && stampStrokeAlpha > 0) {
			c.globalAlpha = stampStrokeAlpha / 100;
			c.strokeStyle = stampStrokeColor;
			c.lineWidth = stampStrokeWidth;
			c.stroke();
		}
		c.restore();
	}

	function stepStamp(c: CanvasRenderingContext2D, x: number, y: number) {
		const dx = x - stampLastX;
		const dy = y - stampLastY;
		const dist = Math.hypot(dx, dy);
		const spacing = stampSpacingVal;

		if (dist < spacing) return;

		const rawSteps = Math.floor(dist / spacing);
		const steps = Math.min(rawSteps, MAX_RIBBON_STEPS);
		if (steps === 0) return;

		const stepX = (dx / dist) * spacing;
		const stepY = (dy / dist) * spacing;
		const dirX = dx / dist;
		const dirY = dy / dist;

		let cx = stampLastX;
		let cy = stampLastY;

		for (let i = 0; i < steps; i++) {
			cx += stepX;
			cy += stepY;
			stampDistanceTravelled += spacing;

			let rotationDeg: number;
			if (stampRotationMode === 'fixed') {
				rotationDeg = stampFixedRotation;
			} else if (stampRotationMode === 'random') {
				rotationDeg = Math.random() * 360;
			} else {
				rotationDeg = (Math.atan2(dirY, dirX) * 180) / Math.PI;
			}

			drawRepeatedStamp(c, cx, cy, dirX, dirY, rotationDeg);
		}

		stampLastX = cx;
		stampLastY = cy;
	}

	function getNextHalfWidth(): number {
		const base = ribbonWidthVal / 2;
		const variance = widthVarianceVal / 100;
		ribbonCurrentHalfWidth = computeNextHalfWidth(base, variance, widthMode, ribbonCurrentHalfWidth, ribbonDistanceTravelled);
		return ribbonCurrentHalfWidth;
	}

	function handleClear() {
		if (!ctx || !canvasEl) return;
		saveHistory();
		ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
		strokeCtx?.clearRect(0, 0, canvasEl.width, canvasEl.height);
		prevStamp = null;
	}

	async function handleUndo() {
		if (!ctx || !canvasEl || history.length === 0) return;
		const blob = history.pop()!;
		try {
			const bmp = await createImageBitmap(blob);
			ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
			strokeCtx?.clearRect(0, 0, canvasEl.width, canvasEl.height);
			ctx.drawImage(bmp, 0, 0);
			bmp.close();
		} catch {
			// bitmap decode failed; skip this undo frame
		}
		prevStamp = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			handleUndo();
		}
		if (e.key === ' ') {
			const tag = (e.target as HTMLElement).tagName;
			const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;
			if (!isInput) {
				e.preventDefault();
				spaceHeld = true;
			}
		}
	}

	function handleKeyup(e: KeyboardEvent) {
		if (e.key === ' ') {
			spaceHeld = false;
		}
	}

	async function handleSave() {
		const c = canvasEl;
		if (!c) return;
		const blob = await new Promise<Blob>((resolve, reject) => {
			c.toBlob((b) => {
				if (b) resolve(b);
				else reject(new Error('Failed to generate PNG'));
			}, 'image/png');
		});
		const objectUrl = URL.createObjectURL(blob);
		projectStore.updateLayer(layerId, {
			blob,
			objectUrl,
			width: canvasWidth,
			height: canvasHeight
		});
		await projectStore.save();
		saveBrushPreset();
		onClose(true);
	}

	function handleClose() {
		saveBrushPreset();
		onClose(false);
	}
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} />

<div class="draw-root" onwheel={onWheel}>
	<div class="draw-toolbar">
		<div class="tb-field">
			<label for="brushType">Brush</label>
			<select id="brushType" bind:value={brushType}>
				<option value="normal">Standard line</option>
				<option value="ribbon">Ribbon Trail</option>
				<option value="stamp">Repeated shape</option>
			</select>
		</div>

		<div class="tb-field">
			<label for="color">Color</label>
			<input type="color" id="color" bind:value={brushColor} class="color-picker" />
		</div>

		{#if brushType === 'normal'}
			<div class="tb-field">
				<label for="size">Brush <span class="tb-val">{brushSize}px</span></label>
				<input type="range" id="size" bind:value={brushSize} min="1" max="60" />
			</div>
		{/if}

		<div class="tb-field">
			<label for="opacity">Opacity <span class="tb-val">{brushOpacity}%</span></label>
			<input type="range" id="opacity" bind:value={brushOpacity} min="1" max="100" />
		</div>

		<button class="btn btn-secondary" onclick={handleUndo}>Undo</button>
		<button class="btn btn-secondary" onclick={handleClear}>Clear</button>

		<div class="tb-divider"></div>

		<div class="zoom-controls">
			<button class="btn btn-secondary btn-zoom" onclick={zoomOut} title="Zoom out">−</button>
			<span class="zoom-label">{Math.round(zoom * 100)}%</span>
			<button class="btn btn-secondary btn-zoom" onclick={zoomIn} title="Zoom in">+</button>
			<button class="btn btn-secondary btn-zoom" onclick={centerCurrent} title="Center">⊡</button>
			<button class="btn btn-secondary btn-zoom" onclick={fitCenter} title="Fit to screen">1:1</button>
			<button
				class="btn btn-zoom"
				class:active={panToolActive}
				onclick={() => (panToolActive = !panToolActive)}
				title="Pan tool (drag to move canvas)"
			>✋</button>
		</div>

		{#if brushType === 'ribbon'}
			<div class="tb-divider"></div>

			<div class="tb-field">
				<label for="ribbonShape">Shape</label>
				<select id="ribbonShape" bind:value={ribbonShape}>
					<option value="rect">Rectangle</option>
					<option value="ellipse">Capsule / ellipse</option>
					<option value="chevron">Chevron / arrow</option>
					<option value="hexagon">Hexagon</option>
				</select>
			</div>

			<div class="tb-field">
				<label for="ribbonWidth">Base width <span class="tb-val">{ribbonWidthVal}px</span></label>
				<input type="range" id="ribbonWidth" bind:value={ribbonWidthVal} min="6" max="140" />
			</div>

			<div class="tb-field">
				<label for="widthMode">Width variation</label>
				<select id="widthMode" bind:value={widthMode}>
					<option value="constant">Constant</option>
					<option value="random">Random walker</option>
					<option value="pulse">Pulse (wave)</option>
				</select>
			</div>

			<div class="tb-field">
				<label for="widthVariance">Variation <span class="tb-val">{widthVarianceVal}%</span></label>
				<input
					type="range"
					id="widthVariance"
					bind:value={widthVarianceVal}
					min="0"
					max="100"
					disabled={widthMode === 'constant'}
				/>
			</div>

			<div class="tb-divider"></div>

			<div class="tb-field">
				<label for="ribbonSpacing">Spacing <span class="tb-val">{ribbonSpacingVal}px</span></label>
				<input type="range" id="ribbonSpacing" bind:value={ribbonSpacingVal} min="6" max="100" />
			</div>

			<div class="tb-field">
				<label for="ribbonGap">Gap <span class="tb-val">{ribbonGapVal}%</span></label>
				<input type="range" id="ribbonGap" bind:value={ribbonGapVal} min="0" max="85" />
			</div>

			<div class="tb-field">
				<label for="fillMode">Fill</label>
				<select id="fillMode" bind:value={fillMode}>
					<option value="hue">Hue gradient</option>
					<option value="duotone">Duotone</option>
				</select>
			</div>

			{#if fillMode === 'hue'}
				<div class="tb-field">
					<label for="hueSpeed">Hue speed <span class="tb-val">{hueSpeedVal}</span></label>
					<input type="range" id="hueSpeed" bind:value={hueSpeedVal} min="0" max="15" />
				</div>
			{:else}
				<div class="tb-field">
					<label for="duotoneColor">Color B</label>
					<input type="color" id="duotoneColor" bind:value={duotoneColor} class="color-picker" />
				</div>
			{/if}

			<div class="tb-divider"></div>

			<div class="tb-field">
				<label for="waveAmplitude">Wave amplitude <span class="tb-val">{waveAmplitude}px</span></label>
				<input type="range" id="waveAmplitude" bind:value={waveAmplitude} min="0" max="100" />
			</div>

			<div class="tb-field">
				<label for="waveFreq">Wave frequency <span class="tb-val">{waveFreq}</span></label>
				<input type="range" id="waveFreq" bind:value={waveFreq} min="0" max="10" disabled={waveAmplitude === 0} />
			</div>

			<div class="tb-field">
				<label for="wavePhase">Wave phase <span class="tb-val">{wavePhase}°</span></label>
				<input type="range" id="wavePhase" bind:value={wavePhase} min="0" max="360" disabled={waveAmplitude === 0} />
			</div>
		{/if}

		{#if brushType === 'stamp'}
			<div class="tb-divider"></div>

			<div class="tb-field">
				<label for="stampShape">Shape</label>
				<select id="stampShape" bind:value={stampShape}>
					<option value="rect">Rectangle</option>
					<option value="ellipse">Capsule / ellipse</option>
					<option value="chevron">Chevron / arrow</option>
					<option value="hexagon">Hexagon</option>
				</select>
			</div>

			<div class="tb-field">
				<label for="stampSize">Size <span class="tb-val">{stampSizeVal}px</span></label>
				<input type="range" id="stampSize" bind:value={stampSizeVal} min="6" max="300" />
			</div>

			<div class="tb-field">
				<label for="stampSpacing">Spacing <span class="tb-val">{stampSpacingVal}px</span></label>
				<input type="range" id="stampSpacing" bind:value={stampSpacingVal} min="6" max="300" />
			</div>

			<div class="tb-field">
				<label for="stampRotationMode">Rotation</label>
				<select id="stampRotationMode" bind:value={stampRotationMode}>
					<option value="follow">Follow direction</option>
					<option value="fixed">Fixed angle</option>
					<option value="random">Random</option>
				</select>
			</div>

			{#if stampRotationMode === 'fixed'}
				<div class="tb-field">
					<label for="stampFixedRotation">Angle <span class="tb-val">{stampFixedRotation}°</span></label>
					<input type="range" id="stampFixedRotation" bind:value={stampFixedRotation} min="0" max="360" />
				</div>
			{/if}

			<div class="tb-divider"></div>

			<div class="tb-field">
				<label for="stampFillColor">Fill color</label>
				<input type="color" id="stampFillColor" bind:value={stampFillColor} class="color-picker" />
			</div>

			<div class="tb-field">
				<label for="stampFillAlpha">Fill opacity <span class="tb-val">{stampFillAlpha}%</span></label>
				<input type="range" id="stampFillAlpha" bind:value={stampFillAlpha} min="0" max="100" />
			</div>

			<div class="tb-field">
				<label for="stampStrokeColor">Stroke color</label>
				<input type="color" id="stampStrokeColor" bind:value={stampStrokeColor} class="color-picker" />
			</div>

			<div class="tb-field">
				<label for="stampStrokeWidth">Stroke width <span class="tb-val">{stampStrokeWidth}px</span></label>
				<input type="range" id="stampStrokeWidth" bind:value={stampStrokeWidth} min="0" max="20" />
			</div>

			<div class="tb-field">
				<label for="stampStrokeAlpha">Stroke opacity <span class="tb-val">{stampStrokeAlpha}%</span></label>
				<input type="range" id="stampStrokeAlpha" bind:value={stampStrokeAlpha} min="0" max="100" />
			</div>
		{/if}

		<div class="tb-field save-field">
			<button class="btn btn-primary" onclick={handleSave}>Save</button>
			<button class="btn btn-secondary" onclick={handleClose}>Cancel</button>
		</div>
	</div>

	<div class="canvas-wrap" bind:this={canvasWrapEl}>
		<div class="canvas-stack" style="transform: translate({panX}px, {panY}px) scale({zoom}); transform-origin: 0 0">
			<canvas
				bind:this={canvasEl}
				width={canvasWidth}
				height={canvasHeight}
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={onPointerUp}
				onpointercancel={onPointerCancel}
				class="draw-canvas {isPanning ? 'draw-panning' : ''} {panToolActive ? 'draw-panmode' : ''}"
			></canvas>
			<canvas
				bind:this={strokeEl}
				width={canvasWidth}
				height={canvasHeight}
				class="stroke-canvas"
				style="opacity: {brushOpacity / 100}"
			></canvas>
		</div>
	</div>
</div>

<style>
	.draw-root {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		background: var(--color-bg);
		z-index: 20;
	}
	.draw-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.tb-field {
		display: flex;
		flex-direction: column;
		gap: 3px;
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.tb-field label {
		font-weight: 500;
	}
	.tb-val {
		font-weight: 400;
		margin-left: 2px;
	}
	.save-field {
		margin-left: auto;
		display: flex;
		flex-direction: row;
		gap: var(--space-2);
		align-items: end;
	}
	.color-picker {
		width: 36px;
		height: 28px;
		border: none;
		border-radius: 4px;
		background: none;
		cursor: pointer;
		padding: 0;
	}
	.draw-toolbar select {
		padding: 4px 6px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: 12px;
		background: var(--color-bg);
		color: var(--color-text);
	}
	.draw-toolbar input[type="range"] {
		width: 90px;
	}
	.draw-toolbar input[type="range"]:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.tb-divider {
		width: 1px;
		align-self: stretch;
		background: var(--color-border);
	}

	.canvas-wrap {
		flex: 1;
		position: relative;
		overflow: hidden;
		background-image:
			linear-gradient(45deg, #d6d3d1 25%, transparent 25%),
			linear-gradient(-45deg, #d6d3d1 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #d6d3d1 75%),
			linear-gradient(-45deg, transparent 75%, #d6d3d1 75%);
		background-size: 20px 20px;
		background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
		background-color: #e8e6e3;
	}
	.canvas-stack {
		position: absolute;
		top: 0;
		left: 0;
		display: grid;
		width: fit-content;
		height: fit-content;
		box-shadow: var(--shadow-lg);
		line-height: 0;
		will-change: transform;
	}
	.draw-canvas {
		grid-area: 1 / 1;
		display: block;
		cursor: crosshair;
		background: transparent;
		touch-action: none;
	}
	.draw-canvas.draw-panning {
		cursor: grabbing;
	}
	.draw-canvas.draw-panmode {
		cursor: grab;
	}
	.stroke-canvas {
		grid-area: 1 / 1;
		display: block;
		background: transparent;
		pointer-events: none;
	}

	.zoom-controls {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}
	.zoom-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-muted);
		min-width: 36px;
		text-align: center;
	}
	.btn-zoom {
		padding: 2px 8px;
		font-size: 14px;
		font-weight: 600;
		min-width: 28px;
		text-align: center;
	}
	.btn-zoom.active {
		background: var(--color-accent);
		color: white;
		border-color: var(--color-accent);
	}

	.btn {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-sm);
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
	}
	.btn-primary {
		background: var(--color-accent);
		color: white;
		border: none;
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
</style>