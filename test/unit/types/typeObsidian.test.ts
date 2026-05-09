import { describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import {
	getCommunityPluginManifest,
	getCommunityPlugins,
	getCustomCss,
	isCommunityPluginEnabled,
	isCommunityPluginLoaded,
	setCssSnippetEnabled,
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
});
