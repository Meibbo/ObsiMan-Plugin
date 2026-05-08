import { describe, expect, it } from 'vitest';
import {
	DEFAULT_VIEW_SIZE_PRESET,
	VIEW_SIZE_PRESET_IDS,
	getViewSizePreset,
	viewSizeCssVars,
	type ViewSizePresetId,
} from '../../../src/services/serviceViewSize';

describe('serviceViewSize', () => {
	it('exposes Windows Explorer-style view size presets from small through extra-large', () => {
		expect(VIEW_SIZE_PRESET_IDS).toEqual(['small', 'medium', 'large', 'extra-large']);

		const presets = VIEW_SIZE_PRESET_IDS.map((id) => getViewSizePreset(id));

		expect(presets.map((preset) => preset.id)).toEqual(VIEW_SIZE_PRESET_IDS);
		expect(presets.map((preset) => preset.tileWidth)).toEqual([96, 128, 168, 224]);
		expect(presets.map((preset) => preset.iconSize)).toEqual([16, 24, 32, 48]);
		expect(presets.every((preset) => preset.tileHeight > preset.iconSize)).toBe(true);
		expect(presets.every((preset) => preset.labelLineClamp >= 1)).toBe(true);
		expect(presets.every((preset) => preset.gap > 0)).toBe(true);
	});

	it('falls back to the default preset for unknown ids', () => {
		expect(getViewSizePreset('unknown' as ViewSizePresetId)).toEqual(
			getViewSizePreset(DEFAULT_VIEW_SIZE_PRESET),
		);
	});

	it('serializes preset metrics into CSS custom properties consumed by node views', () => {
		expect(viewSizeCssVars(getViewSizePreset('large'))).toEqual([
			'--vm-node-grid-tile-w: 168px',
			'--vm-node-grid-tile-h: 96px',
			'--vm-node-grid-icon-size: 32px',
			'--vm-node-grid-label-lines: 2',
			'--vm-node-grid-gap: 10px',
			'--vm-tree-row-h: 32px',
			'--vm-tree-icon-size: 18px',
			'--vm-tree-toggle-size: 20px',
		].join('; '));
	});
});
