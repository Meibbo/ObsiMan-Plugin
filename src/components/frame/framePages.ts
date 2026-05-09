import type { VaultmanPlugin } from '../../main';
import { translate } from '../../index/i18n/lang';
import { openPluginSettings } from '../../types/typeObsidian';
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

export interface FramePageFabOptions {
	filtersBaseChooseMode?: boolean;
	enterBasesImportMode?: () => void;
	exitBasesImportMode?: () => void;
}

// TODO: esta función podría ser genérica
export function createFramePageFabs(
	plugin: VaultmanPlugin,
	toggleQueueIsland: () => void,
	toggleFiltersIsland: () => void,
	options: FramePageFabOptions = {},
): Record<FramePageId, { left: FabDef | null; right: FabDef | null }> {
	return {
		ops: {
			left: {
				icon: 'lucide-list-checks',
				label: translate('ops.queue'),
				action: toggleQueueIsland,
				onDoubleClick: () => void plugin.queueService.processAll(),
				onTertiaryClick: () => plugin.queueService.clearAll(),
				badgeKind: 'queue',
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
				onDoubleClick: () => void plugin.queueService.processAll(),
				onTertiaryClick: () => plugin.queueService.clearAll(),
				badgeKind: 'queue',
			},
			right: options.filtersBaseChooseMode
				? {
						icon: 'lucide-x',
						label: 'Exit Bases import',
						action: options.exitBasesImportMode ?? (() => {}),
					}
				: {
						icon: 'lucide-filters',
						label: translate('filters.active'),
						action: toggleFiltersIsland,
						onDoubleClick: () => plugin.filterService.clearAll(),
						onTertiaryClick: () => options.enterBasesImportMode?.(),
						badgeKind: 'filters',
					},
		},
	};
}
