import { describe, expect, it, vi } from 'vitest';
import { createFramePageFabs } from '../../../src/components/frame/framePages';
import type { VaultmanPlugin } from '../../../src/main';

describe('createFramePageFabs', () => {
	it('turns the filters FAB into an import-mode exit action', () => {
		const exitBasesImportMode = vi.fn();
		const fabs = createFramePageFabs({ app: {} } as VaultmanPlugin, vi.fn(), vi.fn(), {
			filtersBaseChooseMode: true,
			exitBasesImportMode,
		});

		expect(fabs.filters.right).toEqual(
			expect.objectContaining({
				icon: 'lucide-x',
				label: 'Exit Bases import',
			}),
		);

		fabs.filters.right?.action();

		expect(exitBasesImportMode).toHaveBeenCalledOnce();
	});
});
