import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PanelExplorer from '../../src/components/containers/panelExplorer.svelte';
import { NodeSelectionService } from '../../src/services/serviceSelection.svelte';
import {
	OperationQueueService,
	type DeleteConflictModalOpener,
} from '../../src/services/serviceQueue.svelte';
import type { VaultmanPlugin } from '../../src/main';
import type { ExplorerProvider } from '../../src/types/typeExplorer';
import type { NodeBadge, TreeNode } from '../../src/types/typeNode';
import { mockApp } from '../helpers/obsidian-mocks';
import { serviceMessage } from '../../src/services/serviceMessage';

const EXPLORER_ID = 'delete-conflict';

function nodes(includeRenameBadge = false): TreeNode[] {
	const renameBadge: NodeBadge = {
		text: 'rename',
		icon: 'lucide-text-cursor-input',
	};
	return [
		{
			id: 'alpha',
			label: 'Alpha',
			depth: 0,
			meta: {},
			icon: 'lucide-file',
			badges: includeRenameBadge ? [renameBadge] : [],
		},
		{ id: 'beta', label: 'Beta', depth: 0, meta: {}, icon: 'lucide-file' },
	];
}

function plugin(queue: OperationQueueService) {
	return {
		app: mockApp(),
		propertyIndex: { fileCount: 0 },
		operationsIndex: { nodes: [], subscribe: vi.fn(() => vi.fn()) },
		activeFiltersIndex: { subscribe: vi.fn(() => vi.fn()) },
		queueService: queue,
		filterService: { setSelectedFiles: vi.fn() },
		viewService: {
			clearSelection: vi.fn(),
			select: vi.fn(),
			setFocused: vi.fn(),
		},
		selectionService: new NodeSelectionService(),
	} as unknown as VaultmanPlugin;
}

describe('panelExplorer delete-conflict routing', () => {
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

	function renderPanel(opts: {
		queue: OperationQueueService;
		provider: ExplorerProvider;
	}) {
		const pluginStub = plugin(opts.queue);
		app = mount(PanelExplorer as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				plugin: pluginStub,
				provider: opts.provider,
				viewMode: 'tree',
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();
		return { pluginStub };
	}

	it('hover-delete on a node with no other queued ops bypasses the modal and queues delete', async () => {
		const queue = new OperationQueueService(mockApp());
		const opener = vi.fn() as unknown as DeleteConflictModalOpener;
		queue.deleteConflictModalOpener = opener;
		const handleHoverBadge = vi.fn();

		renderPanel({
			queue,
			provider: {
				id: EXPLORER_ID,
				getTree: vi.fn(() => nodes(false)),
				handleNodeClick: vi.fn(),
				handleContextMenu: vi.fn(),
				handleHoverBadge,
			},
		});

		const deleteBadge = target.querySelector<HTMLDivElement>(
			'[data-id="alpha"] [data-hover-kind="delete"]',
		);
		expect(deleteBadge).toBeTruthy();
		deleteBadge!.click();
		await Promise.resolve();
		await Promise.resolve();
		flushSync();

		expect(opener).not.toHaveBeenCalled();
		expect(handleHoverBadge).toHaveBeenCalledTimes(1);
		expect(handleHoverBadge).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'alpha' }),
			'delete',
			[expect.objectContaining({ id: 'alpha' })],
		);
	});

	it('hover-delete on a node with conflicting bound ops opens the modal opener', async () => {
		const queue = new OperationQueueService(mockApp());
		queue.bindOpToNode('alpha', { opId: 'op-1', kind: 'rename', label: 'rename' });
		const opener = vi.fn().mockResolvedValue('cancel') as unknown as DeleteConflictModalOpener;
		queue.deleteConflictModalOpener = opener;
		const handleHoverBadge = vi.fn();
		const warning = vi.spyOn(serviceMessage, 'warning').mockImplementation(() => null as never);

		renderPanel({
			queue,
			provider: {
				id: EXPLORER_ID,
				getTree: vi.fn(() => nodes(true)),
				handleNodeClick: vi.fn(),
				handleContextMenu: vi.fn(),
				handleHoverBadge,
			},
		});

		const deleteBadge = target.querySelector<HTMLDivElement>(
			'[data-id="alpha"] [data-hover-kind="delete"]',
		);
		expect(deleteBadge).toBeTruthy();
		deleteBadge!.click();
		await Promise.resolve();
		await Promise.resolve();
		flushSync();

		expect(opener).toHaveBeenCalledTimes(1);
		expect(warning).toHaveBeenCalledWith(
			expect.stringContaining('Delete conflicts'),
			expect.any(Object),
		);
		// modal cancelled → no enqueue
		expect(handleHoverBadge).not.toHaveBeenCalled();
		warning.mockRestore();
	});
});
