import { describe, expect, it, vi } from 'vitest';
import type { AssetItem } from '../components/export/generate-export';
import { allocateUploadBudgets, uploadAssets } from './turbo';
import type { TurboClient } from './turbo';

describe('allocateUploadBudgets', () => {
	it('allocates the batch cap proportionally to asset size', () => {
		expect(allocateUploadBudgets(100n, [1, 3])).toEqual([25n, 75n]);
	});

	it('assigns integer rounding remainder without exceeding the cap', () => {
		const budgets = allocateUploadBudgets(10n, [1, 1, 1]);

		expect(budgets).toEqual([3n, 3n, 4n]);
		expect(budgets.reduce((sum, budget) => sum + budget, 0n)).toBe(10n);
	});

	it('splits the cap evenly when all assets are empty', () => {
		expect(allocateUploadBudgets(10n, [0, 0, 0])).toEqual([3n, 3n, 4n]);
	});

	it('returns no budgets for an empty batch', () => {
		expect(allocateUploadBudgets(10n, [])).toEqual([]);
	});

	it('rejects invalid asset sizes', () => {
		expect(() => allocateUploadBudgets(10n, [1, -1])).toThrow();
		expect(() => allocateUploadBudgets(10n, [Number.MAX_SAFE_INTEGER + 1])).toThrow();
	});

	it('passes SDK-compatible per-asset caps that sum to the batch maximum', async () => {
		const budgets: string[] = [];
		let nextId = 0;
		const client = {
			upload: vi.fn(async ({ fundingMode }: { fundingMode: { maxTokenAmount: { toFixed(): string } } }) => {
				budgets.push(fundingMode.maxTokenAmount.toFixed());
				return { id: `tx-${++nextId}` };
			})
		} as unknown as TurboClient;
		const assets: AssetItem[] = [1, 3].map((size, index) => ({
			fileName: `layer-${index}.png`,
			mime: 'image/png',
			content: new Blob([new Uint8Array(size)]),
			layer: { id: `layer-${index}`, type: 'png' } as AssetItem['layer']
		}));

		await uploadAssets(client, assets, 'ethereum');

		expect(budgets.map(BigInt)).toEqual([1_250_000_000_000_000n, 3_750_000_000_000_000n]);
		expect(budgets.map(BigInt).reduce((sum, amount) => sum + amount, 0n)).toBe(5_000_000_000_000_000n);
	});
});