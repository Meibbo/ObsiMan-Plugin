import { describe, expect, it, vi } from 'vitest';
import { mockApp, mockTFile, type CachedMetadata, type TFile } from '../helpers/obsidian-mocks';
import { explorerTags } from '../../src/components/containers/explorerTags';
import { explorerProps } from '../../src/components/containers/explorerProps';
import { explorerFiles } from '../../src/components/containers/explorerFiles';
import { DecorationManager } from '../../src/services/serviceDecorate';
import { ViewService } from '../../src/services/serviceViews.svelte';
import type { VaultmanPlugin } from '../../src/main';

function makePlugin(opts: { files?: TFile[] } = {}): {
	plugin: VaultmanPlugin;
	bindOrCreate: ReturnType<typeof vi.fn>;
} {
	const files = opts.files ?? [mockTFile('a.md', { frontmatter: {} })];
	const meta = new Map<string, CachedMetadata>(
		files.map((f) => [
			f.path,
			{ frontmatter: (f as TFile & { _frontmatter?: Record<string, unknown> })._frontmatter ?? {} },
		]),
	);
	const app = mockApp({ files, metadata: meta });
	const decorationManager = new DecorationManager(app);
	const bindOrCreate = vi.fn().mockResolvedValue({ outcome: 'opened', token: '#x', matchCount: 1 });
	const plugin = {
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
		nodeBindingService: { bindOrCreate },
	} as unknown as VaultmanPlugin;
	return { plugin, bindOrCreate };
}

function findAction(plugin: VaultmanPlugin, id: string) {
	const calls = (plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>).mock.calls;
	const match = calls.find(([action]) => action.id === id);
	return match ? match[0] : null;
}

describe('phase 7 — create / open binding note cmenu entry', () => {
	it('registers on tag, prop, and value providers', () => {
		const tagPlugin = makePlugin();
		new explorerTags(tagPlugin.plugin);
		expect(findAction(tagPlugin.plugin, 'tag.bindingNote')).toBeTruthy();

		const propPlugin = makePlugin();
		new explorerProps(propPlugin.plugin);
		expect(findAction(propPlugin.plugin, 'prop.bindingNote')).toBeTruthy();
		expect(findAction(propPlugin.plugin, 'value.bindingNote')).toBeTruthy();
	});

	it('does NOT register a binding-note action on file explorer', () => {
		const filePlugin = makePlugin();
		new explorerFiles(filePlugin.plugin);
		const calls = (
			filePlugin.plugin.contextMenuService.registerAction as ReturnType<typeof vi.fn>
		).mock.calls;
		expect(calls.find(([action]) => /bindingNote/i.test(action.id))).toBeFalsy();
	});

	it('tag binding-note action calls nodeBindingService.bindOrCreate with the tag token', async () => {
		const { plugin, bindOrCreate } = makePlugin();
		new explorerTags(plugin);
		const action = findAction(plugin, 'tag.bindingNote');
		await action.run({
			nodeType: 'tag',
			node: { id: 't', label: 'alpha', depth: 0, meta: { tagPath: 'alpha' } },
			surface: 'panel',
		});
		expect(bindOrCreate).toHaveBeenCalledTimes(1);
		const arg = bindOrCreate.mock.calls[0][0];
		expect(arg).toMatchObject({ kind: 'tag', tagPath: 'alpha' });
	});

	it('prop binding-note action passes propName through to the service', async () => {
		const { plugin, bindOrCreate } = makePlugin();
		new explorerProps(plugin);
		const action = findAction(plugin, 'prop.bindingNote');
		await action.run({
			nodeType: 'prop',
			node: {
				id: 'p',
				label: 'status',
				depth: 0,
				meta: { propName: 'status', propType: 'text', isValueNode: false },
			},
			surface: 'panel',
		});
		expect(bindOrCreate).toHaveBeenCalledTimes(1);
		const arg = bindOrCreate.mock.calls[0][0];
		expect(arg).toMatchObject({ kind: 'prop', propName: 'status' });
	});
});
