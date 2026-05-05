export type ExpansionTreeNode = {
	id: string;
	children?: ExpansionTreeNode[];
};

export type AutoExpansionOptions = {
	searchTerm: string;
	smallTreeThreshold?: number;
};

export type ResolveExpandedIdsOptions = {
	manualExpandedIds: ReadonlySet<string>;
	manualCollapsedIds: ReadonlySet<string>;
	autoExpandedIds: ReadonlySet<string>;
};

const DEFAULT_SMALL_TREE_THRESHOLD = 8;

export function collectAutoExpandedIds(
	nodes: readonly ExpansionTreeNode[],
	options: AutoExpansionOptions,
): Set<string> {
	const total = countTreeNodes(nodes);
	const shouldAutoExpand =
		options.searchTerm.trim().length > 0 ||
		total <= (options.smallTreeThreshold ?? DEFAULT_SMALL_TREE_THRESHOLD);

	if (!shouldAutoExpand) return new Set();
	return collectExpandableIds(nodes);
}

export function resolveExpandedIds(options: ResolveExpandedIdsOptions): Set<string> {
	const expanded = new Set([...options.autoExpandedIds, ...options.manualExpandedIds]);
	for (const id of options.manualCollapsedIds) expanded.delete(id);
	return expanded;
}

export function countTreeNodes(nodes: readonly ExpansionTreeNode[]): number {
	let count = 0;
	const walk = (items: readonly ExpansionTreeNode[]) => {
		for (const node of items) {
			count++;
			if (node.children) walk(node.children);
		}
	};
	walk(nodes);
	return count;
}

function collectExpandableIds(nodes: readonly ExpansionTreeNode[]): Set<string> {
	const ids = new Set<string>();
	const walk = (items: readonly ExpansionTreeNode[]) => {
		for (const node of items) {
			if (node.children && node.children.length > 0) {
				ids.add(node.id);
				walk(node.children);
			}
		}
	};
	walk(nodes);
	return ids;
}
