import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PageFilters from '../../src/components/pages/pageFilters.svelte';
import type { VaultmanPlugin } from '../../src/main';
import { mockApp, mockTFile } from '../helpers/obsidian-mocks';

function noopIndex() {
	return {
		nodes: [],
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
		byId: vi.fn(),
	};
}

function plugin(): VaultmanPlugin {
	const baseFile = mockTFile('Dashboards/Projects.base');
	const app = mockApp({
		files: [baseFile],
		adapterFiles: new Map([
			[
				'Dashboards/Projects.base',
				[
					'views:',
					'  - type: table',
					'    name: Open Projects',
					'    filters:',
					'      and:',
					'        - status == "open"',
				].join('\n'),
			],
		]),
	});
	(app.metadataCache as unknown as { getTags: () => Record<string, number> }).getTags = vi.fn(
		() => ({}),
	);

	return {
		app,
		settings: {
			filtersShowTabLabels: true,
			explorerOperationScope: 'filtered',
		},
		filterService: {
			filteredFiles: [],
			selectedFiles: [],
			setFilter: vi.fn(),
			setSearchFilter: vi.fn(),
			clearSearchFilter: vi.fn(),
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
		decorationManager: {
			decorate: vi.fn(() => ({ icons: [], badges: [], highlights: [] })),
			subscribe: vi.fn(() => vi.fn()),
		},
		viewService: {
			getModel: vi.fn(() => ({
				rows: [],
				columns: [],
				groups: [],
				selection: { ids: new Set() },
				focus: { id: null },
				sort: { id: 'manual', direction: 'asc' },
				search: { query: '' },
				virtualization: { rowHeight: 32, overscan: 5 },
				capabilities: {},
			})),
			clearSelection: vi.fn(),
			select: vi.fn(),
			setFocused: vi.fn(),
		},
		iconicService: {
			getIcon: vi.fn(),
			getTagIcon: vi.fn(),
		},
	} as unknown as VaultmanPlugin;
}

describe('PageFilters Bases choose mode', () => {
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
	});

	it('forces files tab and disables other tabs while showing Bases import targets', async () => {
		app = mount(PageFilters as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: plugin(),
				filtersActiveTab: 'props',
				filtersBaseChooseMode: true,
			},
		});
		flushSync();
		await Promise.resolve();
		await new Promise((resolve) => setTimeout(resolve, 0));
		flushSync();

		const filesTab = target.querySelector<HTMLElement>('[aria-label="Files"]');
		const propsTab = target.querySelector<HTMLElement>('[aria-label="Props"]');

		expect(filesTab?.classList.contains('is-active')).toBe(true);
		expect(propsTab?.getAttribute('aria-disabled')).toBe('true');
		expect(propsTab?.classList.contains('is-faint')).toBe(true);
		expect(target.textContent).toContain('Projects');
		expect(target.textContent).toContain('Open Projects');
	});

	it('wires plugin command hooks to the navbar view and sort menus', () => {
		const vm = plugin() as VaultmanPlugin & {
			openViewMenuHook?: (() => void) | null;
			openSortMenuHook?: (() => void) | null;
		};
		app = mount(PageFilters as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: vm,
				filtersActiveTab: 'props',
			},
		});
		flushSync();

		expect(typeof vm.openViewMenuHook).toBe('function');
		expect(typeof vm.openSortMenuHook).toBe('function');

		vm.openViewMenuHook?.();
		flushSync();
		expect(target.querySelector('.vm-viewmode-popup')).toBeTruthy();

		vm.openSortMenuHook?.();
		flushSync();
		expect(target.querySelector('.vm-sort-popup')).toBeTruthy();
	});
});
