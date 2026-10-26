<script lang="ts">
	let { onClose }: { onClose: () => void } = $props();
</script>

<div class="guide-backdrop" onclick={onClose} role="presentation">
	<div class="guide-panel" onclick={(e) => e.stopPropagation()} role="dialog">
		<div class="guide-header">
			<h2>How to use Stacker Box</h2>
			<button class="guide-close" onclick={onClose} aria-label="Close guide">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>
		</div>
		<div class="guide-body">
			<h3>Creating Your Composition</h3>

			<ol>
				<li><strong>Start a Project</strong> &mdash; Begin by naming your new project.</li>
				<li><strong>Choose Canvas Size</strong> &mdash; Select the dimensions for your canvas.</li>
				<li><strong>Add Layers</strong> &mdash; Import layers from your local device or from <a href="https://www.arweave.org/" target="_blank" rel="noopener">Arweave</a> (if you&rsquo;ve previously uploaded files).</li>
				<li><strong>Draw</strong> &mdash; Use the drawing tool to add artwork on top of your layers.</li>
				<li><strong>Reorder Layers</strong> &mdash; Reorder layers as needed to perfect your composition.</li>
				<li>
					<strong>Export as <code>.zip</code></strong> <em>(wallet-free)</em>
					<ul>
						<li>Creates a folder with an <code>index.html</code> file and an <code>assets</code> folder.</li>
						<li>The exported file is ready to upload directly to <a href="https://objkt.com/" target="_blank" rel="noopener">objkt</a>.</li>
						<li><strong>Important</strong>: For objkt, you cannot use <code>ar://</code> transactions &mdash; only files within the <code>assets</code> folder are compatible.</li>
					</ul>
				</li>
			</ol>

			<hr />

			<h3>Preparing for SuperRare, Manifold, or TransientLabs</h3>
			<p>To create an HTML file with layers hosted on Arweave for <strong>SuperRare, Manifold, or TransientLabs</strong>, a connected wallet is required. The <code>.zip</code> export above is wallet-free; this HTML workflow uses Arweave for permanent on-chain storage.</p>

			<h3>Preparing for SuperRare, Manifold, or TransientLabs</h3>
			<p>To create an HTML file with layers hosted on Arweave for <strong>SuperRare, Manifold, or TransientLabs</strong>, a connected wallet is required. The <code>.zip</code> export above is wallet-free; this HTML workflow uses Arweave for permanent on-chain storage.</p>

			<h4>Upload to Arweave via <span class="ario-logo"><svg viewBox="0 0 1296 381" fill="none"><path d="M1035.01 60.5C924.55 60.5 835.01 150.04 835.01 260.5V320.5H895.01V280.5C895.01 263.93 908.44 250.5 925.01 250.5C933.29 250.5 940.79 253.86 946.22 259.29C951.65 264.72 955.01 272.22 955.01 280.5V320.5H1015.01V300.5C1015.01 256.32 1050.83 220.5 1095.01 220.5C1139.19 220.5 1175.01 256.32 1175.01 300.5V320.5H1235.01V260.5C1235.01 150.04 1145.47 60.5 1035.01 60.5ZM925.01 220.5C908.44 220.5 895.01 207.07 895.01 190.5C895.01 173.93 908.44 160.5 925.01 160.5C941.58 160.5 955.01 173.93 955.01 190.5C955.01 207.07 941.58 220.5 925.01 220.5Z" fill="currentColor"/><path d="M237.05 95.77C217.12 85.59 194.33 80.5 168.67 80.5C129.24 80.5 101.43 90.82 85.2298 111.47C75.0498 124.66 69.3198 141.5 68.0298 162.01H127.17C128.6 152.98 131.47 145.81 135.77 140.51C141.79 133.34 152.04 129.76 166.52 129.76C179.42 129.76 189.21 131.59 195.88 135.25C202.54 138.9 205.88 145.54 205.88 155.14C205.88 163.03 201.5 168.83 192.76 172.56C187.89 174.71 179.78 176.51 168.46 177.94L147.6 180.52C123.94 183.53 106.02 188.55 93.8398 195.57C71.6198 208.47 60.5098 229.33 60.5098 258.15C60.5098 280.37 67.4298 297.54 81.2598 309.65C95.0898 321.76 112.62 327.82 133.84 327.82C150.47 327.82 165.38 324.02 178.57 316.42C189.61 309.97 199.35 302.16 207.82 292.98V320.51H266.96V153.42C266.96 125.18 256.99 105.97 237.07 95.79L237.05 95.77ZM205.66 229.32C205.23 249.82 199.46 263.94 188.35 271.68C177.24 279.42 165.09 283.29 151.9 283.29C143.58 283.29 136.56 280.92 130.83 276.19C124.95 271.6 122.01 264.08 122.01 253.61C122.01 241.86 126.74 233.18 136.2 227.59C141.79 224.29 151.04 221.5 163.94 219.2L177.7 216.62C184.58 215.33 189.99 213.93 193.93 212.43C197.87 210.93 201.78 208.96 205.65 206.52V229.31L205.66 229.32Z" fill="currentColor"/><path d="M405.44 142.65C380.78 142.65 364.22 150.68 355.76 166.74C351.03 175.77 348.66 189.68 348.66 208.46V320.5H286.94V86.09H345.43V126.95C354.89 111.33 363.14 100.64 370.16 94.91C381.63 85.31 396.54 80.5 414.89 80.5C416.04 80.5 417 80.54 417.79 80.61C418.58 80.68 420.33 80.79 423.06 80.93V143.72C419.19 143.29 415.75 143 412.74 142.86C409.73 142.72 407.29 142.64 405.43 142.64L405.44 142.65Z" fill="currentColor"/><path d="M535.02 159.49H472.87V320.5H535.02V159.49Z" fill="currentColor"/><path d="M504.49 80.5H503.41C485.714 80.5 471.37 94.8448 471.37 112.54C471.37 130.235 485.714 144.58 503.41 144.58H504.49C522.185 144.58 536.53 130.235 536.53 112.54C536.53 94.8448 522.185 80.5 504.49 80.5Z" fill="currentColor"/><path d="M764.83 117.42C784.61 142.03 794.51 171.12 794.51 204.69C794.51 238.26 784.62 268.03 764.83 292.28C745.05 316.54 715.01 328.66 674.73 328.66C634.45 328.66 604.41 316.53 584.63 292.28C564.85 268.03 554.95 238.83 554.95 204.69C554.95 170.55 564.84 142.03 584.63 117.42C604.41 92.81 634.45 80.5 674.73 80.5C715.01 80.5 745.05 92.81 764.83 117.42ZM674.51 131.93C656.59 131.93 642.79 138.22 633.11 150.82C623.44 163.41 618.6 181.37 618.6 204.7C618.6 228.03 623.44 246.03 633.11 258.69C642.79 271.35 656.58 277.68 674.51 277.68C692.44 277.68 706.19 271.35 715.8 258.69C725.4 246.03 730.21 228.04 730.21 204.7C730.21 181.36 725.4 163.41 715.8 150.82C706.19 138.23 692.43 131.93 674.51 131.93Z" fill="currentColor"/><path d="M423.07 320.51C439.638 320.51 453.07 307.079 453.07 290.51C453.07 273.941 439.638 260.51 423.07 260.51C406.501 260.51 393.07 273.941 393.07 290.51C393.07 307.079 406.501 320.51 423.07 320.51Z" fill="currentColor"/></svg></span></h4>
			<ol>
				<li>Go to <a href="https://console.ar.io/" target="_blank" rel="noopener">ar.io console</a>.</li>
				<li>Connect your wallet: <strong>Phantom</strong> for SOL or <strong>MetaMask</strong> for ETH.</li>
				<li>Top up your wallet.</li>
			</ol>

			<h4>Link Wallet to Stacker Box</h4>
			<ol>
				<li>Connect the same wallet in Stacker Box.</li>
				<li>Click <strong>"Upload to Arweave"</strong>.</li>
				<li>For each file, sign a transaction to confirm the upload.</li>
			</ol>

			<h4>Finalize and Download</h4>
			<ul>
				<li>After all files are uploaded, a popup will appear.</li>
				<li>Download the HTML file, which compiles your layers directly from Arweave.</li>
				<li>This HTML can be used as the artwork for <strong>SuperRare, Manifold, or TransientLabs</strong>.</li>
				<li>Optionally, upload the HTML itself to Arweave for additional redundancy.</li>
			</ul>

			<h4>Reuse Layers</h4>
			<ul>
				<li>Uploaded files will appear in the <strong>Arweave Gallery</strong>.</li>
				<li>You can reuse these layers in new compositions.</li>
			</ul>

			<hr />

			<h3>Pro Tip for Extra Redundancy</h3>
			<p>For maximum security, export your composition <strong>both as a <code>.zip</code> and upload everything to Arweave</strong>:</p>
			<ul>
				<li>Use the <code>.zip</code> for minting on <a href="https://objkt.com/" target="_blank" rel="noopener">objkt</a>.</li>
				<li>Include links to the Arweave-hosted layers and HTML in the description.</li>
				<li>This ensures your collectors know the work is backed up and can access it via Arweave.</li>
			</ul>

			<hr />

			<p class="guide-footer"><em>Happy creating!</em> &mdash; Rutger</p>
		</div>
	</div>
