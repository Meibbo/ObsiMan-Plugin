import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PanelExplorer from '../../src/components/containers/panelExplorer.svelte';
import { NodeSelectionService } from '../../src/services/serviceSelection.svelte';
import { ViewService } from '../../src/services/serviceViews.svelte';
import type { VaultmanPlugin } from '../../src/main';
import type { ExplorerProvider, ExplorerViewMode } from '../../src/types/typeExplorer';
import type { FileMeta, TreeNode } from '../../src/types/typeNode';
import type { IViewService } from '../../src/types/typeViews';
import { mockTFile } from '../helpers/obsidian-mocks';

const EXPLORER_ID = 'selection-test';

function nodes(): TreeNode[] {
	return [
		{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
		{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-file' },
	];
}

function nestedNodes(): TreeNode[] {
	return [
		{
			id: 'parent',
			label: 'Parent',
			depth: 0,
			meta: {},
			icon: 'lucide-folder',
			children: [{ id: 'child', label: 'Child', depth: 1, meta: {}, icon: 'lucide-file' }],
		},
		{ id: 'sibling', label: 'Sibling', depth: 0, meta: {}, icon: 'lucide-file' },
	];
}

function largeNestedNodes(): TreeNode[] {
	return [
		...nestedNodes(),
		...Array.from({ length: 8 }, (_, index) => ({
			id: `leaf-${index}`,
			label: `Leaf ${index}`,
			depth: 0,
			meta: {},
			icon: 'lucide-file',
		})),
	];
}

function plugin(
	selectionService = new NodeSelectionService(),
	viewService: VaultmanPlugin['viewService'] = {
		clearSelection: vi.fn(),
		select: vi.fn(),
		setFocused: vi.fn(),
	} as unknown as VaultmanPlugin['viewService'],
): VaultmanPlugin {
	return {
		app: {},
		propertyIndex: { fileCount: 0 },
		operationsIndex: { nodes: [], subscribe: vi.fn(() => vi.fn()) },
		activeFiltersIndex: { subscribe: vi.fn(() => vi.fn()) },
		queueService: { remove: vi.fn() },
		filterService: { setSelectedFiles: vi.fn() },
		viewService,
		selectionService,
	} as unknown as VaultmanPlugin;
}

function provider(overrides: Partial<ExplorerProvider> = {}): ExplorerProvider {
	return {
		id: EXPLORER_ID,
		getTree: vi.fn(() => nodes()),
		getFiles: vi.fn(() => []),
		handleNodeClick: vi.fn(),
		handleContextMenu: vi.fn(),
		...overrides,
	};
}

describe('PanelExplorer tree selection adapter', () => {
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

	function renderPanel(
		options: {
			selectionService?: NodeSelectionService;
			provider?: ExplorerProvider;
			viewMode?: ExplorerViewMode;
			gridHierarchyMode?: 'folder' | 'inline';
			nodeExpansionCommand?: unknown;
			onNodeExpansionSummaryChange?: (summary: unknown) => void;
		} = {},
	) {
		const selectionService = options.selectionService ?? new NodeSelectionService();
		const pluginStub = plugin(selectionService);
		pluginStub.settings = { ...pluginStub.settings, gridHierarchyMode: options.gridHierarchyMode };
		const providerStub = options.provider ?? provider();
		app = mount(PanelExplorer as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: pluginStub,
				provider: providerStub,
				viewMode: options.viewMode ?? 'tree',
				nodeExpansionCommand: options.nodeExpansionCommand,
				onNodeExpansionSummaryChange: options.onNodeExpansionSummaryChange,
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();
		return { pluginStub, providerStub, selectionService };
	}

	it('row-slot click selects through the node selection service without activating the node', () => {
		const { pluginStub, providerStub, selectionService } = renderPanel();

		(target.querySelector('[data-id="alpha"]') as HTMLElement).click();
		flushSync();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['alpha']);
		expect(pluginStub.viewService.clearSelection).toHaveBeenCalled();
		expect(pluginStub.viewService.select).toHaveBeenCalledWith(EXPLORER_ID, 'alpha', 'add');
		expect(pluginStub.viewService.setFocused).toHaveBeenCalledWith(EXPLORER_ID, 'alpha');
		expect(providerStub.handleNodeClick).not.toHaveBeenCalled();
	});

	it('label click selects then runs the provider primary action', () => {
		const { providerStub, selectionService } = renderPanel();

		(target.querySelector('[data-id="beta"] .vm-tree-label') as HTMLElement).click();
		flushSync();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['beta']);
		expect(providerStub.handleNodeClick).toHaveBeenCalledOnce();
		expect(providerStub.handleNodeClick).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'beta' }),
		);
	});

	it('outside document click clears node selection for the active explorer', () => {
		const { selectionService } = renderPanel();

		(target.querySelector('[data-id="alpha"]') as HTMLElement).click();
		flushSync();
		document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();

		const snapshot = selectionService.snapshot(EXPLORER_ID);
		expect([...snapshot.ids]).toEqual([]);
		expect(snapshot.anchorId).toBeNull();
		expect(snapshot.focusedId).toBeNull();
	});

	it('Escape clears node selection through the window handler', () => {
		const { selectionService } = renderPanel();

		(target.querySelector('[data-id="alpha"]') as HTMLElement).click();
		flushSync();
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushSync();

		const snapshot = selectionService.snapshot(EXPLORER_ID);
		expect([...snapshot.ids]).toEqual([]);
		expect(snapshot.anchorId).toBeNull();
		expect(snapshot.focusedId).toBeNull();
	});

	it('grid tile click selects provider tree nodes through the same node selection service', () => {
		const file = mockTFile('Notes/Alpha.md');
		const fileNode: TreeNode<FileMeta> = {
			id: file.path,
			label: file.basename,
			depth: 0,
			icon: 'lucide-file',
			meta: { file, isFolder: false, folderPath: 'Notes' },
		};
		const { pluginStub, selectionService } = renderPanel({
			viewMode: 'grid',
			provider: provider({
				id: 'files',
				getTree: vi.fn(() => [fileNode]),
				getFiles: vi.fn(() => []),
			}),
		});

		(target.querySelector('[data-id="Notes/Alpha.md"]') as HTMLElement).click();
		flushSync();

		expect([...selectionService.snapshot('files').ids]).toEqual(['Notes/Alpha.md']);
		expect(pluginStub.viewService.select).toHaveBeenCalledWith('files', 'Notes/Alpha.md', 'add');
		expect(pluginStub.filterService.setSelectedFiles).toHaveBeenCalledWith([file]);
	});

	it('grid mode reflects node ids already selected in the shared selection service', () => {
		const selectionService = new NodeSelectionService();
		selectionService.selectPointer(EXPLORER_ID, ['alpha', 'beta'], 'beta');

		renderPanel({ viewMode: 'grid', selectionService });

		expect(target.querySelector('[data-id="beta"]')?.getAttribute('aria-selected')).toBe('true');
		expect(target.querySelector('[data-id="alpha"]')?.getAttribute('aria-selected')).toBe('false');
	});

	it('grid folder mode shows root parents without flattening descendants', () => {
		renderPanel({
			viewMode: 'grid',
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
		});

		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();
		expect(target.querySelector('[data-id="sibling"]')).not.toBeNull();
		expect(target.querySelector('[data-id="child"]')).toBeNull();
	});

	it('grid inline mode shows root tiles with chevrons and expands children in place', () => {
		const providerStub = provider({ getTree: vi.fn(() => nestedNodes()) });
		renderPanel({
			viewMode: 'grid',
			gridHierarchyMode: 'inline',
			provider: providerStub,
		});

		expect(target.querySelector('.vm-grid-nav-toolbar')).toBeNull();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();
		expect(target.querySelector('[data-id="sibling"]')).not.toBeNull();
		expect(target.querySelector('[data-id="child"]')).toBeNull();

		(target.querySelector('[data-vm-node-grid-toggle="parent"]') as HTMLElement).click();
		flushSync();

		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();
		expect(target.querySelector('[data-id="sibling"]')).not.toBeNull();
		expect(target.querySelector('[data-vm-node-grid-inline-panel="parent"]')).not.toBeNull();
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();
		expect(providerStub.handleNodeClick).not.toHaveBeenCalled();
	});

	it('grid inline keyboard expands and collapses parent tiles without folder navigation', () => {
		renderPanel({
			viewMode: 'grid',
			gridHierarchyMode: 'inline',
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
		});

		const parent = target.querySelector('[data-id="parent"]') as HTMLElement;
		parent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		flushSync();

		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('true');
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();

		parent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
		flushSync();

		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('false');
		expect(target.querySelector('[data-id="child"]')).toBeNull();
	});

	it('grid folder mode opens parent tiles into their child nodes and keeps leaf activation', () => {
		const providerStub = provider({ getTree: vi.fn(() => nestedNodes()) });
		renderPanel({ viewMode: 'grid', provider: providerStub });

		(target.querySelector('[data-id="parent"] .vm-node-grid-label') as HTMLElement).click();
		flushSync();

		expect(target.querySelector('[data-id="parent"]')).toBeNull();
		expect(target.querySelector('[data-id="sibling"]')).toBeNull();
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();
		expect(providerStub.handleNodeClick).not.toHaveBeenCalled();

		(target.querySelector('[data-id="child"] .vm-node-grid-label') as HTMLElement).click();
		flushSync();

		expect(providerStub.handleNodeClick).toHaveBeenCalledOnce();
		expect(providerStub.handleNodeClick).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'child' }),
		);
	});

	it('grid folder navigation toolbar supports up, back, forward, refresh, and root crumbs', () => {
		renderPanel({
			viewMode: 'grid',
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
		});

		expect(target.querySelector('.vm-grid-nav-toolbar')).not.toBeNull();
		(target.querySelector('[data-id="parent"] .vm-node-grid-label') as HTMLElement).click();
		flushSync();
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();

		(target.querySelector('[data-vm-grid-nav="up"]') as HTMLButtonElement).click();
		flushSync();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();
		expect(target.querySelector('[data-id="child"]')).toBeNull();

		(target.querySelector('[data-vm-grid-nav="back"]') as HTMLButtonElement).click();
		flushSync();
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();

		(target.querySelector('[data-vm-grid-nav="forward"]') as HTMLButtonElement).click();
		flushSync();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();

		(target.querySelector('[data-id="parent"] .vm-node-grid-label') as HTMLElement).click();
		flushSync();
		(target.querySelector('[data-vm-grid-crumb="root"]') as HTMLButtonElement).click();
		flushSync();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();

		(target.querySelector('[data-vm-grid-nav="refresh"]') as HTMLButtonElement).click();
		flushSync();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();
	});

	it('grid folder keyboard navigation opens parents and moves through history', () => {
		renderPanel({
			viewMode: 'grid',
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
		});

		(target.querySelector('[data-id="parent"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
		);
		flushSync();
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();

		(target.querySelector('[data-id="child"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }),
		);
		flushSync();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();
		expect(target.querySelector('[data-id="child"]')).toBeNull();

		(target.querySelector('[data-id="parent"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
		);
		flushSync();
		(target.querySelector('[data-id="child"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true }),
		);
		flushSync();
		expect(target.querySelector('[data-id="parent"]')).not.toBeNull();

		(target.querySelector('[data-id="parent"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true }),
		);
		flushSync();
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();
	});

	it('does not refresh provider trees from reactive ViewService decoration when selecting a row', () => {
		const selectionService = new NodeSelectionService();
		const viewService = new ViewService();
		const sourceNodes = nodes();
		let forbidSelectionRefresh = false;
		const providerStub = provider({
			getTree: vi.fn(() => {
				if (forbidSelectionRefresh) {
					throw new Error('provider tree refreshed from selection mirror');
				}
				const model = viewService.getModel({
					explorerId: EXPLORER_ID,
					mode: 'tree',
					nodes: sourceNodes,
				});
				return model.rows.map((row) => ({
					...row.node,
					cls: row.cls,
					meta: {
						layers: row.layers,
					},
				}));
			}),
		});
		const pluginStub = plugin(selectionService, viewService as unknown as IViewService);
		app = mount(PanelExplorer as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: pluginStub,
				provider: providerStub,
				viewMode: 'tree',
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		forbidSelectionRefresh = true;
		expect(() => {
			(target.querySelector('[data-id="alpha"]') as HTMLElement).click();
			flushSync();
		}).not.toThrow();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['alpha']);
		expect([
			...viewService.getModel({ explorerId: EXPLORER_ID, mode: 'tree', nodes: sourceNodes })
				.selection.ids,
		]).toEqual(['alpha']);
		expect(providerStub.getTree).toHaveBeenCalledTimes(1);
	});

	it('ArrowLeft on a child moves selection and focus to its parent, then collapses the parent', () => {
		const { selectionService } = renderPanel({
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
		});

		(target.querySelector('[data-id="child"]') as HTMLElement).click();
		flushSync();
		(target.querySelector('[data-id="child"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
		);
		flushSync();

		let snapshot = selectionService.snapshot(EXPLORER_ID);
		expect([...snapshot.ids]).toEqual(['parent']);
		expect(snapshot.focusedId).toBe('parent');
		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('true');

		(target.querySelector('[data-id="parent"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
		);
		flushSync();

		snapshot = selectionService.snapshot(EXPLORER_ID);
		expect([...snapshot.ids]).toEqual(['parent']);
		expect(snapshot.focusedId).toBe('parent');
		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('false');
		expect(target.querySelector('[data-id="child"]')).toBeNull();
	});

	it('ArrowRight on a collapsed parent expands it without activating the provider', () => {
		const providerStub = provider({ getTree: vi.fn(() => largeNestedNodes()) });
		const { selectionService } = renderPanel({ provider: providerStub });
		const parent = target.querySelector('[data-id="parent"]') as HTMLElement;

		expect(parent.getAttribute('aria-expanded')).toBe('false');
		expect(target.querySelector('[data-id="child"]')).toBeNull();

		parent.click();
		flushSync();
		parent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		flushSync();

		expect(selectionService.snapshot(EXPLORER_ID).focusedId).toBe('parent');
		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('true');
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();
		expect(providerStub.handleNodeClick).not.toHaveBeenCalled();
	});

	it('ArrowRight on a leaf preserves selection without activating the provider', () => {
		const providerStub = provider();
		const { selectionService } = renderPanel({ provider: providerStub });

		(target.querySelector('[data-id="alpha"]') as HTMLElement).click();
		flushSync();
		(target.querySelector('[data-id="alpha"]') as HTMLElement).dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
		);
		flushSync();

		expect([...selectionService.snapshot(EXPLORER_ID).ids]).toEqual(['alpha']);
		expect(selectionService.snapshot(EXPLORER_ID).focusedId).toBe('alpha');
		expect(providerStub.handleNodeClick).not.toHaveBeenCalled();
	});

	it('collapses all expanded parent nodes from a generic expansion command', () => {
		renderPanel({
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
			nodeExpansionCommand: { serial: 1, action: 'collapse-all' },
		});

		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('false');
		expect(target.querySelector('[data-id="child"]')).toBeNull();
	});

	it('expands all parent nodes from a generic expansion command', () => {
		renderPanel({
			provider: provider({ getTree: vi.fn(() => largeNestedNodes()) }),
			nodeExpansionCommand: { serial: 1, action: 'expand-all' },
		});

		expect(target.querySelector('[data-id="parent"]')?.getAttribute('aria-expanded')).toBe('true');
		expect(target.querySelector('[data-id="child"]')).not.toBeNull();
	});

	it('reports whether the active explorer can toggle parent expansion', () => {
		const onNodeExpansionSummaryChange = vi.fn();

		renderPanel({
			provider: provider({ getTree: vi.fn(() => nestedNodes()) }),
			onNodeExpansionSummaryChange,
		});

		expect(onNodeExpansionSummaryChange).toHaveBeenLastCalledWith({
			canToggle: true,
			hasExpandedParents: true,
		});
	});
});
