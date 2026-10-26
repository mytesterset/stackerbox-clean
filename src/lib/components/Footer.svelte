<script lang="ts">
	const year = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="footer-row">
		<span>&copy; {year} by</span>
		<a class="link" href="https://rutgervandertas.com" target="_blank" rel="noreferrer">Rutger van der Tas</a>
	</div>
	<div class="footer-row footer-gdpr">
		No cookies. No tracking. Fonts are self-hosted. Analytics via Umami (anonymized, no personal data).
	</div>
</footer>

<style>
	.footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-4);
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
		font-size: 12px;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.footer-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.footer-gdpr {
		font-size: 11px;
		color: var(--color-text-muted);
	}
	.link {
		color: var(--color-text-muted);
		text-decoration: none;
		font-weight: 500;
	}
	.link:hover {
		color: var(--color-accent);
		text-decoration: underline;
	}
</style>
