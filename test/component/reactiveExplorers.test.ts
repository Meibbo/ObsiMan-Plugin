import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ContentTab from '../../src/components/pages/tabContent.svelte';
import ExplorerQueue from '../../src/components/explorers/explorerQueue.svelte';
import ExplorerActiveFilters from '../../src/components/explorers/explorerActiveFilters.svelte';
import type {
	ActiveFilterEntry,
	ContentMatch,
	INodeIndex,
	QueueChange,
} from '../../src/types/typeContracts';
import type { VaultmanPlugin } from '../../src/main';

class MutableIndex<TNode extends { id: string }> implements INodeIndex<TNode> {
	private current: TNode[] = [];
	private subs = new Set<() => void>();

	get nodes(): readonly TNode[] {
		return this.current;
	}

	async refresh(): Promise<void> {
		this.emit(this.current);
	}

	subscribe(cb: () => void): () => void {
		this.subs.add(cb);
		return () => this.subs.delete(cb);
	}

	byId(id: string): TNode | undefined {
		return this.current.find((node) => node.id === id);
	}

	emit(nodes: TNode[]): void {
		this.current = nodes;
		for (const cb of this.subs) cb();
	}
}

describe('reactive explorer components', () => {
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

	it('updates Content tab when contentIndex refreshes after a query', () => {
		const contentIndex = new MutableIndex<ContentMatch>();
		const plugin = {
			contentIndex: Object.assign(contentIndex, { setQuery: vi.fn() }),
		} as unknown as VaultmanPlugin;

		app = mount(ContentTab as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin, query: 'needle' },
		});
		flushSync();

		contentIndex.emit([
			{
				id: 'note.md:2:4',
				filePath: 'note.md',
				line: 2,
				before: 'before ',
				match: 'needle',
				after: ' after',
			},
		]);
		flushSync();

		expect(target.textContent).toContain('note.md:2');
		expect(target.textContent).toContain('needle');
	});

	it('updates Queue island when operationsIndex refreshes', () => {
		const operationsIndex = new MutableIndex<QueueChange>();
		const plugin = {
			operationsIndex,
			queueService: {
				remove: vi.fn(),
				clear: vi.fn(),
				execute: vi.fn(async () => undefined),
			},
		} as unknown as VaultmanPlugin;

		app = mount(ExplorerQueue as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin },
		});
		flushSync();

		operationsIndex.emit([
			{
				id: 'op-1',
				group: 'property',
				change: {
					id: 'op-1',
					type: 'property',
					action: 'set',
					details: 'Set status',
					files: [],
					customLogic: true,
					logicFunc: () => null,
				},
			},
		]);
		flushSync();

		expect(target.textContent).toContain('Set status');
	});

	it('updates Active Filters island when activeFiltersIndex refreshes', () => {
		const activeFiltersIndex = new MutableIndex<ActiveFilterEntry>();
		const plugin = {
			activeFiltersIndex,
			filterService: {
				filteredFiles: [],
				removeNode: vi.fn(),
				clearFilters: vi.fn(),
			},
		} as unknown as VaultmanPlugin;

		app = mount(ExplorerActiveFilters as unknown as Component<{ plugin: VaultmanPlugin }>, {
			target,
			props: { plugin },
		});
		flushSync();

		activeFiltersIndex.emit([
			{
				id: 'rule-1',
				rule: {
					id: 'rule-1',
					type: 'rule',
					filterType: 'has_property',
					property: 'status',
					values: [],
					enabled: true,
				},
			},
		]);
		flushSync();

		expect(target.textContent).toContain('has: status');
	});
});
