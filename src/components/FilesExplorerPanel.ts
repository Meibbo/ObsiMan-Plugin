// src/components/FilesExplorerPanel.ts
import { Component, Menu, type TFile } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { FilesLogic } from '../logic/FilesLogic';
import { GridView } from './GridView';
import { UnifiedTreeView } from './UnifiedTreeView';
import type { TreeNode, FileMeta } from '../types/tree';

export type FilesViewMode = 'grid' | 'tree';

export class FilesExplorerPanel extends Component {
	private containerEl: HTMLElement;
	private plugin: ObsiManPlugin;
	private logic: FilesLogic;
	private gridView: GridView | null = null;
	private treeView: UnifiedTreeView | null = null;
	private expandedIds = new Set<string>();
	private viewMode: FilesViewMode = 'grid';
	private _currentFiles: TFile[] = [];
	private _totalCount = 0;

	constructor(containerEl: HTMLElement, plugin: ObsiManPlugin) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.logic = new FilesLogic(plugin.app);
	}

	onload(): void {
		this._mountView();
		this._render();
	}

	setViewMode(mode: FilesViewMode): void {
		this.viewMode = mode;
		this._mountView();
		this._render();
	}

	render(filteredFiles: TFile[], totalCount: number): void {
		this._currentFiles = filteredFiles;
		this._totalCount = totalCount;
		this._render();
	}

	private _mountView(): void {
		this.containerEl.empty();
		this.gridView = null;
		this.treeView = null;
		if (this.viewMode === 'grid') {
			this.gridView = new GridView(this.containerEl, this.plugin.app, {
				onContextMenu: (file, e) => this._showFileContextMenu(file, e),
				onSelectionChange: () => {},
				onFileClick: (file) => {
					void this.plugin.app.workspace.openLinkText(file.path, '', false);
				},
			});
		} else {
			this.treeView = new UnifiedTreeView(this.containerEl);
		}
	}

	private _render(): void {
		if (this.viewMode === 'grid' && this.gridView) {
			this.gridView.render(this._currentFiles, this._totalCount);
		} else if (this.viewMode === 'tree' && this.treeView) {
			const tree = this.logic.buildFileTree(this._currentFiles);
			this.treeView.render({
				nodes: tree as TreeNode[],
				expandedIds: this.expandedIds,
				onToggle: (id) => {
					if (this.expandedIds.has(id)) this.expandedIds.delete(id);
					else this.expandedIds.add(id);
					this._render();
				},
				onRowClick: (id) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					const meta = node.meta as FileMeta;
					if (!meta.isFolder && meta.file) {
						void this.plugin.app.workspace.openLinkText(meta.file.path, '', false);
					}
				},
				onContextMenu: (id, e) => {
					const node = this._findNode(id, tree);
					if (!node) return;
					const meta = node.meta as FileMeta;
					if (!meta.isFolder && meta.file) this._showFileContextMenu(meta.file, e);
				},
			});
		}
	}

	private _showFileContextMenu(file: TFile, e: MouseEvent): void {
		const menu = new Menu();
		menu.addItem(item =>
			item.setTitle('Rename').setIcon('lucide-pencil').onClick(() => {
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const modal = new (require('../modals/FileRenameModal').FileRenameModal)(
					this.plugin.app, file, this.plugin,
				);
				modal.open();
			}),
		);
		menu.addItem(item =>
			item.setTitle('Delete').setIcon('lucide-trash').onClick(() => {
				void this.plugin.app.vault.trash(file, true);
			}),
		);
		menu.addItem(item =>
			item.setTitle('Move file').setIcon('lucide-folder-input').onClick(() => {
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const modal = new (require('../modals/FileMoveModal').FileMoveModal)(
					this.plugin.app, file, this.plugin,
				);
				modal.open();
			}),
		);
		menu.showAtMouseEvent(e);
	}

	private _findNode(id: string, nodes: TreeNode<FileMeta>[]): TreeNode<FileMeta> | null {
		for (const n of nodes) {
			if (n.id === id) return n;
			if (n.children) {
				const found = this._findNode(id, n.children as TreeNode<FileMeta>[]);
				if (found) return found;
			}
		}
		return null;
	}

	getSelectedFiles(): TFile[] {
		return this.gridView?.getSelectedFiles() ?? [];
	}
}
