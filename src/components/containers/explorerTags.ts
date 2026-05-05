import { TagsLogic } from '../../logic/logicTags';
import type { TFile } from 'obsidian';
import type { TreeNode, TagMeta } from '../../types/typeNode';
import type { VaultmanPlugin } from '../../main';
import type { ExplorerProvider, ExplorerViewMode } from '../../types/typeExplorer';
import type { MenuCtx } from '../../types/typeCtxMenu';
import {
	highlightsFromViewLayers,
	nodeBadgesFromViewLayers,
	withViewStateClasses,
} from '../../utils/utilViewLayers';

export class explorerTags implements ExplorerProvider<TagMeta> {
	id = 'tags';
	private plugin: VaultmanPlugin;
	private logic: TagsLogic;
	private searchTerm = '';
	private searchMode: 'all' | 'leaf' = 'all';
	private sortBy: string = 'name';
	private sortDir: 'asc' | 'desc' = 'asc';
	private addMode = false;

	constructor(plugin: VaultmanPlugin) {
		this.plugin = plugin;
		this.logic = new TagsLogic(plugin.app);
		this.registerActions();
	}

	private registerActions() {
		const svc = this.plugin.contextMenuService;

		svc.registerAction({
			id: 'tag.rename',
			nodeTypes: ['tag'],
			surfaces: ['panel', 'file-menu'],
			label: 'Rename',
			icon: 'lucide-pencil',
			run: () => {
				// In Svelte version, rename can be triggered via editingId in the component
				// This would need a way to set editingId from the context menu
			},
		});

		svc.registerAction({
			id: 'tag.delete',
			nodeTypes: ['tag'],
			surfaces: ['panel'],
			label: (ctx) => {
				const nodes = this.contextTagNodes(ctx);
				return nodes.length > 1 ? `Delete ${nodes.length} tags` : 'Delete';
			},
			icon: 'lucide-trash-2',
			run: (ctx) => {
				for (const node of this.contextTagNodes(ctx)) this._deleteTag(node.meta.tagPath);
			},
		});
	}

	getTree(): TreeNode<TagMeta>[] {
		this.logic.invalidate();
		let tree = this.logic.getTree();
		if (this.searchMode === 'leaf') tree = this._collectLeaves(tree);
		if (this.searchTerm) tree = this.logic.filterTree(tree, this.searchTerm);
		tree = this._applySort(tree);

		return this._decorateTree(tree);
	}

	private _decorateTree(nodes: TreeNode<TagMeta>[], parentDeleted = false): TreeNode<TagMeta>[] {
		const operations = [...this.plugin.operationsIndex.nodes];
		const activeFilters = [...this.plugin.activeFiltersIndex.nodes];
		return nodes.map((node) => {
			const meta = node.meta;
			let currentCls = node.cls || '';
			const viewRow = this.plugin.viewService.getModel({
				explorerId: this.id,
				mode: 'tree',
				nodes: [node],
				operations,
				activeFilters,
				getLabel: (item) => item.label,
				getDecorationContext: () => ({
					kind: 'tag',
					highlightQuery: this.searchTerm,
					iconicIcon: this.plugin.iconicService?.getTagIcon(meta.tagPath)?.icon ?? null,
					tagPath: meta.tagPath,
				}),
			}).rows[0];
			const highlights = highlightsFromViewLayers(viewRow.layers);
			if (highlights && !currentCls.includes('vm-search-highlight')) {
				currentCls = `${currentCls} vm-search-highlight`.trim();
			}
			currentCls = withViewStateClasses(currentCls, viewRow.layers, {
				deletedClass: 'is-deleted-tag',
			});
			if (parentDeleted) {
				currentCls = withViewStateClasses(
					currentCls,
					{ state: { deleted: true } },
					{ deletedClass: 'is-deleted-tag' },
				);
			}
			const isEffectivelyDeleted = parentDeleted || viewRow.layers.state?.deleted === true;
			const resolvedChildren = node.children
				? this._decorateTree(node.children, isEffectivelyDeleted)
				: [];

			return {
				...node,
				cls: currentCls,
				icon: viewRow.icon,
				highlights,
				badges: nodeBadgesFromViewLayers(viewRow.layers, operations),
				children: resolvedChildren,
			};
		});
	}

