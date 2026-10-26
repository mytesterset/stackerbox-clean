import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const nonce = crypto.randomUUID().replace(/-/g, '');

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => {
			return html.replace(
				/(<script)((?![^>]*\bsrc=)[^>]*)>/g,
				`$1 nonce="${nonce}"$2>`
			);
		}
	});

	const CSP = [
		"default-src 'self'",
		`script-src 'self' 'nonce-${nonce}' https://analytics.eusy.io`,
		"connect-src 'self' https://*.arweave.net https://*.ar-io.dev https://*.permagate.io https://*.perma.online https://*.ardrive.io https://*.ardrive.net https://*.ar-io.net https://mainnet.base.org https://solana-mainnet.rpc.extrnode.com https://api.mainnet-beta.solana.com",
		"img-src 'self' blob: data: https://*.arweave.net https://*.ar-io.dev https://*.permagate.io https://*.perma.online",
		"frame-src blob: https://*.arweave.net https://*.ar-io.dev https://*.permagate.io https://*.perma.online",
		"frame-ancestors 'self'",
		"style-src 'self' 'unsafe-inline'",
		"base-uri 'self'",
		"form-action 'self'",
		"object-src 'none'"
	].join('; ');

	response.headers.set('Content-Security-Policy', CSP);
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

	return response;
};