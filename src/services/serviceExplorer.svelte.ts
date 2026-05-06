/* global $state, $derived */
import type { INodeIndex, IDecorationManager, NodeBase, IExplorer } from '../types/typeContracts';
import { ExplorerLogic } from '../logic/logicExplorer';

export interface ExplorerOptions<TNode extends NodeBase> {
	index: INodeIndex<TNode>;
	decorate: IDecorationManager;
}

export class ExplorerService<
	TNode extends NodeBase & { label?: string },
> implements IExplorer<TNode> {
	private logic = new ExplorerLogic();
	private idx: INodeIndex<TNode>;
	private dec: IDecorationManager;
	private subs = new Set<() => void>();

	selectedIds = $state(new Set<string>());
	expandedIds = $state(new Set<string>());
	search = $state('');
	filteredNodes: readonly TNode[] = $derived.by(() => this.applyFilter());

	constructor(opts: ExplorerOptions<TNode>) {
		this.idx = opts.index;
		this.dec = opts.decorate;
		this.idx.subscribe(() => this.fire());
		this.dec.subscribe(() => this.fire());
	}

	private applyFilter(): readonly TNode[] {
		if (!this.search) return this.idx.nodes;
		const q = this.search.toLowerCase();
		return this.idx.nodes.filter((n) =>
			((n as { label?: string }).label ?? '').toLowerCase().includes(q),
		);
	}

	private fire(): void {
		for (const cb of this.subs) cb();
	}

	toggleSelect(id: string): void {
		this.logic.toggleSelect(id);
		this.selectedIds = new Set(this.logic.selectedIds);
		this.fire();
	}
	toggleExpand(id: string): void {
		this.logic.toggleExpand(id);
		this.expandedIds = new Set(this.logic.expandedIds);
		this.fire();
	}
	setSearch(q: string): void {
		this.logic.setSearch(q);
		this.search = q;
		this.fire();
	}
	clearSelection(): void {
		this.logic.clearSelection();
		this.selectedIds = new Set();
		this.fire();
	}
	subscribe(cb: () => void): () => void {
		this.subs.add(cb);
		return () => this.subs.delete(cb);
	}
}
