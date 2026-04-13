// src/components/FilesExplorerPanel.ts
import { Component, Menu, type TFile } from 'obsidian';
import type { ObsiManPlugin } from '../../../main';
import { FilesLogic } from '../../logic/FilesLogic';
import { GridView } from '../layout/GridView';
import { UnifiedTreeView } from '../layout/UnifiedTreeView';
import type { TreeNode, FileMeta } from '../../types/tree';
import { FileRenameModal } from '../../modals/FileRenameModal';
import { FileMoveModal } from '../../modals/FileMoveModal';

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

	private onSelectionChange?: (count: number) => void;

	constructor(containerEl: HTMLElement, plugin: ObsiManPlugin, onSelectionChange?: (count: number) => void) {
		super();
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.logic = new FilesLogic(plugin.app);
		this.onSelectionChange = onSelectionChange;
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

	setSearchFilter(name: string, folder: string): void {
		const base = this.plugin.filterService.filteredFiles;
		const total = this.plugin.propertyIndex.fileCount;
		this._currentFiles = this.logic.filterFlat(base, name, folder);
		this._totalCount = total;
		this._render();
	}

	private _mountView(): void {
		this.containerEl.empty();
		this.gridView = null;
		this.treeView = null;
		if (this.viewMode === 'grid') {
			this.gridView = new GridView(this.containerEl, this.plugin.app, {
				onContextMenu: (file: TFile, e: MouseEvent) => this._showFileContextMenu(file, e),
				onSelectionChange: (selected: Set<string>) => {
					if (this.onSelectionChange) this.onSelectionChange(selected.size);
				},
				onFileClick: (file: TFile) => {
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
				onToggle: (id: string) => {
					if (this.expandedIds.has(id)) this.expandedIds.delete(id);
					else this.expandedIds.add(id);
					this._render();
				},
				onRowClick: (id: string) => {
					const node = this._findNode(id, tree as TreeNode<FileMeta>[]);
					if (!node) return;
					const meta = node.meta;
					if (!meta.isFolder && meta.file) {
						void this.plugin.app.workspace.openLinkText(meta.file.path, '', false);
					}
				},
				onContextMenu: (id: string, e: MouseEvent) => {
					const node = this._findNode(id, tree as TreeNode<FileMeta>[]);
					if (!node) return;
					const meta = node.meta;
					if (!meta.isFolder && meta.file) this._showFileContextMenu(meta.file, e);
				},
			});
		}
	}

	private _showFileContextMenu(file: TFile, e: MouseEvent): void {
		const menu = new Menu();
		menu.addItem(item =>
			item.setTitle('Rename').setIcon('lucide-pencil').onClick(() => {
				new FileRenameModal(
					this.plugin.app,
					this.plugin.propertyIndex,
					[file],
					(change) => this.plugin.queueService.add(change),
				).open();
			}),
		);
		menu.addItem(item =>
			item.setTitle('Delete').setIcon('lucide-trash').onClick(() => {
				void this.plugin.app.fileManager.trashFile(file);
			}),
		);
		menu.addItem(item =>
			item.setTitle('Move file').setIcon('lucide-folder-input').onClick(() => {
				new FileMoveModal(
					this.plugin.app,
					[file],
					(change) => this.plugin.queueService.add(change),
				).open();
			}),
		);
		menu.showAtMouseEvent(e);
	}

	private _findNode(id: string, nodes: TreeNode<FileMeta>[]): TreeNode<FileMeta> | null {
		for (const n of nodes) {
			if (n.id === id) return n;
			if (n.children) {
				const found = this._findNode(id, n.children);
				if (found) return found;
			}
		}
		return null;
	}

	getSelectedFiles(): TFile[] {
		return this.gridView?.getSelectedFiles() ?? [];
	}
}
