import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PageFilters from '../../src/components/pages/pageFilters.svelte';
import { showInputModal } from '../../src/utils/inputModal';
import { DecorationManager } from '../../src/services/serviceDecorate';
import { ViewService } from '../../src/services/serviceViews.svelte';
import { NATIVE_RENAME_PROP } from '../../src/types/typeOps';
import type { VaultmanPlugin } from '../../src/main';
import { mockApp, mockTFile, type CachedMetadata, type TFile } from '../helpers/obsidian-mocks';

vi.mock('../../src/utils/inputModal', () => ({
	showInputModal: vi.fn(async () => null),
}));

function noopIndex() {
	return {
		nodes: [],
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
		byId: vi.fn(),
	};
}

function plugin(): VaultmanPlugin {
	const a = mockTFile('a.md', { frontmatter: { status: 'draft', owner: 'vic' } });
	const b = mockTFile('b.md', { frontmatter: { status: 'done' } });
	const files = [a, b] as TFile[];
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft', owner: 'vic' } }],
		[b.path, { frontmatter: { status: 'done' } }],
	]);
	const app = mockApp({ files, metadata: meta });
	(app.metadataCache as unknown as { getAllPropertyInfos: () => Record<string, { type: string }> })
		.getAllPropertyInfos = () => ({
		status: { type: 'text' },
		owner: { type: 'text' },
	});
	(app.metadataCache as unknown as { getTags: () => Record<string, number> }).getTags = vi.fn(() => ({}));
	const decorationManager = new DecorationManager(app);

	return {
		app,
		settings: {
			filtersShowTabLabels: true,
			explorerOperationScope: 'filtered',
		},
		filterService: {
			filteredFiles: files,
			selectedFiles: [],
			addNode: vi.fn(),
			removeNodeByProperty: vi.fn(),
			hasPropFilter: vi.fn(() => false),
			hasValueFilter: vi.fn(() => false),
			setFilter: vi.fn(),
			subscribe: vi.fn(() => vi.fn()),
		},
		filesIndex: noopIndex(),
		tagsIndex: noopIndex(),
		propsIndex: noopIndex(),
		contentIndex: Object.assign(noopIndex(), { setQuery: vi.fn() }),
		operationsIndex: noopIndex(),
		activeFiltersIndex: noopIndex(),
		queueService: {
			add: vi.fn(),
			remove: vi.fn(),
		},
		contextMenuService: {
			registerAction: vi.fn(),
			openPanelMenu: vi.fn(),
		},
		decorationManager,
		viewService: new ViewService({ decorationManager }),
		iconicService: {
			getIcon: vi.fn(() => null),
			getTagIcon: vi.fn(() => null),
		},
	} as unknown as VaultmanPlugin;
}

describe('PageFilters rename handoff', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				disconnect(): void {}
			},
		);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
		vi.mocked(showInputModal).mockClear();
	});

	it('queues a prop rename from the navbar handoff instead of opening the input modal', async () => {
		const vm = plugin();
		app = mount(PageFilters as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: vm,
				filtersActiveTab: 'props',
			},
		});
		flushSync();
		await Promise.resolve();
		flushSync();

		const renameAction = (vm.contextMenuService.registerAction as ReturnType<typeof vi.fn>).mock.calls.find(
			([action]) => action.id === 'prop.rename',
		)?.[0];
		expect(renameAction).toBeTruthy();

		await renameAction.run({
			nodeType: 'prop',
			node: {
				id: 'status',
				label: 'status',
				meta: { propName: 'status', isValueNode: false },
			},
			surface: 'panel',
		});
		flushSync();

		expect(showInputModal).not.toHaveBeenCalled();
		const replacement = target.querySelector<HTMLInputElement>('[aria-label="Rename replacement"]');
		expect(replacement).toBeTruthy();

		replacement!.value = 'state';
		replacement!.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		target.querySelector<HTMLButtonElement>('[aria-label="Queue rename"]')?.click();
		flushSync();

		expect(vm.queueService.add).toHaveBeenCalledOnce();
		const change = (vm.queueService.add as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(change).toMatchObject({
			type: 'property',
			property: 'status',
			action: 'rename',
			files: vm.app.vault.getMarkdownFiles(),
		});
		expect(change.logicFunc(vm.app.vault.getMarkdownFiles()[0], { status: 'draft' })).toEqual({
			[NATIVE_RENAME_PROP]: { oldName: 'status', newName: 'state' },
		});
	});
});
