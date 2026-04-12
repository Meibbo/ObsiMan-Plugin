// src/components/TagsExplorerPanel.ts
import { Component, Menu } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { TagsLogic } from '../logic/TagsLogic';
import { UnifiedTreeView } from './UnifiedTreeView';
import type { TreeNode, TagMeta } from '../types/tree';

export class TagsExplorerPanel extends Component {
	private plugin: ObsiManPlugin;
	private logic: TagsLogic;
	private view: UnifiedTreeView;
	private expandedIds = new Set<string>();
	private searchTerm = '';
	private searchMode: 'all' | 'leaf' = 'all';

	constructor(containerEl: HTMLElement, plugin: ObsiManPlugin) {
		super();
		this.plugin = plugin;
		this.logic = new TagsLogic(plugin.app);
		this.view = new UnifiedTreeView(containerEl);
	}

	onload(): void {
		this.registerEvent(
			this.plugin.app.metadataCache.on('resolved', () => {
				this.logic.invalidate();
				this._render();
			}),
		);
		this._render();
	}

	setSearchTerm(term: string, mode: 'all' | 'leaf' = 'all'): void {
		this.searchTerm = term;
		this.searchMode = mode;
		this._render();
	}

	private _render(): void {
		let tree = this.logic.getTree();

		if (this.searchMode === 'leaf') {
			tree = this._collectLeaves(tree);
		}
		if (this.searchTerm) {
			tree = this.logic.filterTree(tree, this.searchTerm);
		}

		const activeFilterIds = new Set<string>();
		for (const node of this._flattenTree(tree)) {
			if (this.plugin.filterService.hasTagFilter?.(`#${(node.meta as TagMeta).tagPath}`)) {
				activeFilterIds.add(node.id);
			}
		}

		// Resolve icons via Iconic
		const nodesWithIcons = this._resolveIcons(tree);

		this.view.render({
			nodes: nodesWithIcons,
			expandedIds: this.expandedIds,
			activeFilterIds,
			onToggle: (id) => {
				if (this.expandedIds.has(id)) this.expandedIds.delete(id);
				else this.expandedIds.add(id);
				this._render();
			},
			onRowClick: (id) => {
				const node = this._findNode(id, tree);
				if (!node) return;
				const meta = node.meta as TagMeta;
				void this.plugin.filterService.addNode({
					type: 'rule',
					filterType: 'has_tag',
					property: '',
					values: [`#${meta.tagPath}`],
				});
			},
			onContextMenu: (id, e) => this._showContextMenu(id, e, tree),
		});
	}

	private _resolveIcons(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		return nodes.map(node => {
			const meta = node.meta as TagMeta;
			const iconic = this.plugin.iconicService?.getTagIcon(meta.tagPath);
			return {
				...node,
				icon: iconic?.icon ?? 'lucide-tag',
				children: node.children ? this._resolveIcons(node.children as TreeNode<TagMeta>[]) : [],
			};
		});
	}

	private _showContextMenu(id: string, e: MouseEvent, tree: TreeNode<TagMeta>[]): void {
		const node = this._findNode(id, tree);
		if (!node) return;
		const meta = node.meta as TagMeta;
		const menu = new Menu();

		menu.addItem(item =>
			item.setTitle('Rename').setIcon('lucide-pencil').onClick(() => {
				void this._renameTag(meta.tagPath);
			}),
		);
		menu.addItem(item =>
			item.setTitle('Delete').setIcon('lucide-trash').onClick(() => {
				void this._deleteTag(meta.tagPath);
			}),
		);
		menu.addItem(item =>
			item.setTitle('Send to frontmatter').setIcon('lucide-arrow-up-to-line').onClick(() => {
				void this._sendToFrontmatter(meta.tagPath);
			}),
		);

		menu.showAtMouseEvent(e);
	}

	private async _renameTag(tagPath: string): Promise<void> {
		const newName = await this._prompt(`Rename #${tagPath} to:`);
		if (!newName) return;
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
				if (!fm.tags) return;
				const tags: string[] = Array.isArray(fm.tags) ? fm.tags : [fm.tags];
				fm.tags = tags.map(t => (t === tagPath || t === `#${tagPath}`) ? newName : t);
			});
		}
		this.logic.invalidate();
		this._render();
	}

	private async _deleteTag(tagPath: string): Promise<void> {
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
				if (!fm.tags) return;
				const tags: string[] = Array.isArray(fm.tags) ? fm.tags : [fm.tags];
				fm.tags = tags.filter(t => t !== tagPath && t !== `#${tagPath}`);
				if (fm.tags.length === 0) delete fm.tags;
			});
		}
		this.logic.invalidate();
		this._render();
	}

	private async _sendToFrontmatter(tagPath: string): Promise<void> {
		// Inline tags → add to frontmatter tags array
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			const inlineTags = (cache?.tags ?? []).map(t => t.tag);
			if (inlineTags.some(t => t === `#${tagPath}` || t === tagPath)) {
				await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
					const existing: string[] = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
					if (!existing.includes(tagPath)) {
						fm.tags = [...existing, tagPath];
					}
				});
			}
		}
		this.logic.invalidate();
		this._render();
	}

	private _prompt(message: string): Promise<string | null> {
		return new Promise(resolve => {
			const result = prompt(message);
			resolve(result);
		});
	}

	private _collectLeaves(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const leaves: TreeNode<TagMeta>[] = [];
		const walk = (ns: TreeNode<TagMeta>[]) => {
			for (const n of ns) {
				if (!n.children || n.children.length === 0) leaves.push({ ...n, children: [] });
				else walk(n.children as TreeNode<TagMeta>[]);
			}
		};
		walk(nodes);
		return leaves;
	}

	private _findNode(id: string, nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta> | null {
		for (const n of nodes) {
			if (n.id === id) return n;
			if (n.children) {
				const found = this._findNode(id, n.children as TreeNode<TagMeta>[]);
				if (found) return found;
			}
		}
		return null;
	}

	private _flattenTree(nodes: TreeNode<TagMeta>[]): TreeNode<TagMeta>[] {
		const result: TreeNode<TagMeta>[] = [];
		for (const n of nodes) {
			result.push(n);
			if (n.children) result.push(...this._flattenTree(n.children as TreeNode<TagMeta>[]));
		}
		return result;
	}
}
