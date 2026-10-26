<script lang="ts">
	let { onClose }: { onClose: () => void } = $props();
</script>

<div class="about-backdrop" onclick={onClose} role="presentation">
	<div class="about-panel" onclick={(e) => e.stopPropagation()} role="dialog">
		<div class="about-header">
			<h2>About Stacker Box</h2>
			<button class="about-close" onclick={onClose} aria-label="Close">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>
		</div>
		<div class="about-body">
			<p>Stacker Box was created by <strong>Rutger van der Tas</strong> as a tool for artists to experiment with layer stacking and a built-in online drawing tool.</p>

			<p>The <strong>Arweave upload option</strong> is meant to encourage thinking differently about what we build our work on. Instead of only saving locally, you can store your layers permanently and decentrally on Arweave, so your work is not dependent on one server or platform. Stacker Box aims to offer the most future-proof way of working possible.</p>

			<h3>Arweave permanence</h3>
			<p>Everything uploaded to Arweave is <strong>permanently and publicly stored</strong> on a decentralized blockchain. Once uploaded, data <strong>cannot be deleted, modified, or removed</strong> by anyone — not by you, not by Stacker Box, not by any third party.</p>
			<p>This means:</p>
			<ul>
				<li>Your artwork is permanently accessible as long as the Arweave network exists</li>
				<li>There is <strong>no way to comply with data deletion requests</strong> after upload</li>
				<li>All uploads are <strong>publicly visible</strong> — anyone with the transaction ID can view the content</li>
			</ul>
			<p><strong>Do not upload private, sensitive, or personal data.</strong> Only upload content you intend to distribute permanently and publicly. Stacker Box shows a confirmation dialog before every first wallet connection to ensure you understand these implications.</p>

			<h3>Export formats</h3>

			<h4><code>.zip</code> export (wallet-free)</h4>
			<p>A self-contained ZIP with an <code>index.html</code> and an <code>assets/</code> folder. All layers are bundled as files in the ZIP with no external dependencies. The <code>index.html</code> displays your composition with responsive scaling (adapts to any screen size). Ready to upload directly to <strong>objkt</strong>.</p>

			<h4><code>.html</code> export (Arweave)</h4>
			<p>A single self-contained HTML file where each layer references an Arweave transaction ID via <code>data-tx</code> attributes. An embedded JavaScript script loads the layers through multiple AR.IO gateways with built-in fallback logic:</p>
			<ul>
				<li><strong>Gateway shuffle</strong> &mdash; gateways are randomized per page load to distribute load evenly</li>
				<li><strong>8s timeout</strong> &mdash; a slow or hanging gateway does not block the others</li>
				<li><strong>Preferred gateway</strong> &mdash; once a gateway successfully loads a layer, all remaining layers try that gateway first</li>
				<li><strong>Live gateway list</strong> &mdash; at export time, the current list of healthy AR.IO gateways is fetched and baked into the HTML</li>
				<li><strong>Static fallback</strong> &mdash; if the live fetch fails, the export falls back to a hardcoded list of trusted gateways</li>
			</ul>
			<p>This format is intended for <strong>SuperRare, Manifold and TransientLabs</strong>.</p>

			<h4>Gateway resilience & long-term risks</h4>
			<p>The exported HTML relies on Arweave gateways to load layers at view time. The gateway list is baked into the file at export and never refreshed:</p>
			<ul>
				<li><strong>Multiple gateways</strong> are embedded for redundancy</li>
				<li>The loader tries every gateway with timeouts (4s–8s) — if one succeeds, it becomes the preferred gateway for all remaining layers</li>
				<li><strong>If all gateways fail</strong> (e.g. years from now if Arweave no longer exists), <strong>layers will not load and the composition will appear blank</strong>. There is no fallback image or placeholder.</li>
				<li>For maximum future-proofing, use the <code>.zip</code> export alongside Arweave — the ZIP bundles everything locally with zero external dependencies</li>
			</ul>

			<h3>Known risks & limitations</h3>
			<p>Stacker Box mitigates the known risks in its wallet and upload flow, but some risks are inherent to the Arweave protocol and cannot be eliminated by code:</p>
			<ul>
				<li><strong>Permanent storage is irreversible.</strong> Even with the consent warning, human error (uploading private data) cannot be undone by any party. There is no delete button on Arweave.</li>
				<li><strong>Third-party dependencies.</strong> Stacker Box relies on the <code>@ardrive/turbo-sdk</code>, <code>ethers</code>, and <code>@solana/web3.js</code> libraries. These are monitored and kept up to date, but zero-day vulnerabilities in dependencies are a risk every web application shares.</li>
				<li><strong>Transaction approval is manual.</strong> You must approve each upload transaction in your wallet. The security of your funds also depends on the integrity of your wallet extension — keep it updated and only install extensions from official sources.</li>
				<li><strong>Consent bypass via devtools.</strong> The Arweave permanence warning is stored in <code>localStorage</code>. A user with browser devtools open can manually set the flag and skip the warning. This is standard for client-side consent and matches how most dApps handle acknowledgments.</li>
				<li><strong>Gateway trust model.</strong> The exported HTML trusts gateways to serve correct content. In the extremely unlikely event that all core gateways are compromised simultaneously, viewers would see manipulated content. This is a fundamental trust assumption of any gateway-based Arweave application.</li>
			</ul>

			<h3>Security & privacy</h3>
			<ul>
				<li><strong>Wallet keys never leave your wallet.</strong> Stacker Box uses your browser wallet extension (Phantom or MetaMask) to sign transactions — your private keys are never shared with Stacker Box.</li>
				<li><strong>Supported wallets.</strong> Stacker Box supports providers that identify as Phantom or MetaMask. This identification is a compatibility check, not a security boundary.</li>
				<li><strong>Cost transparency.</strong> Before each upload, Stacker Box shows an estimated cost so you know what you'll pay before approving any transaction.</li>
				<li><strong>Content verification.</strong> A SHA-256 hash of every uploaded layer is stored, enabling integrity checks when loading from Arweave.</li>
				<li><strong>HTML exports are sandboxed.</strong> HTML layers in exported compositions run in sandboxed frames with scripts disabled.</li>
			</ul>
		</div>
	</div>
</div>

<style>
	.about-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.about-panel {
		width: min(580px, 90vw);
		height: min(720px, 80vh);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
	}
	.about-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.about-header h2 {
		font-size: 16px;
		font-weight: 600;
		margin: 0;
	}
	.about-close {
		padding: var(--space-1);
		color: var(--color-text-muted);
		border-radius: var(--radius-sm);
	}
	.about-close:hover {
		background: var(--color-bg);
		color: var(--color-text);
	}
	.about-body {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-4) var(--space-5);
		font-size: 14px;
		line-height: 1.7;
		color: var(--color-text);
	}
	.about-body h3 {
		font-size: 15px;
		font-weight: 600;
		margin: var(--space-4) 0 var(--space-2);
	}
	.about-body h4 {
		font-size: 14px;
		font-weight: 600;
		margin: var(--space-3) 0 var(--space-1);
	}
	.about-body ul {
		margin: 0 0 var(--space-3);
		padding-left: var(--space-5);
	}
	.about-body li {
		margin-bottom: var(--space-1);
	}
	.about-body code {
		font-size: 13px;
		background: var(--color-bg);
		padding: 1px 4px;
		border-radius: 3px;
	}
</style>