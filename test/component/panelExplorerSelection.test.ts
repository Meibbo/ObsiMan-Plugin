import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PanelExplorer from '../../src/components/containers/panelExplorer.svelte';
import { NodeSelectionService } from '../../src/services/serviceSelection.svelte';
import type { VaultmanPlugin } from '../../src/main';
import type { ExplorerProvider } from '../../src/types/typeExplorer';
import type { TreeNode } from '../../src/types/typeNode';

const EXPLORER_ID = 'selection-test';

function nodes(): TreeNode[] {
	return [
		{ id: 'alpha', label: 'Alpha', depth: 0, meta: {}, icon: 'lucide-file' },
		{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-file' },
	];
}

function plugin(selectionService = new NodeSelectionService()): VaultmanPlugin {
	return {
		app: {},
		propertyIndex: { fileCount: 0 },
		operationsIndex: { nodes: [], subscribe: vi.fn(() => vi.fn()) },
		activeFiltersIndex: { subscribe: vi.fn(() => vi.fn()) },
		queueService: { remove: vi.fn() },
		filterService: { setSelectedFiles: vi.fn() },
		viewService: {
			clearSelection: vi.fn(),
			select: vi.fn(),
			setFocused: vi.fn(),
		},
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
		} = {},
	) {
		const selectionService = options.selectionService ?? new NodeSelectionService();
		const pluginStub = plugin(selectionService);
		const providerStub = options.provider ?? provider();
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
});
