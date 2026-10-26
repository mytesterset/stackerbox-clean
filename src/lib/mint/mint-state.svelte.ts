import type { TlContract } from './discovery';

export type MintStep = 'connect' | 'discovery' | 'metadata' | 'review' | 'minting' | 'success';

export const mintState = $state({
	step: 'discovery' as MintStep,
	error: null as string | null,
	selectedContract: null as TlContract | null,
	workTxId: null as string | null,
	title: '',
	year: '',
	description: '',
	tags: '',
	editionAmount: '',
	previewFile: null as File | null,
	previewTxId: null as string | null,
	metadataTxId: null as string | null,
	uri: null as string | null,
	mintTxHash: null as string | null,
	mintTokenId: null as bigint | null,
	isUploading: false,
	uploadProgress: '',
	showRoyalty: false,
	royaltyAddress: '',
	royaltyPercent: '',
	royaltyBasis: 10000n,

	get isFormValid(): boolean {
		return (
			this.title.trim().length > 0 &&
			this.title.length <= 200 &&
			this.description.length <= 2000 &&
			this.year.length > 0 &&
			/^\d{4}$/.test(this.year) &&
			this.previewFile !== null &&
			this.workTxId !== null
		);
	}
});

export function resetMintState() {
	mintState.step = 'discovery';
	mintState.error = null;
	mintState.selectedContract = null;
	mintState.workTxId = null;
	mintState.title = '';
	mintState.year = '';
	mintState.description = '';
	mintState.tags = '';
	mintState.editionAmount = '';
	mintState.previewFile = null;
	mintState.previewTxId = null;
	mintState.metadataTxId = null;
	mintState.uri = null;
	mintState.mintTxHash = null;
	mintState.mintTokenId = null;
	mintState.isUploading = false;
	mintState.uploadProgress = '';
	mintState.showRoyalty = false;
	mintState.royaltyAddress = '';
	mintState.royaltyPercent = '';
}