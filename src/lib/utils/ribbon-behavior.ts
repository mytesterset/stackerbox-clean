export function computeNextHalfWidth(
	base: number,
	variance: number,
	mode: string,
	currentHalfWidth: number,
	distanceTravelled: number
): number {
	if (mode === 'constant') return base;
	if (mode === 'random') {
		const maxDelta = base * variance * 0.35;
		let next = currentHalfWidth + (Math.random() * 2 - 1) * maxDelta;
		const min = Math.max(base * (1 - variance), 1);
		const max = base * (1 + variance);
		next = Math.max(min, Math.min(max, next));
		return next;
	}
	if (mode === 'pulse') {
		const freq = 0.06;
		const wave = Math.sin(distanceTravelled * freq);
		return base * (1 + wave * variance);
	}
	return base;
}

export function computeWaveOffset(distance: number, amplitude: number, freq: number, phaseDeg: number): number {
	if (amplitude <= 0) return 0;
	const rad = (phaseDeg * Math.PI) / 180;
	return amplitude * Math.sin(distance * freq * 0.02 + rad);
}

export function hexToHue(hex: string): number {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	if (max === min) return 0;
	const d = max - min;
	let h = 0;
	if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
	else if (max === g) h = ((b - r) / d + 2) * 60;
	else h = ((r - g) / d + 4) * 60;
	return h;
}

function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
	const num = parseInt(full, 16);
	return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
	const clamp = (v: number) => Math.round(Math.max(0, Math.min(255, v)));
	return '#' + [r, g, b]
		.map((v) => clamp(v).toString(16).padStart(2, '0'))
		.join('');
}

export function shadeHex(hex: string, amount: number): string {
	const [r, g, b] = hexToRgb(hex);
	const t = amount < 0 ? 0 : 255;
	const p = Math.abs(amount);
	return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
}
