import { describe, expect, it, vi } from 'vitest';
import { createFramePageFabs } from '../../../src/components/frame/framePages';
import type { VaultmanPlugin } from '../../../src/main';

describe('createFramePageFabs', () => {
	it('maps queue FAB secondary to process and tertiary to clear', () => {
		const queueService = {
			processAll: vi.fn(),
			clearAll: vi.fn(),
		};
		const fabs = createFramePageFabs(
			{ app: {}, queueService } as unknown as VaultmanPlugin,
			vi.fn(),
			vi.fn(),
		);

		fabs.ops.left?.onDoubleClick?.();
		fabs.ops.left?.onTertiaryClick?.();

		expect(queueService.processAll).toHaveBeenCalledOnce();
		expect(queueService.clearAll).toHaveBeenCalledOnce();
	});

	it('maps filters FAB secondary to clear and tertiary to Bases import', () => {
		const clearAll = vi.fn();
		const enterBasesImportMode = vi.fn();
		const fabs = createFramePageFabs(
			{
				app: {},
				queueService: { processAll: vi.fn(), clearAll: vi.fn() },
				filterService: { clearAll },
			} as unknown as VaultmanPlugin,
			vi.fn(),
			vi.fn(),
			{ enterBasesImportMode },
		);

		fabs.filters.right?.onDoubleClick?.();
		fabs.filters.right?.onTertiaryClick?.();

		expect(clearAll).toHaveBeenCalledOnce();
		expect(enterBasesImportMode).toHaveBeenCalledOnce();
	});

	it('turns the filters FAB into an import-mode exit action', () => {
		const exitBasesImportMode = vi.fn();
		const fabs = createFramePageFabs(
			{ app: {}, queueService: { processAll: vi.fn(), clearAll: vi.fn() } } as unknown as VaultmanPlugin,
			vi.fn(),
			vi.fn(),
			{
				filtersBaseChooseMode: true,
				exitBasesImportMode,
			},
		);

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
