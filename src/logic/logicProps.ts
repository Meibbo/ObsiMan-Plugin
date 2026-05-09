// src/logic/PropsLogic.ts
import { prepareSimpleSearch, type App } from 'obsidian';
import type { TreeNode, PropMeta } from '../types/typeNode';
import type { IPropsIndex } from '../types/typeContracts';

const COMPATIBLE_TYPES: Record<string, (v: unknown) => boolean> = {
	checkbox: (v) => v === true || v === false || v === 'true' || v === 'false',
	number: (v) => !isNaN(Number(v)),
	date: (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v),
	datetime: (v) => typeof v === 'string' && !isNaN(Date.parse(v)),
};

function isCompatible(value: unknown, type: string): boolean {
	const check = COMPATIBLE_TYPES[type];
	return check ? check(value) : true; // text, list, multitext always compatible
}

export class PropsLogic {
	private app: App;
	private index: IPropsIndex;
	private _cache: TreeNode<PropMeta>[] | null = null;
	private _stale = true;

	constructor(app: App, index: IPropsIndex) {
		this.app = app;
		this.index = index;
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

	filterTree(nodes: TreeNode<PropMeta>[], term: string, mode: number = 0): TreeNode<PropMeta>[] {
		if (!term) return nodes;
		const search = prepareSimpleSearch(term);
		return this._filterNodes(nodes, search, mode);
	}

	private _filterNodes(
		nodes: TreeNode<PropMeta>[],
		search: (text: string) => { score: number } | null,
		mode: number,
	): TreeNode<PropMeta>[] {
		const result: TreeNode<PropMeta>[] = [];
		for (const node of nodes) {
			const isMatch = !!search(node.label);

			// If mode 0 (Props), we check match on property name (parent nodes)
			// If mode 1 (Values), we check match on value (child nodes)
			let currentMatches = false;
			if (mode === 0 && !node.meta.isValueNode && isMatch) {
				currentMatches = true;
			} else if (mode === 1 && node.meta.isValueNode && isMatch) {
				currentMatches = true;
			}

			// BUG-FIX: If we are in "Property Name" mode and the parent matches,
			// we keep ALL its children (values) so the user can explore them.
			const filteredChildren =
				mode === 0 && currentMatches
					? (node.children ?? [])
					: node.children
						? this._filterNodes(node.children, search, mode)
						: [];

			if (currentMatches || filteredChildren.length > 0) {
				result.push({ ...node, children: filteredChildren });
			}
		}
		return result;
	}

	private _buildTree(): TreeNode<PropMeta>[] {
		const allProps =
			(
				this.app.metadataCache as unknown as {
					getAllPropertyInfos(): Record<string, { type: string }>;
				}
			).getAllPropertyInfos?.() ?? {};

		const nodes: TreeNode<PropMeta>[] = [];
		for (const propNode of this.index.nodes) {
			const propName = propNode.property;
			const propInfo = allProps[propName];
			const propType = propInfo?.type ?? 'text';

			const valueNodes: TreeNode<PropMeta>[] = Object.entries(propNode.valueFrequencies)
				.map(([rawValue, cnt]) => ({
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
				}))
				.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

			nodes.push({
				id: propName,
				label: propName,
				count: propNode.fileCount,
				depth: 0,
				children: valueNodes,
				meta: { propName, propType, isValueNode: false },
			});
		}
		return nodes.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
	}
}
