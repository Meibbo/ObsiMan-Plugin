import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component as SvelteComponent } from 'svelte';
import { Component, MarkdownRenderer } from 'obsidian';
import PageStats from '../../src/components/pages/pageStats.svelte';
import type { VaultmanPlugin } from '../../src/main';
import { mockApp, mockTFile } from '../helpers/obsidian-mocks';

function makePlugin() {
	const previewFile = mockTFile('Notes/Preview.md');
	const adapterFiles = new Map([[previewFile.path, '# Preview\n\nRendered body']]);
	const app = mockApp({ files: [previewFile], adapterFiles });
	return {
		app,
		filterService: { filteredFiles: [], selectedFiles: [] },
		propertyIndex: { index: new Map() },
	} as unknown as VaultmanPlugin;
}

describe('PageStats note preview', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.restoreAllMocks();
	});

	it('renders the selected note through Obsidian MarkdownRenderer with a lifecycle component', async () => {
		const plugin = makePlugin();
		const file = plugin.app.vault.getMarkdownFiles()[0];
		const renderSpy = vi.spyOn(MarkdownRenderer, 'render');

		app = mount(PageStats as unknown as SvelteComponent<Record<string, unknown>>, {
			target,
			props: { plugin, previewFile: file },
		});
		flushSync();
		await Promise.resolve();
		await Promise.resolve();
		flushSync();

		expect(renderSpy).toHaveBeenCalledWith(
			plugin.app,
			'# Preview\n\nRendered body',
			expect.any(HTMLElement),
			'Notes/Preview.md',
			expect.any(Component),
		);
		expect(target.querySelector('.vm-stat-note-preview')).toBeTruthy();
		expect(target.textContent).toContain('Rendered body');
	});

	it('unloads the markdown render component when the Svelte component unmounts', async () => {
		const plugin = makePlugin();
		const file = plugin.app.vault.getMarkdownFiles()[0];
		const unloadSpy = vi.spyOn(Component.prototype, 'unload');

		app = mount(PageStats as unknown as SvelteComponent<Record<string, unknown>>, {
			target,
			props: { plugin, previewFile: file },
		});
		flushSync();
		await Promise.resolve();
		await Promise.resolve();

		await unmount(app);
		app = null;

		expect(unloadSpy).toHaveBeenCalled();
	});
});
