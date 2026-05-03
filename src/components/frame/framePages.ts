import type { VaultmanPlugin } from '../../main';
import { translate } from '../../i18n/index';
import { openPluginSettings } from '../../types/obsidian-extended';
import type { FabDef } from '../../types/typePrimitives';

export type FramePageId = 'ops' | 'statistics' | 'filters';

const DEFAULT_PAGE_ORDER: FramePageId[] = ['ops', 'statistics', 'filters'];
const VALID_PAGES: readonly string[] = DEFAULT_PAGE_ORDER;

function isFramePageId(page: string): page is FramePageId {
	return VALID_PAGES.includes(page);
}

export function resolveFramePageOrder(order: unknown): FramePageId[] {
	if (!Array.isArray(order)) return [...DEFAULT_PAGE_ORDER];
	const pages = order.filter((page: unknown): page is string => typeof page === 'string');
	if (
		pages.length === order.length &&
		pages.length === DEFAULT_PAGE_ORDER.length &&
		DEFAULT_PAGE_ORDER.every((page) => pages.includes(page))
	) {
		return pages.filter(isFramePageId);
	}
	return [...DEFAULT_PAGE_ORDER];
}

export function createFramePageLabels(): Record<FramePageId, string> {
	return {
		statistics: translate('nav.statistics'),
		filters: translate('nav.filters'),
		ops: translate('nav.ops'),
	};
}

export function createFramePageIcons(): Record<FramePageId, string> {
	return {
		statistics: 'lucide-bar-chart-2',
		filters: 'lucide-filter',
		ops: 'lucide-settings-2',
	};
}

export function createFramePageFabs(
	plugin: VaultmanPlugin,
	toggleQueueIsland: () => void,
	toggleFiltersIsland: () => void,
): Record<FramePageId, { left: FabDef | null; right: FabDef | null }> {
	return {
		ops: {
			left: {
				icon: 'lucide-list-checks',
				label: translate('ops.queue'),
				action: toggleQueueIsland,
			},
			right: null,
		},
		statistics: {
			left: { icon: 'lucide-blocks', label: 'Add-ons', action: () => {} },
			right: {
				icon: 'lucide-settings',
				label: translate('nav.statistics') ?? 'Settings',
				action: () => {
					openPluginSettings(plugin.app, 'vaultman');
				},
			},
		},
		filters: {
			left: {
				icon: 'lucide-list-checks',
				label: translate('ops.queue'),
				action: toggleQueueIsland,
			},
			right: {
				icon: 'lucide-sparkles',
				label: translate('filters.active'),
				action: toggleFiltersIsland,
			},
		},
	};
}
