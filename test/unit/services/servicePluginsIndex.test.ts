import { describe, expect, it } from 'vitest';
import type { App } from 'obsidian';
import { createCommunityPluginsIndex } from '../../../src/index/indexPlugins';
import { mockApp } from '../../helpers/obsidian-mocks';

describe('createCommunityPluginsIndex', () => {
	it('builds sorted plugin nodes from community plugin manifests', async () => {
		const app = Object.assign(mockApp(), {
			plugins: {
				manifests: {
					dataview: {
						id: 'dataview',
						name: 'Dataview',
						version: '0.5.67',
						author: 'Blacksmithgu',
						description: 'Query your vault.',
						isDesktopOnly: false,
					},
					calendar: {
						id: 'calendar',
						name: 'Calendar',
						version: '1.5.10',
						author: 'Liam',
						description: 'Calendar view.',
						isDesktopOnly: true,
					},
				},
				enabledPlugins: new Set<string>(['calendar']),
				plugins: {
					calendar: { _loaded: true },
					dataview: { _loaded: false },
				},
			},
		}) as unknown as App;

		const index = createCommunityPluginsIndex(app);
		await index.refresh();

		expect(index.nodes).toEqual([
			{
				id: 'calendar',
				pluginId: 'calendar',
				name: 'Calendar',
				version: '1.5.10',
				author: 'Liam',
				description: 'Calendar view.',
				isDesktopOnly: true,
				enabled: true,
				loaded: true,
			},
			{
				id: 'dataview',
				pluginId: 'dataview',
				name: 'Dataview',
				version: '0.5.67',
				author: 'Blacksmithgu',
				description: 'Query your vault.',
				isDesktopOnly: false,
				enabled: false,
				loaded: false,
			},
		]);
		expect(index.byId('calendar')?.enabled).toBe(true);
	});

	it('returns an empty index when the community plugin manager is unavailable', async () => {
		const index = createCommunityPluginsIndex(mockApp() as unknown as App);

		await index.refresh();

		expect(index.nodes).toEqual([]);
	});
});
