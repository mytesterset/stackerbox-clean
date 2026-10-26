<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { walletStore } from '$lib/arweave/wallet.svelte';
	import { galleryStore } from '$lib/stores/arweave-gallery.svelte';
	import { consentStore } from '$lib/arweave/consent.svelte';
	import { buildAssetList } from './generate-export';
	import { createClient, uploadAssets, uploadHtml, uploadComposition, gatewayUrls, arweaveUrl, fetchLiveGateways, fetchTurboBalance, ensureBaseChain } from '$lib/arweave/turbo';
	import type { TurboBalance } from '$lib/arweave/turbo';
	import { generateArweaveIndexHtml, generateSharedCompositionJson } from '$lib/arweave/generate-arweave-html';
	import type { ArweaveLayerRef } from '$lib/arweave/generate-arweave-html';
	import phantomLogo from '$lib/assets/phantomwalletlogo.png';
	import metamaskLogo from '$lib/assets/metamaskwalletlogo.png';

	type Phase = 'idle' | 'ready' | 'uploading' | 'done' | 'error';

	let phase = $state<Phase>('idle');
	let progressDone = $state(0);
	let progressTotal = $state(0);
	let message = $state('');
	let htmlResult = $state('');
	let artworkTxId = $state('');
	let layerTxIds = $state<string[]>([]);
	let uploadingHtml = $state(false);
	let showResult = $state(false);
	let showWalletPicker = $state(false);
	let showConsent = $state(false);
	let termsCheckbox = $state(false);
	let showTerms = $state(false);
	let compositionTxId = $state('');
	let compositionHash = $state('');
	let sharingComposition = $state(false);
	let _composeJson = $state('');
	let estimatedCost = $state('');
	let showCostBreakdown = $state(false);
	let balance = $state<TurboBalance | null>(null);
	let balanceLoading = $state(false);

	const hasLayers = $derived(projectStore.project.layers.length > 0);
	const connected = $derived(walletStore.address !== null);
	const busy = $derived(walletStore.connecting || phase === 'uploading' || uploadingHtml);

	const availWallets = $derived(walletStore.hasWallets());

	$effect(() => {
		if (walletStore.address !== null && phase === 'idle') {
			phase = 'ready';
		}
	});

	$effect(() => {
		if (connected) galleryStore.load();
	});

	$effect(() => {
		if (connected && walletStore.chain) {
			loadBalance();
		} else {
			balance = null;
		}
	});

	async function loadBalance() {
		const c = walletStore.chain;
		if (!c) return;
		balanceLoading = true;
		try {
			balance = await fetchTurboBalance(c);
		} catch { balance = null; }
		finally { balanceLoading = false; }
	}

	function formatBytes(bytes: number): string {
		if (bytes <= 0) return '0 B';
		if (bytes < 1024) return `${bytes.toFixed(0)} B`;
		if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
		return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
	}

	function openWalletPicker() {
		if (!consentStore.hasAnyConsent()) {
			termsCheckbox = false;
			showConsent = true;
			return;
		}
		showWalletPicker = true;
	}

	function acceptConsent() {
		consentStore.giveConsent();
		showConsent = false;
		showWalletPicker = true;
	}

	async function handleConnectSolana() {
		showWalletPicker = false;
		await walletStore.connectSolana();
		await galleryStore.load();
	}

	async function handleConnectEthereum() {
		showWalletPicker = false;
		await walletStore.connectEthereum();
		await galleryStore.load();
	}

	async function computeCostEstimate() {
		const plain = projectStore.getPlainProject();
		const visibleLayers = plain.layers.filter((l) => l.visible && !l.arTxId);
		const chain = walletStore.chain;
		if (!chain) return;

		let totalBytes = 0;
		for (const layer of visibleLayers) {
			totalBytes += layer.blob.size;
		}

		try {
			if (!balance) await loadBalance();

			const client = await createClient(chain);
			const costs = await client.getUploadCosts({ bytes: [totalBytes] });
			if (costs && costs.length > 0 && costs[0].winc != null) {
				const costWinc = BigInt(costs[0].winc);
				const existingWinc = balance?.effectiveBalance ? BigInt(balance.effectiveBalance) : 0n;

				if (existingWinc >= costWinc) {
					handleUpload();
					return;
				}

				const shortfallWinc = costWinc - existingWinc;
				const amount = Number(shortfallWinc) / 1e12;
				const unit = chain === 'solana' ? 'SOL' : 'ETH';
				estimatedCost = `~${amount.toFixed(6)} ${unit} (${visibleLayers.length} layer${visibleLayers.length !== 1 ? 's' : ''}, ${(totalBytes / 1024).toFixed(1)} KB)`;
			} else {
				estimatedCost = `${visibleLayers.length} layer${visibleLayers.length !== 1 ? 's' : ''} (${(totalBytes / 1024).toFixed(1)} KB) — cost unavailable`;
			}
		} catch {
			estimatedCost = `${visibleLayers.length} layer${visibleLayers.length !== 1 ? 's' : ''} (${(totalBytes / 1024).toFixed(1)} KB) — cost unavailable`;
		}

		showCostBreakdown = true;
	}

	function confirmUpload() {
		showCostBreakdown = false;
		handleUpload();
	}

	async function handleUpload() {
		const c = walletStore.chain;
		if (!c || !walletStore.address) {
			message = 'Connect your wallet first';
			return;
		}
		const hasHtmlLayers = projectStore.project.layers.some((layer) => layer.visible && !layer.arTxId && layer.type === 'html');
		if (hasHtmlLayers && !window.confirm('HTML layers are permanently published as plain text and only run inside a sandboxed composition. Continue?')) return;

		phase = 'uploading';
		message = '';
		htmlResult = '';
		artworkTxId = '';
		layerTxIds = [];

		try {
			const plain = projectStore.getPlainProject();
			const { name, settings, visibleLayers, assets } = await buildAssetList(plain);

			if (c === 'ethereum') await ensureBaseChain();
			const client = await createClient(c);
			progressTotal = assets.length;
			progressDone = 0;

			const hashByLayer = new Map<string, string>();

			const results = await uploadAssets(
				client,
				assets,
				c,
				(done) => { progressDone = done; },
				(result, contentHash) => {
					if (contentHash) hashByLayer.set(result.layerId, contentHash);
					projectStore.updateLayer(result.layerId, { contentHash });
					const asset = assets.find((a) => a.layer.id === result.layerId);
					const blob = asset ? (asset.content instanceof Blob ? asset.content : undefined) : undefined;
					galleryStore.addItem(result.txId, result.fileName, result.mime, false, blob, contentHash);
				}
			);

			const txByLayer = new Map(results.map((r) => [r.layerId, r.txId]));
			const refs: ArweaveLayerRef[] = [];
			for (const layer of visibleLayers) {
				const txId = txByLayer.get(layer.id) || layer.arTxId;
				if (txId) refs.push({ layer, txId, contentHash: hashByLayer.get(layer.id) || layer.contentHash });
			}

			const gateways = await fetchLiveGateways();
			htmlResult = generateArweaveIndexHtml({ name, settings, layers: refs, gateways, htmlMeta: plain.htmlMeta });
			_composeJson = generateSharedCompositionJson({ name, settings, layers: refs, htmlMeta: plain.htmlMeta });
			layerTxIds = results.map((r) => r.txId);
			phase = 'done';
			showResult = true;
		} catch (e) {
			message = e instanceof Error ? e.message : 'Upload failed';
			phase = 'error';
		}
	}

	function handleDownload() {
		const slug = sanitizeFilename(projectStore.project.name) || 'stackerbox-arweave';
		const blob = new Blob([htmlResult], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${slug}.html`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function handleUploadHtml() {
		const c = walletStore.chain;
		if (!c) return;
		if (!window.confirm('This HTML composition will be permanently published on Arweave and can be opened as a web page. Continue?')) return;

		uploadingHtml = true;
		message = '';
		try {
			if (c === 'ethereum') await ensureBaseChain();
			const client = await createClient(c);
			artworkTxId = await uploadHtml(client, htmlResult, c);
			const artName = sanitizeFilename(projectStore.project.name) || 'artwork';
			await galleryStore.addItem(artworkTxId, `${artName}.html`, 'text/html', true);
		} catch (e) {
			message = e instanceof Error ? e.message : 'Failed to upload HTML';
		} finally {
			uploadingHtml = false;
		}
	}

	function sanitizeFilename(name: string): string {
		return name
			.replace(/[\\/:*?"<>|]+/g, '-')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 80);
	}

	async function handleShareComposition() {
		const c = walletStore.chain;
		if (!c || !_composeJson) return;

		sharingComposition = true;
		message = '';
		try {
			if (c === 'ethereum') await ensureBaseChain();
			const client = await createClient(c);
			const result = await uploadComposition(client, _composeJson, c);
			compositionTxId = result.txId;
			compositionHash = result.hash;
		} catch (e) {
			message = e instanceof Error ? e.message : 'Failed to share composition';
		} finally {
			sharingComposition = false;
		}
	}

	function copyShareLink() {
		const url = `${window.location.origin}/editor#${compositionTxId}:${compositionHash}`;
		navigator.clipboard.writeText(url).catch(() => {});
	}
</script>

<div class="arweave-wrapper">
	{#if !connected}
		<button class="arweave-btn" onclick={openWalletPicker} disabled={walletStore.connecting}>
			{#if walletStore.connecting}
				Connecting...
			{:else}
				Connect wallet
			{/if}
		</button>

		{#if showConsent}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="consent-backdrop" onclick={() => (showConsent = false)} onkeydown={(e) => e.key === 'Escape' && (showConsent = false)} role="dialog" aria-label="Arweave storage notice" tabindex="0">
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div class="consent-panel" onclick={(e) => e.stopPropagation()} role="document">
					{#if showTerms}
						<div class="consent-header">
							<button class="consent-back-link" onclick={() => (showTerms = false)}>&larr; Back</button>
							<h3>Terms of Use</h3>
						</div>
						<div class="consent-body consent-terms-body">
							<p class="consent-terms-updated">Last Updated: September 16, 2025</p>

							<p>StackerBox ("StackerBox," "the Tool," "we," "us," or "our") is a creator tool that allows artists to compose layered artworks, upload files to the Arweave network, and facilitate minting of Non-Fungible Tokens ("NFTs") to smart contracts controlled by the user. By accessing or using StackerBox at stackerbox.xyz, you agree to be bound by these Terms of Use ("Terms"). If you do not agree, do not use the Tool.</p>

							<h3>I. Experimental Technology</h3>
							<p>Blockchain networks, smart contracts, NFTs, and services such as Arweave are experimental technologies. They are subject to technical failures, bugs, security vulnerabilities, regulatory uncertainty, and risks that are not fully known or understood. StackerBox relies on public blockchain networks — including Ethereum Mainnet — and the Arweave permanent storage network, none of which are under our control.</p>
							<p>You acknowledge and agree that:</p>
							<ul>
								<li>Blockchain transactions, once confirmed, are irreversible. StackerBox has no ability to cancel, reverse, or modify any transaction you initiate.</li>
								<li>Gas fees are required to execute transactions on the Ethereum network. Gas fees are variable, unpredictable, and entirely outside our control. You are solely responsible for all gas fees associated with transactions you initiate, regardless of whether the transaction succeeds, fails, or reverts.</li>
								<li>Files and metadata uploaded to Arweave are permanent and immutable. Once uploaded, they cannot be deleted, modified, or retracted. You are solely responsible for reviewing all content before initiating an upload.</li>
								<li>Smart contracts you interact with through StackerBox — including those deployed by Transient Labs or Manifold — are subject to their own terms, risks, and potential vulnerabilities. StackerBox is not responsible for the behavior of third-party smart contracts.</li>
							</ul>

							<h3>II. StackerBox is Non-Custodial</h3>
							<p>StackerBox is a non-custodial tool. We do not:</p>
							<ul>
								<li>Take possession, custody, or control of your digital wallet, private keys, seed phrases, or passwords;</li>
								<li>Hold, transfer, or manage any of your NFTs, cryptocurrency, or other digital assets;</li>
								<li>Act as an intermediary, escrow agent, broker, or financial institution in any transaction you perform;</li>
								<li>Have the technical ability to initiate, approve, or reverse transactions on your behalf.</li>
							</ul>
							<p>All transactions are executed exclusively by your own digital wallet, as authorized by you, and settled by the relevant public blockchain network. StackerBox facilitates access to your own smart contracts and is not a party to any transaction you conduct.</p>

							<h3>III. Your Responsibility for Transactions</h3>
							<p>You are solely responsible for all transactions you initiate through StackerBox. This includes but is not limited to:</p>
							<ul>
								<li><strong>Metadata accuracy.</strong> The title, description, year, tags, preview image, and work file you submit form the NFT metadata. Once uploaded to Arweave and minted to the blockchain, this metadata is permanent. Review all fields carefully before confirming an upload or mint.</li>
								<li><strong>Royalty configuration.</strong> If you configure a custom royalty address and royalty percentage, you are solely responsible for ensuring that information is correct. StackerBox validates the format of the address and the range of the percentage, but cannot guarantee that the specified address is accessible, correct, or will receive royalties from any marketplace. Errors in royalty configuration are irreversible after minting.</li>
								<li><strong>Contract selection.</strong> You are responsible for selecting the correct smart contract to mint to. StackerBox displays contracts associated with your connected wallet, but you are responsible for verifying that the selected contract is the intended destination.</li>
								<li><strong>Recipient address.</strong> The NFT will be minted to the wallet address you connect to StackerBox. Verify your connected address before confirming any transaction.</li>
							</ul>
							<p>You hereby irrevocably consent to and agree to be bound by the outcome of any transaction initiated or approved by your digital wallet through StackerBox.</p>

							<h3>IV. Wallet Security</h3>
							<p>You are solely and exclusively responsible for the security of your digital wallet. StackerBox does not store, access, or have knowledge of your private keys, seed phrases, or passwords.</p>
							<p>You agree to:</p>
							<ul>
								<li>Maintain the security of your wallet and keep your private key and seed phrase strictly confidential;</li>
								<li>Be vigilant against phishing attempts, malicious browser extensions, and social engineering;</li>
								<li>Notify us immediately at [contact email] if you believe your wallet has been compromised in a way related to your use of StackerBox.</li>
							</ul>
							<p>StackerBox accepts no responsibility for, and disclaims all liability in connection with, any breach of your wallet's security, any unauthorized access to your wallet, or any loss of funds or assets resulting therefrom.</p>

							<h3>V. Your Content and Intellectual Property</h3>
							<p>By uploading files or metadata through StackerBox, you represent and warrant that:</p>
							<ul>
								<li>You are the original creator of the content, or you have all necessary rights, licenses, and permissions to upload, publish, and mint the content as an NFT;</li>
								<li>The content does not infringe any intellectual property rights, privacy rights, or other legal rights of any third party;</li>
								<li>The content does not violate any applicable law or regulation.</li>
							</ul>
							<p>StackerBox does not claim ownership of your content. We do not review, pre-screen, or endorse content uploaded or minted through the Tool. You are solely responsible for all content you submit, and for any legal claims, disputes, or damages arising from that content.</p>
							<p>If you believe that content minted through StackerBox infringes your intellectual property rights, please contact us at [contact email].</p>

							<h3>VI. No Legal, Financial, or Tax Advice</h3>
							<p>Nothing in StackerBox or these Terms constitutes legal advice, financial advice, investment advice, or tax advice. We do not represent that minting, holding, or selling NFTs has any particular financial value or outcome.</p>
							<p>You are solely responsible for:</p>
							<ul>
								<li>Determining what taxes, if any, apply to your transactions and complying with your obligations to relevant tax authorities;</li>
								<li>Understanding the legal implications of minting and selling NFTs in your jurisdiction;</li>
								<li>Making your own independent assessment of any risks associated with your use of the Tool.</li>
							</ul>

							<h3>VII. Third-Party Services</h3>
							<p>StackerBox integrates with third-party services including Arweave (via the Turbo SDK by AR.IO), the Etherscan API, and smart contracts deployed by Transient Labs and Manifold. These services are subject to their own terms and conditions and are entirely outside our control.</p>
							<p>StackerBox is not responsible for:</p>
							<ul>
								<li>The availability, reliability, or accuracy of any third-party service;</li>
								<li>Changes to third-party APIs, smart contracts, or pricing that affect the Tool;</li>
								<li>Any loss or damage resulting from the failure or malfunction of a third-party service.</li>
							</ul>
							<p>We provide links to and integration with third-party services solely for your convenience. Your use of those services is at your own risk and subject to their respective terms.</p>

							<h3>VIII. Disclaimer of Warranties</h3>
							<p>StackerBox is provided "as is" and "as available", without warranty of any kind, express or implied. To the fullest extent permitted by applicable law, we disclaim all warranties, including but not limited to:</p>
							<ul>
								<li>Warranties of merchantability, fitness for a particular purpose, or non-infringement;</li>
								<li>Warranties that the Tool will be available without interruption, error, or data loss;</li>
								<li>Warranties that transactions facilitated through the Tool will succeed or produce the intended result;</li>
								<li>Warranties regarding the accuracy or completeness of any information provided through the Tool.</li>
							</ul>

							<h3>IX. Limitation of Liability</h3>
							<p>To the fullest extent permitted by applicable law, StackerBox and its operator shall not be liable to you or any third party for any:</p>
							<ul>
								<li>Lost gas fees, failed or reverted transactions, or any costs arising from your use of the Ethereum network or Arweave;</li>
								<li>Loss of NFTs, digital assets, or cryptocurrency;</li>
								<li>Permanent loss of data resulting from Arweave uploads you initiated;</li>
								<li>Errors in metadata, royalty configurations, or contract selections made by you;</li>
								<li>Indirect, incidental, consequential, or punitive damages of any kind.</li>
							</ul>
							<p>Your use of StackerBox is entirely at your own risk.</p>

							<h3>X. Prohibited Use</h3>
							<p>You agree not to use StackerBox to:</p>
							<ul>
								<li>Mint content that infringes the intellectual property or other rights of any third party;</li>
								<li>Upload or mint unlawful, fraudulent, harassing, or otherwise objectionable content;</li>
								<li>Attempt to compromise, exploit, or interfere with the Tool, its infrastructure, or any connected smart contracts or blockchain networks;</li>
								<li>Use the Tool for any purpose that violates applicable laws or regulations in your jurisdiction.</li>
							</ul>

							<h3>XI. Changes to These Terms</h3>
							<p>We may update these Terms from time to time. Changes will be effective upon posting the updated Terms on this page with a revised "Last Updated" date. Your continued use of StackerBox after changes are posted constitutes your acceptance of the revised Terms.</p>

							<h3>XII. Contact</h3>
							<p>For questions about these Terms, or to report a concern, contact www.rutgervandertas.com</p>
							<p>These Terms do not constitute legal advice. If you are uncertain about your legal obligations in connection with minting or selling NFTs, you should consult a qualified legal professional.</p>
						</div>
					{:else}
						<div class="consent-header">
							<h3>Arweave is permanent</h3>
						</div>
						<div class="consent-body">
							<p>Everything you upload to Arweave is <strong>permanently and publicly stored</strong> on a decentralized blockchain. Once uploaded, it <strong>cannot be deleted or modified</strong> by anyone.</p>
							<p>Do not upload private, sensitive, or personal data. By proceeding, you confirm that all content you upload is intended for permanent public distribution.</p>
							<label class="consent-checkbox-label">
								<input type="checkbox" class="consent-checkbox" bind:checked={termsCheckbox} />
								<span>Did you read the <button type="button" class="consent-terms-link" onclick={() => (showTerms = true)}>Terms of Use</button>?</span>
							</label>
						</div>
						<div class="consent-actions">
							<button class="consent-btn consent-btn-cancel" onclick={() => (showConsent = false)}>Cancel</button>
							<button class="consent-btn consent-btn-accept" onclick={acceptConsent} disabled={!termsCheckbox}>I understand, proceed</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		{#if showWalletPicker}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="wallet-picker-backdrop" onclick={() => (showWalletPicker = false)} onkeydown={(e) => e.key === 'Escape' && (showWalletPicker = false)} role="dialog" aria-label="Choose wallet" tabindex="0">
				<div class="wallet-picker-panel" onclick={(e) => e.stopPropagation()} role="document">
					<div class="wallet-picker-header">
						<h3>Connect wallet</h3>
						<button class="wallet-picker-close" onclick={() => (showWalletPicker = false)} aria-label="Close">&times;</button>
					</div>
					<div class="wallet-picker-body">
						{#if availWallets.solana}
							<button class="wallet-picker-item" onclick={handleConnectSolana}>
								<img class="wallet-picker-logo" src={phantomLogo} alt="" />
								<span class="wallet-picker-label">Phantom</span>
							</button>
						{/if}
						{#if availWallets.ethereum}
							<button class="wallet-picker-item" onclick={handleConnectEthereum}>
								<img class="wallet-picker-logo" src={metamaskLogo} alt="" />
								<span class="wallet-picker-label">MetaMask</span>
							</button>
						{/if}
						{#if !availWallets.solana && !availWallets.ethereum}
							<p class="wallet-picker-empty">No wallet detected. Install Phantom or MetaMask.</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{:else}
		{#if phase === 'done'}
			<button class="arweave-btn" onclick={() => (showResult = true)}>
				View result
			</button>
		{:else}
			<button
				class="arweave-btn"
				onclick={computeCostEstimate}
				disabled={busy || !hasLayers}
			>
				{#if phase === 'uploading'}
					Uploading {progressDone}/{progressTotal}...
				{:else}
					Upload to Arweave
				{/if}
			</button>
		{/if}

		<a class="arweave-btn arweave-btn-secondary arweave-gallery-link" href="/arweave">
			Gallery
		</a>
	{/if}

	{#if connected}
		<div class="arweave-wallet-info">
			<span>{walletStore.chain === 'solana' ? 'Solana' : 'ETH'} · {walletStore.address!.slice(0, 6)}…</span>
			{#if balance && !balanceLoading}
				<span class="arweave-balance" title={`${balance.effectiveBalance} winc`}>{formatBytes(balance.bytesRemaining)}</span>
			{/if}
		</div>
	{/if}

	{#if message}
		<span class="arweave-error">{message}</span>
	{/if}

	{#if walletStore.error && !connected}
		<span class="arweave-error">{walletStore.error}</span>
	{/if}
</div>

{#if showCostBreakdown}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="consent-backdrop" onclick={() => (showCostBreakdown = false)} onkeydown={(e) => e.key === 'Escape' && (showCostBreakdown = false)} role="dialog" aria-label="Cost estimate" tabindex="0">
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div class="consent-panel" onclick={(e) => e.stopPropagation()} role="document">
			<div class="consent-header">
				<h3>Insufficient credits</h3>
			</div>
			<div class="consent-body">
				<p>Additional Turbo credits needed: <strong>{estimatedCost}</strong></p>
				{#if balance}
					<p class="cost-note">Your balance: <strong>{formatBytes(balance.bytesRemaining)}</strong> remaining. This is not enough to cover the upload. You will be asked to approve a funding transaction in your wallet.</p>
				{:else}
					<p class="cost-note">You will be asked to approve each funding transaction in your wallet.</p>
				{/if}
			</div>
			<div class="consent-actions">
				<button class="consent-btn consent-btn-cancel" onclick={() => (showCostBreakdown = false)}>Cancel</button>
				<button class="consent-btn consent-btn-accept" onclick={confirmUpload}>Upload</button>
			</div>
		</div>
	</div>
{/if}

{#if showResult}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div class="dialog-backdrop" onclick={() => (showResult = false)} onkeydown={(e) => e.key === 'Escape' && (showResult = false)} role="dialog" aria-label="Upload result" tabindex="0">
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div class="dialog-panel" onclick={(e) => e.stopPropagation()} role="document">
			<div class="dialog-header">
				<h2 class="dialog-title">Upload result</h2>
				<button class="dialog-close" onclick={() => (showResult = false)} aria-label="Close">&times;</button>
			</div>

			<div class="dialog-body">
				<span class="arweave-done">Uploaded {progressTotal} layer{progressTotal === 1 ? '' : 's'}</span>

				{#if layerTxIds.length > 0}
					<div class="arweave-tx-list">
						{#each layerTxIds as txId}
							<a class="arweave-tx" href={gatewayUrls(txId)[0]} target="_blank" rel="noreferrer">
								{arweaveUrl(txId)}
							</a>
						{/each}
					</div>
				{/if}

				<div class="dialog-actions">
					<button class="arweave-btn" onclick={handleDownload}>
						Download .html
					</button>
					<button class="arweave-btn arweave-btn-secondary" onclick={handleUploadHtml} disabled={uploadingHtml}>
						{#if uploadingHtml}
							Uploading HTML...
						{:else if artworkTxId}
							HTML: {arweaveUrl(artworkTxId)}
						{:else}
							Upload HTML to Arweave
						{/if}
					</button>
				</div>

				<div class="dialog-actions" style="margin-top: var(--space-2);">
					{#if compositionTxId && compositionHash}
						<button class="arweave-btn arweave-btn-secondary" onclick={copyShareLink}>
							Copy share link
						</button>
						<span class="arweave-share-link">{window.location.origin}/editor#{compositionTxId}:{compositionHash}</span>
					{:else}
						<button class="arweave-btn arweave-btn-secondary" onclick={handleShareComposition} disabled={sharingComposition}>
							{#if sharingComposition}
								Sharing...
							{:else}
								Share composition
							{/if}
						</button>
					{/if}
				</div>

				{#if message}
					<span class="arweave-error">{message}</span>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.arweave-wrapper {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.arweave-btn {
		padding: var(--space-2) var(--space-4);
		background: var(--color-accent);
		color: white;
		border-radius: var(--radius-sm);
		font-size: 14px;
		font-weight: 500;
		white-space: nowrap;
	}
	.arweave-btn:hover:not(:disabled) {
		background: var(--color-accent-hover);
	}
	.arweave-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.arweave-btn-secondary {
		background: transparent;
		color: var(--color-accent);
		border: 1px solid var(--color-accent);
	}
	.arweave-btn-secondary:hover:not(:disabled) {
		background: var(--color-bg);
	}
	.arweave-gallery-link {
		text-decoration: none;
	}
	.arweave-done {
		display: block;
		font-size: 13px;
		color: #16a34a;
		margin-bottom: var(--space-3);
	}
	.arweave-tx-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 200px;
		overflow-y: auto;
		margin-bottom: var(--space-4);
	}
	.arweave-tx {
		font-size: 12px;
		color: var(--color-text-muted);
		text-decoration: none;
		white-space: nowrap;
		font-family: monospace;
	}
	.arweave-tx:hover {
		color: var(--color-accent);
		text-decoration: underline;
	}
	.arweave-error {
		font-size: 11px;
		color: var(--color-danger);
	}
	.arweave-share-link {
		font-size: 11px;
		color: var(--color-text-muted);
		word-break: break-all;
		line-height: 1.4;
	}

	.consent-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.consent-panel {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		width: min(420px, 90vw);
		overflow: hidden;
	}
	.consent-header {
		display: flex;
		align-items: center;
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--color-border);
	}
	.consent-header h3 {
		font-size: 15px;
		font-weight: 600;
		color: #dc2626;
		margin: 0;
	}
	.consent-body {
		padding: var(--space-4) var(--space-5);
		font-size: 13px;
		line-height: 1.6;
		color: var(--color-text);
	}
	.consent-body p {
		margin: 0 0 var(--space-2);
	}
	.consent-body p:last-child {
		margin: 0;
	}
	.consent-checkbox-label {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		font-size: 13px;
		line-height: 1.5;
		cursor: pointer;
		margin-top: var(--space-3);
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg);
	}
	.consent-checkbox {
		width: 15px;
		height: 15px;
		margin-top: 2px;
		accent-color: var(--color-accent);
		cursor: pointer;
		flex-shrink: 0;
	}
	.consent-terms-link {
		background: none;
		border: none;
		color: var(--color-accent);
		text-decoration: underline;
		cursor: pointer;
		font-size: 13px;
		padding: 0;
		font-family: inherit;
	}
	.consent-terms-link:hover {
		color: var(--color-accent-hover);
	}
	.consent-btn-accept:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.consent-back-link {
		background: none;
		border: none;
		color: var(--color-accent);
		font-size: 13px;
		cursor: pointer;
		padding: 0;
		margin-right: var(--space-4);
		font-family: inherit;
	}
	.consent-back-link:hover {
		text-decoration: underline;
	}
	.consent-header .consent-back-link + h3 {
		margin: 0;
	}
	.consent-terms-body {
		max-height: 55vh;
		overflow-y: auto;
	}
	.consent-terms-body h3 {
		font-size: 14px;
		font-weight: 600;
		margin: var(--space-3) 0 var(--space-1);
	}
	.consent-terms-body ul {
		margin: 0 0 var(--space-2);
		padding-left: var(--space-4);
	}
	.consent-terms-body li {
		margin-bottom: var(--space-1);
	}
	.consent-terms-updated {
		color: var(--color-text-muted);
		font-size: 12px;
		font-style: italic;
		margin-bottom: var(--space-3);
	}
	.cost-note {
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.consent-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-5);
		border-top: 1px solid var(--color-border);
	}
	.consent-btn {
		padding: var(--space-2) var(--space-5);
		border-radius: var(--radius-sm);
		font-size: 13px;
		font-weight: 500;
	}
	.consent-btn-cancel {
		background: transparent;
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
	}
	.consent-btn-cancel:hover {
		background: var(--color-bg);
	}
	.consent-btn-accept {
		background: var(--color-accent);
		color: white;
	}
	.consent-btn-accept:hover {
		background: var(--color-accent-hover);
	}

	.dialog-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(0, 0, 0, 0.35);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.dialog-panel {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		width: min(400px, 90vw);
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.dialog-title {
		font-size: 15px;
		font-weight: 600;
	}
	.dialog-close {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		font-size: 18px;
		color: var(--color-text-muted);
	}
	.dialog-close:hover {
		background: var(--color-bg);
	}
	.dialog-body {
		padding: var(--space-4) var(--space-5);
		overflow-y: auto;
		flex: 1;
	}
	.dialog-actions {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}
	.arweave-wallet-info {
		font-size: 11px;
		color: var(--color-text-muted);
		font-family: monospace;
		white-space: nowrap;
		display: flex;
		flex-direction: column;
		gap: 2px;
		align-items: flex-end;
	}
	.arweave-balance {
		font-size: 10px;
		color: var(--color-accent);
	}

	.wallet-picker-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(0, 0, 0, 0.35);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.wallet-picker-panel {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		width: min(360px, 90vw);
		overflow: hidden;
	}
	.wallet-picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--color-border);
	}
	.wallet-picker-header h3 {
		font-size: 14px;
		font-weight: 600;
	}
	.wallet-picker-close {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		font-size: 18px;
		color: var(--color-text-muted);
	}
	.wallet-picker-close:hover {
		background: var(--color-bg);
	}
	.wallet-picker-body {
		padding: var(--space-2);
	}
	.wallet-picker-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-3) var(--space-4);
		border: none;
		background: none;
		font: inherit;
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
	}
	.wallet-picker-item:hover {
		background: var(--color-bg);
	}
	.wallet-picker-logo {
		width: 28px;
		height: 28px;
		object-fit: contain;
		flex-shrink: 0;
	}
	.wallet-picker-label {
		font-size: 14px;
		font-weight: 500;
	}
	.wallet-picker-empty {
		padding: var(--space-4);
		font-size: 13px;
		color: var(--color-text-muted);
		text-align: center;
	}
</style>