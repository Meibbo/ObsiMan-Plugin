import { describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import { createCSSSnippetsIndex } from '../../../src/index/indexSnippets';
import { mockApp } from '../../helpers/obsidian-mocks';

describe('createCSSSnippetsIndex', () => {
	it('builds sorted snippet nodes from app.customCss.snippets', async () => {
		const app = Object.assign(mockApp(), {
			customCss: {
				snippets: ['zeta', 'alpha'],
				enabledSnippets: new Set<string>(['alpha']),
			},
		}) as unknown as App;
		const index = createCSSSnippetsIndex(app);

		await index.refresh();

		expect(index.nodes).toEqual([
			{ id: 'alpha', name: 'alpha', enabled: true },
			{ id: 'zeta', name: 'zeta', enabled: false },
		]);
		expect(index.byId('alpha')).toEqual({ id: 'alpha', name: 'alpha', enabled: true });
	});

	it('falls back to .obsidian/snippets css files when customCss has no snippet list', async () => {
		const app = Object.assign(mockApp({ configDir: '.obsidian' }), {
			customCss: {
				enabledSnippets: new Set<string>(['wide-table']),
			},
		}) as unknown as App;
		(
			app.vault.adapter as unknown as {
				list: (path: string) => Promise<{ files: string[]; folders: string[] }>;
			}
		).list = vi.fn(async (path: string) => {
			expect(path).toBe('.obsidian/snippets');
			return {
				files: [
					'.obsidian/snippets/wide-table.css',
					'.obsidian/snippets/readme.md',
					'.obsidian/snippets/cards.css',
				],
				folders: [],
			};
		});

		const index = createCSSSnippetsIndex(app);
		await index.refresh();

		expect(index.nodes).toEqual([
			{ id: 'cards', name: 'cards', enabled: false },
			{ id: 'wide-table', name: 'wide-table', enabled: true },
		]);
	});
});