</div>

<style>
	.guide-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.guide-panel {
		width: min(640px, 90vw);
		height: min(600px, 85vh);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
	}
	.guide-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.guide-header h2 {
		font-size: 16px;
		font-weight: 600;
		margin: 0;
	}
	.guide-close {
		padding: var(--space-1);
		color: var(--color-text-muted);
		border-radius: var(--radius-sm);
	}
	.guide-close:hover {
		background: var(--color-bg);
		color: var(--color-text);
	}
	.guide-body {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-4) var(--space-5);
		font-size: 14px;
		line-height: 1.7;
		color: var(--color-text);
	}
	.guide-body h3 {
		font-size: 15px;
		font-weight: 600;
		margin: var(--space-4) 0 var(--space-2);
	}
	.guide-body h3:first-child {
		margin-top: 0;
	}
	.guide-body h4 {
		font-size: 14px;
		font-weight: 600;
		margin: var(--space-3) 0 var(--space-1);
	}
	.guide-body ol,
	.guide-body ul {
		margin: 0 0 var(--space-3);
		padding-left: var(--space-5);
	}
	.guide-body li {
		margin-bottom: var(--space-1);
	}
	.guide-body li ul {
		margin-top: var(--space-1);
	}
	.guide-body hr {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: var(--space-4) 0;
	}
	.guide-body a {
		color: var(--color-accent);
		text-decoration: underline;
	}
	.guide-body code {
		font-size: 13px;
		background: var(--color-bg);
		padding: 1px 4px;
		border-radius: 3px;
	}
	.guide-footer {
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.ario-logo {
		display: inline-block;
		vertical-align: middle;
		width: 70px;
		height: 20px;
		margin-left: var(--space-1);
	}
	.ario-logo svg {
		display: block;
		width: 100%;
		height: 100%;
		color: var(--color-text);
	}
</style>