// src/logic/PropsLogic.ts
import { prepareSimpleSearch, type App } from 'obsidian';
import type { TreeNode, PropMeta } from '../types/tree';

const COMPATIBLE_TYPES: Record<string, (v: unknown) => boolean> = {
	checkbox: (v) => v === true || v === false || v === 'true' || v === 'false',
	number: (v) => !isNaN(Number(v)),
	date: (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v),
	datetime: (v) => typeof v === 'string' && !isNaN(Date.parse(v as string)),
};

function isCompatible(value: unknown, type: string): boolean {
	const check = COMPATIBLE_TYPES[type];
	return check ? check(value) : true; // text, list, multitext always compatible
}

export class PropsLogic {
	private app: App;
	private _cache: TreeNode<PropMeta>[] | null = null;
	private _stale = true;

	constructor(app: App) {
		this.app = app;
	}

	invalidate(): void {
		this._stale = true;
	}

	getTree(): TreeNode<PropMeta>[] {
		if (this._stale || !this._cache) {
			this._cache = this._buildTree();
			this._stale = false;
		}
		return this._cache;
	}

	filterTree(nodes: TreeNode<PropMeta>[], term: string): TreeNode<PropMeta>[] {
		if (!term) return nodes;
		const search = prepareSimpleSearch(term);
		return this._filterNodes(nodes, search);
	}

	private _filterNodes(
		nodes: TreeNode<PropMeta>[],
		search: (text: string) => { score: number } | null,
	): TreeNode<PropMeta>[] {
		const result: TreeNode<PropMeta>[] = [];
		for (const node of nodes) {
			const filteredChildren = node.children
				? this._filterNodes(node.children, search)
				: [];
			if (!!search(node.label) || filteredChildren.length > 0) {
				result.push({ ...node, children: filteredChildren });
			}
		}
		return result;
	}

	private _buildTree(): TreeNode<PropMeta>[] {
		const allProps = (
			this.app.metadataCache as unknown as {
				getAllPropertyInfos(): Record<string, { type: string }>;
			}
		).getAllPropertyInfos?.() ?? {};

		// Collect all values per property from file caches
		const valueMap = new Map<string, Map<string, number>>();
		for (const file of this.app.vault.getMarkdownFiles()) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
			for (const [key, val] of Object.entries(fm)) {
				if (key === 'position') continue;
				if (!valueMap.has(key)) valueMap.set(key, new Map());
				const vals = Array.isArray(val) ? val : [val];
				for (const v of vals) {
					const str = String(v ?? '');
					valueMap.get(key)!.set(str, (valueMap.get(key)!.get(str) ?? 0) + 1);
				}
			}
		}

		const nodes: TreeNode<PropMeta>[] = [];
		for (const [propName, info] of Object.entries(allProps)) {
			const propType = info.type ?? 'text';
			const valuesMap = valueMap.get(propName) ?? new Map();
			const fileCount = Array.from(valuesMap.values()).reduce((a, b) => a + b, 0);

			const valueNodes: TreeNode<PropMeta>[] = Array.from(valuesMap.entries()).map(
				([rawValue, cnt]) => ({
					id: `${propName}::${rawValue}`,
					label: rawValue,
					count: cnt,
					depth: 1,
					children: [],
					meta: {
						propName,
						propType,
						isValueNode: true,
						rawValue,
						isTypeIncompatible: !isCompatible(rawValue, propType),
					},
				}),
			);

			nodes.push({
				id: propName,
				label: propName,
				count: fileCount,
				depth: 0,
				children: valueNodes,
				meta: { propName, propType, isValueNode: false },
			});
		}
		return nodes.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
	}
}