	handleNodeClick(node: TreeNode<TagMeta>): void {
		const meta = node.meta;
		if (this.addMode) {
			void this.plugin.queueService.add({
				type: 'tag',
				tag: meta.tagPath,
				action: 'add',
				details: `Add tag "#${meta.tagPath}"`,
				files: this.operationScopeFiles(),
				customLogic: true,
				logicFunc: (_file, fm: Record<string, unknown>) => {
					const raw = fm.tags;
					const coerce = (v: unknown): string =>
						typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
					const tags = Array.isArray(raw) ? (raw as string[]) : raw ? [coerce(raw)] : [];
					if (tags.includes(meta.tagPath)) return null;
					return { tags: [...tags, meta.tagPath] };
				},
			});
			return;
		}

		const tagId = `#${meta.tagPath}`;
		if (this.plugin.filterService.hasTagFilter(tagId)) {
			void this.plugin.filterService.removeNodeByTag(tagId);
		} else {
			void this.plugin.filterService.addNode({
				type: 'rule',
				filterType: 'has_tag',
				property: '',
				values: [tagId],
			});
		}
	}

	handleContextMenu(node: TreeNode<TagMeta>, e: MouseEvent, selectedNodes: TreeNode<TagMeta>[] = []): void {
		this.plugin.contextMenuService.openPanelMenu(
			{ nodeType: 'tag', node: node, selectedNodes, surface: 'panel' },
			e,
		);
	}

	getNodeType(_node: TreeNode<TagMeta>): 'tag' {
		return 'tag';
	}

	setSearchTerm(term: string, mode: 'all' | 'leaf' = 'all'): void {
		this.searchTerm = term;
		this.searchMode = mode;
	}

	setSortBy(sortBy: string, direction: 'asc' | 'desc'): void {
		this.sortBy = sortBy;
		this.sortDir = direction;
	}

	setViewMode(_mode: ExplorerViewMode): void {}
	setAddMode(active: boolean): void {
		this.addMode = active;
	}

	private _applySort(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const dir = this.sortDir === 'asc' ? 1 : -1;
		return [...nodes].sort((a, b) => {
			if (this.sortBy === 'count') return dir * ((a.count ?? 0) - (b.count ?? 0));
			return dir * a.label.localeCompare(b.label);
		});
	}

	private _collectLeaves(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const leaves: TreeNode<TagMeta>[] = [];
		const walk = (ns: TreeNode<TagMeta>[]) => {
			for (const n of ns) {
				if (!n.children || n.children.length === 0) leaves.push({ ...n, children: [] });
				else walk(n.children);
			}
		};
		walk(nodes);
		return leaves;
	}

	private _deleteTag(tagPath: string): void {
		const files = this.operationScopeFiles().filter((file) => {
			const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
			return tagListContains(fm.tags, tagPath);
		});
		this.plugin.queueService.add({
			type: 'tag',
			tag: tagPath,
			action: 'delete',
			details: `Delete tag "#${tagPath}"`,
			files,
			customLogic: true,
			logicFunc: (_file, fm: Record<string, unknown>) => {
				if (!tagListContains(fm.tags, tagPath)) return null;
				return { tags: removeTagValue(fm.tags, tagPath) };
			},
		});
	}

	private contextTagNodes(ctx: MenuCtx): TreeNode<TagMeta>[] {
		const selected = (ctx.selectedNodes ?? []) as TreeNode<TagMeta>[];
		return selected.length > 0 ? selected : [ctx.node as TreeNode<TagMeta>];
	}

	private operationScopeFiles(): TFile[] {
		const allFiles = this.plugin.app.vault.getMarkdownFiles();
		const filteredFiles = [...(this.plugin.filterService.filteredFiles ?? [])] as TFile[];
		const selectedFiles = [...(this.plugin.filterService.selectedFiles ?? [])] as TFile[];
		const scope = this.plugin.settings?.explorerOperationScope ?? 'filtered';
		if (scope === 'all') return allFiles;
		if (scope === 'selected') return selectedFiles;
		if (scope === 'filtered') return filteredFiles.length > 0 ? filteredFiles : allFiles;
		if (selectedFiles.length > 0) return selectedFiles;
		if (filteredFiles.length > 0) return filteredFiles;
		return allFiles;
	}
}

function tagListContains(raw: unknown, tagPath: string): boolean {
	const expected = normalizeTag(tagPath);
	return tagValues(raw).some((tag) => normalizeTag(tag) === expected);
}

function removeTagValue(raw: unknown, tagPath: string): string[] {
	const expected = normalizeTag(tagPath);
	return tagValues(raw).filter((tag) => normalizeTag(tag) !== expected);
}

function tagValues(raw: unknown): string[] {
	if (Array.isArray(raw)) return (raw as unknown[]).map(tagValueToString);
	if (raw == null || raw === '') return [];
	return [tagValueToString(raw)];
}

function normalizeTag(value: string): string {
	return value.replace(/^#/, '');
}

function tagValueToString(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return String(value);
	}
	return JSON.stringify(value) ?? '';
}
