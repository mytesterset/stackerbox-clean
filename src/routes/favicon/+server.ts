import { fontFamilies, colorForLetter } from '$lib/logo';

const styleVariants = ['serif', 'sans', 'script', 'mono', 'display', 'round'] as const;
const weights = ['700', '800', '900'];

export function GET() {
	const sFont = styleVariants[Math.floor(Math.random() * styleVariants.length)];
	const bFont = styleVariants[Math.floor(Math.random() * styleVariants.length)];
	const sW = weights[Math.floor(Math.random() * weights.length)];
	const bW = weights[Math.floor(Math.random() * weights.length)];
	const cS = colorForLetter();
	const cB = colorForLetter();

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <style>
      .s { font-family: ${fontFamilies[sFont]}; font-size: 32px; font-weight: ${sW}; }
      .b { font-family: ${fontFamilies[bFont]}; font-size: 32px; font-weight: ${bW}; }
    </style>
  </defs>
  <text x="6" y="44" class="s" fill="${cS}" style="mix-blend-mode:difference">S</text>
  <text x="26" y="44" class="b" fill="${cB}" style="mix-blend-mode:difference">B</text>
</svg>`;

	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'no-cache'
		}
	});
}