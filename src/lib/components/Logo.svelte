<script lang="ts">
	import { fontVariants, colorForLetter } from '$lib/logo';
	import type { StyleVariant } from '$lib/logo';

	const variants: StyleVariant[] = ['serif', 'sans', 'script', 'mono', 'display', 'round'];
	const weights = ['700', '800', '900'];
	const transforms = ['none', 'rotate(2deg)', 'rotate(-2deg)', 'scaleY(1.05)', 'translateY(-1px)'];

	let fontS = $state(fontVariants[variants[Math.floor(Math.random() * variants.length)]]);
	let fontB = $state(fontVariants[variants[Math.floor(Math.random() * variants.length)]]);
	let weightS = $state(weights[Math.floor(Math.random() * weights.length)]);
	let weightB = $state(weights[Math.floor(Math.random() * weights.length)]);
	let transformS = $state(transforms[Math.floor(Math.random() * transforms.length)]);
	let transformB = $state(transforms[Math.floor(Math.random() * transforms.length)]);
	let colorS = $state(colorForLetter());
	let colorB = $state(colorForLetter());
</script>

<div class="sb-logo">
	<span
		class="letter letter-s"
		style="color: {colorS}; font-family: {fontS}; font-size: 32px; font-weight: {weightS}; transform: {transformS};"
	>S</span>
	<span
		class="letter letter-b"
		style="color: {colorB}; font-family: {fontB}; font-size: 32px; font-weight: {weightB}; transform: {transformB};"
	>B</span>
</div>

<style>
	.sb-logo {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 60px;
		height: 36px;
		flex-shrink: 0;
		overflow: visible;
	}

	.letter {
		position: absolute;
		line-height: 1;
		letter-spacing: -0.03em;
		mix-blend-mode: difference;
		text-shadow: 1px 1px 3px rgba(0,0,0,0.1), 0 0 8px currentColor;
	}

	.letter-s {
		left: 2px;
		z-index: 2;
	}

	.letter-b {
		left: 22px;
		z-index: 1;
	}
</style>