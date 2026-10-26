export type StyleVariant = 'serif' | 'sans' | 'script' | 'mono' | 'display' | 'round';

export const fontVariants: Record<StyleVariant, string> = {
	serif: 'Georgia, "Times New Roman", serif',
	sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
	script: '"Brush Script MT", "Segoe Script", cursive',
	mono: '"Courier New", ui-monospace, monospace',
	display: '"Arial Black", "Impact", sans-serif',
	round: '"Trebuchet MS", "Comic Sans MS", sans-serif'
};

export const fontFamilies: Record<StyleVariant, string> = {
	serif: 'Georgia, Times New Roman, serif',
	sans: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
	script: 'Brush Script MT, Segoe Script, cursive',
	mono: 'Courier New, ui-monospace, monospace',
	display: 'Arial Black, Impact, sans-serif',
	round: 'Trebuchet MS, Comic Sans MS, sans-serif'
};

export const pastel = [
	{ h: 8, s: 80, l: 24 },
	{ h: 18, s: 85, l: 24 },
	{ h: 30, s: 90, l: 24 },
	{ h: 42, s: 90, l: 22 },
	{ h: 52, s: 90, l: 24 },
	{ h: 340, s: 75, l: 26 },
	{ h: 320, s: 70, l: 26 },
	{ h: 285, s: 65, l: 28 }
] as const;

export const styleVariants: StyleVariant[] = ['serif', 'sans', 'script', 'mono', 'display', 'round'];

export interface LetterState {
	style: StyleVariant;
	fontSize: number;
	fontWeight: string;
	glitching: boolean;
	transform: string;
}

export function randomLetterState(): LetterState {
	const weights = ['400', '700', '800', '900'];
	const transforms = [
		'none',
		'rotate(2deg)',
		'rotate(-2deg)',
		'scaleY(1.1)',
		'scale(0.95)',
		'translateY(-2px)',
		'translateY(2px)',
		'rotate(180deg)'
	];
	return {
		style: styleVariants[Math.floor(Math.random() * styleVariants.length)],
		fontSize: 150 + Math.floor(Math.random() * 60),
		fontWeight: weights[Math.floor(Math.random() * weights.length)],
		glitching: Math.random() < 0.25,
		transform: transforms[Math.floor(Math.random() * transforms.length)]
	};
}

export function colorForLetter(): string {
	const p = pastel[Math.floor(Math.random() * pastel.length)];
	return `hsl(${p.h} ${p.s}% ${p.l}%)`;
}

export function hslValues(color: string) {
	const m = color.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
	if (!m) return { h: 0, s: 0, l: 0 };
	return { h: +m[1], s: +m[2], l: +m[3] };
}