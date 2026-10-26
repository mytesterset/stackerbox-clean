function formatFromMime(mime: string): string {
	const subtype = mime.split('/')[1];
	if (!subtype) return mime.toUpperCase();
	if (subtype === 'html') return 'HTML';
	return subtype.toUpperCase();
}

export function buildMetadataJson(params: {
	title: string;
	description: string;
	previewTxId: string;
	workTxId: string;
	year: string;
	tags: string[];
	previewMimeType?: string;
	workMimeType?: string;
	contractAddress?: string;
	previewSha256?: string;
	previewBytes?: number;
	animationSha256?: string;
	animationBytes?: number;
}): string {
	const hasAnimationDetails = params.animationSha256 || params.animationBytes != null;
	const hasImageDetails = params.previewSha256 || params.previewBytes != null;

	return JSON.stringify({
		name: params.title,
		description: params.description,
		image: `https://arweave.net/${params.previewTxId}`,
		image_uris: [
			`ar://${params.previewTxId}`,
			`https://arweave.net/${params.previewTxId}`,
			`https://ar-io.net/${params.previewTxId}`
		],
		animation_url: `https://arweave.net/${params.workTxId}`,
		animation_uris: [
			`ar://${params.workTxId}`,
			`https://arweave.net/${params.workTxId}`,
			`https://ar-io.net/${params.workTxId}`
		],
		external_url: `https://arweave.net/${params.workTxId}`,
		attributes: [
			{ trait_type: 'Year', value: params.year },
			...(params.tags.length > 0
				? [{ trait_type: 'Tags', value: params.tags.join(', ') }]
				: [])
		],
		...(hasAnimationDetails
			? {
					animation_details: {
						...(params.animationBytes != null ? { bytes: params.animationBytes } : {}),
						format: formatFromMime(params.workMimeType || 'text/html'),
						...(params.animationSha256 ? { sha256: params.animationSha256 } : {})
					}
				}
			: {}),
		...(hasImageDetails
			? {
					image_details: {
						...(params.previewBytes != null ? { bytes: params.previewBytes } : {}),
						format: formatFromMime(params.previewMimeType || 'image/png'),
						...(params.previewSha256 ? { sha256: params.previewSha256 } : {})
					}
				}
			: {}),
		checksums: {
			...(params.previewSha256
				? { preview: { sha256: params.previewSha256, algorithm: 'sha-256' } }
				: {}),
			...(params.animationSha256
				? { animation: { sha256: params.animationSha256, algorithm: 'sha-256' } }
				: {})
		},
		provenance: {
			source_platform: 'StackerBox',
			archived_at: new Date().toISOString(),
			...(params.contractAddress ? { original_contract: params.contractAddress } : {})
		}
	});
}