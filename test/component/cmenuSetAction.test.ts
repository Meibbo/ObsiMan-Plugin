import { describe, expect, it, vi } from 'vitest';
import { mockApp, mockTFile, type CachedMetadata, type TFile } from '../helpers/obsidian-mocks';
import { explorerTags } from '../../src/components/containers/explorerTags';
import { explorerProps } from '../../src/components/containers/explorerProps';
import { explorerFiles } from '../../src/components/containers/explorerFiles';
import { DecorationManager } from '../../src/services/serviceDecorate';
import { ViewService } from '../../src/services/serviceViews.svelte';
import type { VaultmanPlugin } from '../../src/main';

function basePlugin(opts: {
	files?: TFile[];
	frontmatter?: Record<string, unknown>;
	openPropSetIsland?: (name: string) => void;
} = {}): VaultmanPlugin {
	const files = opts.files ?? [
		mockTFile('a.md', { frontmatter: opts.frontmatter ?? { status: 'old' } }),
		mockTFile('b.md', { frontmatter: opts.frontmatter ?? { status: 'old' } }),
	];
	const meta = new Map<string, CachedMetadata>(
		files.map((f) => [
			f.path,
			{ frontmatter: (f as TFile & { _frontmatter?: Record<string, unknown> })._frontmatter ?? {} },
		]),
	);
	const app = mockApp({ files, metadata: meta });
	const decorationManager = new DecorationManager(app);

	return {
		app,
		contextMenuService: { registerAction: vi.fn(), openPanelMenu: vi.fn() },
		queueService: { add: vi.fn(), queue: [] },
		tagsIndex: { refresh: vi.fn(), subscribe: vi.fn(() => vi.fn()), byId: vi.fn() },
		propsIndex: { refresh: vi.fn(), subscribe: vi.fn(() => vi.fn()), byId: vi.fn() },
		operationsIndex: { nodes: [], refresh: vi.fn(), subscribe: vi.fn(), byId: vi.fn() },
		activeFiltersIndex: { nodes: [], refresh: vi.fn(), subscribe: vi.fn(), byId: vi.fn() },
		filterService: {
			filteredFiles: files,
			hasTagFilter: vi.fn(() => false),
			hasPropFilter: vi.fn(() => false),
			hasValueFilter: vi.fn(() => false),
			addNode: vi.fn(),
			removeNodeByTag: vi.fn(),
			removeNodeByProperty: vi.fn(),
		},
		settings: { explorerOperationScope: 'filtered' },
		decorationManager,
		viewService: new ViewService({ decorationManager }),
		iconicService: { getTagIcon: vi.fn(() => null), getIcon: vi.fn(() => null) },
		nodeBindingService: { bindOrCreate: vi.fn().mockResolvedValue({ outcome: 'opened' }) },
	} as unknown as VaultmanPlugin;
}

function findRegisteredAction(plugin: VaultmanPlugin, id: string) {
	const calls = (plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>).mock.calls;
	const match = calls.find(([action]) => action.id === id);
	return match ? match[0] : null;
}

describe('phase 7 — `set` cmenu entry exists in every explorer', () => {
	it('tag explorer registers `tag.set` and queues NATIVE_ADD_TAG over filtered files', () => {
		const plugin = basePlugin({ frontmatter: { tags: ['other'] } });
		new explorerTags(plugin);
		const action = findRegisteredAction(plugin, 'tag.set');
		expect(action).toBeTruthy();
		action.run({
			nodeType: 'tag',
			node: { id: 't', label: 'urgent', depth: 0, meta: { tagPath: 'urgent' } },
			surface: 'panel',
		});
		expect(plugin.queueService.add).toHaveBeenCalledTimes(1);
		const change = (plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(change.type).toBe('tag');
		expect(change.action).toBe('add');
		expect(change.tag).toBe('urgent');
	});

	it('prop explorer registers `prop.set` and forwards to FnR island prefiller', () => {
		const openPropSetIsland = vi.fn();
		const plugin = basePlugin();
		new explorerProps(plugin, { openPropSetIsland });
		const action = findRegisteredAction(plugin, 'prop.set');
		expect(action).toBeTruthy();
		action.run({
			nodeType: 'prop',
			node: {
				id: 'p',
				label: 'status',
				depth: 0,
				meta: { propName: 'status', propType: 'text', isValueNode: false },
			},
			surface: 'panel',
		});
		expect(openPropSetIsland).toHaveBeenCalledWith('status');
	});

	it('value explorer registers `value.set` and queues `set_prop` over filtered files', () => {
		const plugin = basePlugin();
		new explorerProps(plugin);
		const action = findRegisteredAction(plugin, 'value.set');
		expect(action).toBeTruthy();
		action.run({
			nodeType: 'value',
			node: {
				id: 'v',
				label: 'draft',
				depth: 1,
				meta: { propName: 'status', propType: 'text', isValueNode: true, rawValue: 'draft' },
			},
			surface: 'panel',
		});
		expect(plugin.queueService.add).toHaveBeenCalledTimes(1);
		const change = (plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(change.type).toBe('property');
		expect(change.action).toBe('set');
		expect(change.value).toBe('draft');
		expect(change.logicFunc(plugin.app.vault.getMarkdownFiles()[0], {})).toEqual({
			status: 'draft',
		});
	});

	it('file explorer registers `file.set` and queues NATIVE_APPEND_LINK over filtered files', () => {
		const a = mockTFile('a.md');
		const b = mockTFile('b.md');
		const plugin = basePlugin({ files: [a, b] });
		new explorerFiles(plugin);
		const action = findRegisteredAction(plugin, 'file.set');
		expect(action).toBeTruthy();
		action.run({
			nodeType: 'file',
			node: { id: 'f', label: 'a.md', depth: 0, meta: { file: a, isFolder: false, folderPath: '' } },
			surface: 'panel',
			file: a,
		});
		expect(plugin.queueService.add).toHaveBeenCalledTimes(1);
		const change = (plugin.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(change.type).toBe('content_replace');
		expect(change.action).toBe('append-links');
		// logicFunc returns { _APPEND_LINKS: ['[[a]]'] }
		const updates = change.logicFunc(b, {});
		const links = (updates as Record<string, unknown>)['_APPEND_LINKS'];
		expect(links).toEqual(['[[a]]']);
	});
});
