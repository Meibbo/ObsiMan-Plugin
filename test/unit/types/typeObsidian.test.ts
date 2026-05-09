import { describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import {
	getCommunityPluginManifest,
	getCommunityPlugins,
	getCustomCss,
	isCommunityPluginEnabled,
	isCommunityPluginLoaded,
	setCssSnippetEnabled,
	setCommunityPluginEnabled,
} from '../../../src/types/typeObsidian';
import { mockApp } from '../../helpers/obsidian-mocks';

describe('typeObsidian internal wrappers', () => {
	it('returns the typed customCss surface and can toggle a snippet', async () => {
		const setCssEnabledStatus = vi.fn();
		const requestLoadSnippets = vi.fn();
		const app = Object.assign(mockApp(), {
			customCss: {
				snippets: ['wide-table'],
				enabledSnippets: new Set<string>(),
				setCssEnabledStatus,
				requestLoadSnippets,
			},
		}) as unknown as App;

		expect(getCustomCss(app)?.snippets).toEqual(['wide-table']);
		await expect(setCssSnippetEnabled(app, 'wide-table', true)).resolves.toBe(true);
		expect(setCssEnabledStatus).toHaveBeenCalledWith('wide-table', true);
		expect(requestLoadSnippets).toHaveBeenCalledOnce();
	});

	it('returns false when Obsidian does not expose a snippet toggle surface', async () => {
		const app = mockApp() as unknown as App;

		await expect(setCssSnippetEnabled(app, 'missing', true)).resolves.toBe(false);
	});

	it('wraps community plugin manifests and runtime state', () => {
		const app = Object.assign(mockApp(), {
			plugins: {
				manifests: {
					calendar: {
						id: 'calendar',
						name: 'Calendar',
						version: '1.0.0',
					},
				},
				enabledPlugins: new Set(['calendar']),
				plugins: {
					calendar: { _loaded: true },
				},
			},
		}) as unknown as App;

		expect(getCommunityPlugins(app)?.manifests?.calendar.name).toBe('Calendar');
		expect(getCommunityPluginManifest(app, 'calendar')?.id).toBe('calendar');
		expect(isCommunityPluginEnabled(app, 'calendar')).toBe(true);
		expect(isCommunityPluginLoaded(app, 'calendar')).toBe(true);
		expect(isCommunityPluginEnabled(app, 'missing')).toBe(false);
		expect(isCommunityPluginLoaded(app, 'missing')).toBe(false);
	});

	it('toggles community plugins through Obsidian private plugin manager methods', async () => {
		const enablePluginAndSave = vi.fn(async () => undefined);
		const disablePluginAndSave = vi.fn(async () => undefined);
		const app = Object.assign(mockApp(), {
			plugins: {
				enablePluginAndSave,
				disablePluginAndSave,
			},
		}) as unknown as App;

		await expect(setCommunityPluginEnabled(app, 'calendar', true)).resolves.toBe(true);
		await expect(setCommunityPluginEnabled(app, 'calendar', false)).resolves.toBe(true);

		expect(enablePluginAndSave).toHaveBeenCalledWith('calendar');
		expect(disablePluginAndSave).toHaveBeenCalledWith('calendar');
	});

	it('falls back to enablePlugin and fails closed when plugin toggle methods are unavailable', async () => {
		const enablePlugin = vi.fn(async () => undefined);
		const app = Object.assign(mockApp(), {
			plugins: {
				enablePlugin,
			},
		}) as unknown as App;

		await expect(setCommunityPluginEnabled(app, 'calendar', true)).resolves.toBe(true);
		await expect(setCommunityPluginEnabled(app, 'calendar', false)).resolves.toBe(false);
		await expect(setCommunityPluginEnabled(mockApp() as unknown as App, 'calendar', true)).resolves.toBe(
			false,
		);

		expect(enablePlugin).toHaveBeenCalledWith('calendar');
	});
});
