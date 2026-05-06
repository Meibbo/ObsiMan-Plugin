import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { mount, unmount, flushSync, type Component } from 'svelte';
import SettingsUI from '../../src/components/settings/SettingsUI.svelte';
import {
	DEFAULT_SETTINGS,
	type iVaultmanPlugin,
	type VaultmanSettings,
} from '../../src/types/typeSettings';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';

beforeAll(() => {
	installObsidianDomPolyfill();
});

interface FakePlugin {
	settings: VaultmanSettings;
	saveSettings: ReturnType<typeof vi.fn>;
	updateGlassBlur: ReturnType<typeof vi.fn>;
}

function makeFakePlugin(): FakePlugin {
	return {
		settings: structuredClone(DEFAULT_SETTINGS),
		saveSettings: vi.fn(async () => {}),
		updateGlassBlur: vi.fn(),
	};
}

describe('SettingsUI mount (regression: effect_update_depth_exceeded)', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		vi.stubGlobal('activeDocument', document);
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	it('mounts without throwing and renders .vm-settings root', () => {
		const plugin = makeFakePlugin();

		// If SettingsUI re-introduces a blanket $effect autosave loop, Svelte
		// will throw `effect_update_depth_exceeded` inside flushSync(), which
		// fails this test naturally — no extra assertion needed.
		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		const root = target.querySelector('.vm-settings');
		expect(root).not.toBeNull();
	});

	it('does not call saveSettings or updateGlassBlur during mount', () => {
		const plugin = makeFakePlugin();

		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		expect(plugin.saveSettings).not.toHaveBeenCalled();
		expect(plugin.updateGlassBlur).not.toHaveBeenCalled();
	});

	it('does not mutate plugin.settings during mount', () => {
		const plugin = makeFakePlugin();
		const before = JSON.stringify(plugin.settings);

		app = mount(SettingsUI as unknown as Component<{ plugin: iVaultmanPlugin }>, {
			target,
			props: { plugin: plugin as unknown as iVaultmanPlugin },
		});
		flushSync();

		expect(JSON.stringify(plugin.settings)).toBe(before);
	});
});
