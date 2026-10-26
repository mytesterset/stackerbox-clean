<script lang="ts">
	import { goto } from '$app/navigation';
	import { fontVariants, randomLetterState, colorForLetter } from '$lib/logo';
	import type { LetterState } from '$lib/logo';

	let letterS = $state<LetterState>({ ...randomLetterState(), glitching: Math.random() < 0.25 });
	let letterB = $state<LetterState>({ ...randomLetterState(), glitching: Math.random() < 0.25 });
	let colorS = $state(colorForLetter());
	let colorB = $state(colorForLetter());

	let slideProgress = $state(0);

	$effect(() => {
		const fontInterval = setInterval(() => {
			if (Math.random() < 0.7) letterS = randomLetterState();
			if (Math.random() < 0.7) letterB = randomLetterState();
			colorS = colorForLetter();
			colorB = colorForLetter();
		}, 1200);
		return () => clearInterval(fontInterval);
	});

	$effect(() => {
		let dir = 1;
		let isPaused = false;
		let pauseTimer: ReturnType<typeof setTimeout> | null = null;
		let lastTime = performance.now();
		let frameId: number;

		const SPEED = 0.08;

		function tick(now: number) {
			if (!isPaused) {
				const dt = (now - lastTime) / 1000;
				lastTime = now;

				slideProgress += dir * SPEED * dt;

				if (slideProgress >= 1) {
					slideProgress = 1;
					dir = -1;
				} else if (slideProgress <= 0) {
					slideProgress = 0;
					dir = 1;
				}

				const distance = Math.abs(360 * slideProgress - 180);
				if (distance <= 18) {
					isPaused = true;
					pauseTimer = setTimeout(() => {
						isPaused = false;
						lastTime = performance.now();
					}, 4000);
				}
			}

			frameId = requestAnimationFrame(tick);
		}

		frameId = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(frameId);
			if (pauseTimer) clearTimeout(pauseTimer);
		};
	});

	function handleClick() {
		goto('/editor');
	}
</script>

<div class="landing">
	<div class="logo-area">
		<div class="letters-wrapper">
			<span
				class="letter letter-s"
				style="color: {colorS}; font-family: {fontVariants[letterS.style]}; font-size: {letterS.fontSize}px; font-weight: {letterS.fontWeight}; transform: translateX({slideProgress * 240}px) {letterS.transform};"
				class:glitch={letterS.glitching}
			>S</span>
			<span
				class="letter letter-b"
				style="color: {colorB}; font-family: {fontVariants[letterB.style]}; font-size: {letterB.fontSize}px; font-weight: {letterB.fontWeight}; transform: translateX({-slideProgress * 240}px) {letterB.transform};"
				class:glitch={letterB.glitching}
			>B</span>
		</div>
	</div>

	<p class="subtitle">stacker box</p>
	<p class="tagline">
		stack files from your local machine<br />
		add a layer by using the drawing tool<br />
		export it as .zip for objkt<br />
		or as .html for manifold, SR and transientlabs
	</p>

	<button class="cta" onclick={handleClick}>enjoy creating</button>

	<p class="signature">by rutger van der tas</p>
</div>

<style>
	.landing {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		padding: var(--space-8) var(--space-4);
		background: var(--color-bg);
		overflow: hidden;
	}

	.logo-area {
		width: 440px;
		height: 240px;
		position: relative;
		margin-bottom: var(--space-2);
	}

	.letters-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.letter {
		position: absolute;
		font-size: 190px;
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.03em;
		top: 0;
		mix-blend-mode: difference;
		text-shadow: 3px 3px 12px rgba(0,0,0,0.14), 0 0 28px currentColor;
		transition: color 0.8s ease, font-family 0.6s ease, font-size 0.6s ease, font-weight 0.6s ease;
		will-change: transform, font-family, font-size;
	}

	.letter.glitch {
		animation: glitch 0.3s ease-in-out 2;
	}

	.letter-s {
		left: 0;
	}

	.letter-b {
		left: 240px;
	}

	@keyframes glitch {
		0%   { clip-path: inset(0 0 0 0); transform: translate(0); }
		20%  { clip-path: inset(40% 0 0 0); transform: translate(-3px, 2px); }
		40%  { clip-path: inset(70% 0 0 0); transform: translate(3px, -1px); }
		60%  { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 1px); }
		80%  { clip-path: inset(80% 0 0 0); transform: translate(2px, -2px); }
		100% { clip-path: inset(0 0 0 0); transform: translate(0); }
	}

	.subtitle {
		font-family: var(--font-display);
		font-size: 54px;
		font-style: italic;
		font-weight: 600;
		color: var(--color-text);
		letter-spacing: -0.01em;
		text-align: center;
	}

	.tagline {
		font-family: var(--font-sans);
		font-size: 18px;
		font-weight: 400;
		letter-spacing: 0.02em;
		color: var(--color-text-muted);
		text-align: center;
		max-width: 480px;
		line-height: 1.6;
	}

	.cta {
		margin-top: var(--space-6);
		padding: var(--space-4) var(--space-8);
		background: var(--color-accent);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 17px;
		font-weight: 500;
		letter-spacing: 0.01em;
		transition: background 0.2s, transform 0.2s;
	}
	.cta:hover {
		background: var(--color-accent-hover);
		transform: translateY(-1px);
	}
	.cta:active {
		transform: translateY(0);
	}

	.signature {
		margin-top: var(--space-4);
		font-family: var(--font-display);
		font-size: 18px;
		font-style: italic;
		color: var(--color-text-muted);
		text-align: center;
	}
</style>