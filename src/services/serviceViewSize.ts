export const VIEW_SIZE_PRESET_IDS = ['small', 'medium', 'large', 'extra-large'] as const;

export type ViewSizePresetId = (typeof VIEW_SIZE_PRESET_IDS)[number];

export interface ViewSizePreset {
	id: ViewSizePresetId;
	tileWidth: number;
	tileHeight: number;
	iconSize: number;
	labelLineClamp: number;
	gap: number;
	treeRowHeight: number;
	treeIconSize: number;
	treeToggleSize: number;
}

export const DEFAULT_VIEW_SIZE_PRESET: ViewSizePresetId = 'medium';

const VIEW_SIZE_PRESETS: Record<ViewSizePresetId, ViewSizePreset> = {
	small: {
		id: 'small',
		tileWidth: 96,
		tileHeight: 64,
		iconSize: 16,
		labelLineClamp: 1,
		gap: 8,
		treeRowHeight: 28,
		treeIconSize: 16,
		treeToggleSize: 20,
	},
	medium: {
		id: 'medium',
		tileWidth: 128,
		tileHeight: 72,
		iconSize: 24,
		labelLineClamp: 1,
		gap: 8,
		treeRowHeight: 28,
		treeIconSize: 16,
		treeToggleSize: 20,
	},
	large: {
		id: 'large',
		tileWidth: 168,
		tileHeight: 96,
		iconSize: 32,
		labelLineClamp: 2,
		gap: 10,
		treeRowHeight: 32,
		treeIconSize: 18,
		treeToggleSize: 20,
	},
	'extra-large': {
		id: 'extra-large',
		tileWidth: 224,
		tileHeight: 132,
		iconSize: 48,
		labelLineClamp: 2,
		gap: 12,
		treeRowHeight: 36,
		treeIconSize: 20,
		treeToggleSize: 22,
	},
};

export function getViewSizePreset(id: ViewSizePresetId = DEFAULT_VIEW_SIZE_PRESET): ViewSizePreset {
	const preset = VIEW_SIZE_PRESETS[isViewSizePresetId(id) ? id : DEFAULT_VIEW_SIZE_PRESET];
	return { ...preset };
}

export function viewSizeCssVars(preset: ViewSizePreset): string {
	return [
		`--vm-node-grid-tile-w: ${preset.tileWidth}px`,
		`--vm-node-grid-tile-h: ${preset.tileHeight}px`,
		`--vm-node-grid-icon-size: ${preset.iconSize}px`,
		`--vm-node-grid-label-lines: ${preset.labelLineClamp}`,
		`--vm-node-grid-gap: ${preset.gap}px`,
		`--vm-tree-row-h: ${preset.treeRowHeight}px`,
		`--vm-tree-icon-size: ${preset.treeIconSize}px`,
		`--vm-tree-toggle-size: ${preset.treeToggleSize}px`,
	].join('; ');
}

function isViewSizePresetId(value: unknown): value is ViewSizePresetId {
	return typeof value === 'string' && VIEW_SIZE_PRESET_IDS.includes(value as ViewSizePresetId);
}
