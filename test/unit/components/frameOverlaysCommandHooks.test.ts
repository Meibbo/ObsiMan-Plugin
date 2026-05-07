import { describe, expect, it } from 'vitest';
import type { VaultmanPlugin } from '../../../src/main';
import {
	FrameOverlayController,
	installFrameOverlayCommandHooks,
} from '../../../src/components/frame/frameOverlays.svelte';
import { OverlayStateService } from '../../../src/services/serviceOverlayState.svelte';

describe('FrameOverlayController command hooks', () => {
	it('wires plugin command hooks to the frame overlay islands and cleans them up', () => {
		const plugin = {
			settings: { islandDismissOnOutsideClick: false },
			overlayState: new OverlayStateService(),
			openQueuePopupHook: null,
			openFiltersPopupHook: null,
		} as unknown as VaultmanPlugin & {
			openQueuePopupHook: (() => void) | null;
			openFiltersPopupHook: (() => void) | null;
		};
		const overlays = new FrameOverlayController(plugin, {}, {});

		const cleanup = installFrameOverlayCommandHooks(plugin, overlays);

		expect(typeof plugin.openQueuePopupHook).toBe('function');
		expect(typeof plugin.openFiltersPopupHook).toBe('function');

		plugin.openQueuePopupHook?.();
		expect(plugin.overlayState.isOpen('queue')).toBe(true);
		expect(plugin.overlayState.isOpen('active-filters')).toBe(false);

		plugin.openFiltersPopupHook?.();
		expect(plugin.overlayState.isOpen('queue')).toBe(false);
		expect(plugin.overlayState.isOpen('active-filters')).toBe(true);

		cleanup();
		expect(plugin.openQueuePopupHook).toBeNull();
		expect(plugin.openFiltersPopupHook).toBeNull();
	});
});
