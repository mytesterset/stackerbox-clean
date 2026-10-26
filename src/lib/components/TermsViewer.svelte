<script lang="ts">
	let { onClose }: { onClose: () => void } = $props();
</script>

<div class="terms-backdrop" onclick={onClose} role="presentation">
	<div class="terms-panel" onclick={(e) => e.stopPropagation()} role="dialog">
		<div class="terms-header">
			<h2>Terms of Use — StackerBox</h2>
			<button class="terms-close" onclick={onClose} aria-label="Close">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>
		</div>
		<div class="terms-body">
			<p class="terms-updated">Last Updated: September 16, 2025</p>

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
	</div>
</div>

<style>
	.terms-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.terms-panel {
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
	.terms-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.terms-header h2 {
		font-size: 16px;
		font-weight: 600;
		margin: 0;
	}
	.terms-close {
		padding: var(--space-1);
		color: var(--color-text-muted);
		border-radius: var(--radius-sm);
	}
	.terms-close:hover {
		background: var(--color-bg);
		color: var(--color-text);
	}
	.terms-body {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-4) var(--space-5);
		font-size: 14px;
		line-height: 1.7;
		color: var(--color-text);
	}
	.terms-updated {
		color: var(--color-text-muted);
		font-size: 13px;
		margin-bottom: var(--space-4);
		font-style: italic;
	}
	.terms-body h3 {
		font-size: 15px;
		font-weight: 600;
		margin: var(--space-4) 0 var(--space-2);
	}
	.terms-body ul {
		margin: 0 0 var(--space-3);
		padding-left: var(--space-5);
	}
	.terms-body li {
		margin-bottom: var(--space-1);
	}
</style>