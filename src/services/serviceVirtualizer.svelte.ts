import type { TreeNode } from '../types/typeNode';

export interface FlatNode<TMeta = unknown> {
	node: TreeNode<TMeta>;
	depth: number;
	isExpanded: boolean;
	hasChildren: boolean;
}

export interface VirtualWindow {
	startIndex: number;
	endIndex: number;
}

export class Virtualizer<T> {
	scrollTop = $state(0);
	items = $state<T[]>([]);
	rowHeight = $state(32);
	viewportHeight = $state(400);
	overscan = $state(5);

	window: VirtualWindow = $derived.by(() => {
		if (this.rowHeight <= 0 || this.items.length === 0) return { startIndex: 0, endIndex: 0 };
		const rawStart = Math.floor(this.scrollTop / this.rowHeight);
		const visible = Math.ceil(this.viewportHeight / this.rowHeight);
		const startIndex = Math.max(0, rawStart - this.overscan);
		const endIndex = Math.min(this.items.length, rawStart + visible + this.overscan);
		return { startIndex, endIndex };
	});

	visible: T[] = $derived.by(() => this.items.slice(this.window.startIndex, this.window.endIndex));
}

export class TreeVirtualizer<TMeta = unknown> extends Virtualizer<FlatNode<TMeta>> {
	flatten(nodes: readonly TreeNode<TMeta>[], expandedIds: ReadonlySet<string>): FlatNode<TMeta>[] {
		const out: FlatNode<TMeta>[] = [];
		const walk = (list: readonly TreeNode<TMeta>[], depth: number): void => {
			for (const n of list) {
				const hasChildren = !!n.children && n.children.length > 0;
				const isExpanded = hasChildren && expandedIds.has(n.id);
				out.push({ node: n, depth, isExpanded, hasChildren });
				if (isExpanded) walk(n.children!, depth + 1);
			}
		};
		walk(nodes, 0);
		return out;
	}
}
