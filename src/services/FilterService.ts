import { Component, Events, type App, type TFile } from 'obsidian';
import type { FilterGroup, FilterNode, FilterTemplate } from '../types/filter';
import { evalNode } from '../utils/filter-evaluator';

/**
 * Manages the active filter tree and computes the filtered file set.
 *
 * Emits 'changed' when filtered results update.
 */
export class FilterService extends Component {
	private app: App;
	private events = new Events();

	/** The root of the active filter tree */
	activeFilter: FilterGroup = { type: 'group', logic: 'all', children: [] };

	/** Files passing the active filter */
	filteredFiles: TFile[] = [];
	/** Files currently selected by the user in the file list (updated by FileListComponent) */
	selectedFiles: TFile[] = [];

	/** File name search applied alongside the filter tree */
	private _searchName = '';
	/** Folder path search applied alongside the filter tree */
	private _searchFolder = '';

	constructor(app: App) {
		super();
		this.app = app;
	}

	onload(): void {
		this.applyFilters();
	}

	on(name: 'changed', callback: () => void): void {
		this.events.on(name, callback);
	}

	off(name: 'changed', callback: () => void): void {
		this.events.off(name, callback);
	}

	/** Set a new filter tree and recompute */
	setFilter(filter: FilterGroup): void {
		this.activeFilter = filter;
		this.applyFilters();
	}

	/** Clear all filters (show all files) */
	clearFilters(): void {
		this.activeFilter = { type: 'group', logic: 'all', children: [] };
		this.applyFilters();
	}

	/** Add a child node to the root group */
	addNode(node: FilterNode, parent?: FilterGroup): void {
		const target = parent ?? this.activeFilter;
		target.children.push(node);
		this.applyFilters();
	}

	/** Remove a node from its parent */
	removeNode(node: FilterNode, parent?: FilterGroup): void {
		const target = parent ?? this.activeFilter;
		const idx = target.children.indexOf(node);
		if (idx !== -1) {
			target.children.splice(idx, 1);
			this.applyFilters();
		}
	}

	/** Set file name and folder search terms. Pass empty strings to clear. */
	setSearchFilter(name: string, folder: string): void {
		this._searchName = name;
		this._searchFolder = folder;
		this.applyFilters();
	}

	/** Load a saved filter template */
	loadTemplate(template: FilterTemplate): void {
		this.activeFilter = JSON.parse(JSON.stringify(template.root)) as FilterGroup;
		this.applyFilters();
	}

	/** Returns true if the tag is already in the active filter tree (stub — full impl in Iter.13) */
	hasTagFilter(_tagName: string): boolean {
		return false;
	}

	/** Recompute filtered files from the active filter tree + search fields */
	applyFilters(): void {
		const allFiles = this.app.vault.getMarkdownFiles();

		let base: TFile[];
		if (this.activeFilter.children.length === 0) {
			base = [...allFiles];
		} else {
			const getMeta = (file: TFile) =>
				this.app.metadataCache.getFileCache(file);
			const matchingPaths = evalNode(this.activeFilter, allFiles, getMeta);
			base = allFiles.filter((f) => matchingPaths.has(f.path));
		}

		// Apply search filters (AND with filter tree result)
		if (this._searchName) {
			const term = this._searchName.toLowerCase();
			base = base.filter((f) => f.basename.toLowerCase().includes(term));
		}
		if (this._searchFolder) {
			const term = this._searchFolder.toLowerCase();
			base = base.filter((f) =>
				(f.parent?.path ?? '').toLowerCase().includes(term)
			);
		}

		this.filteredFiles = base.sort((a, b) =>
			a.basename.localeCompare(b.basename, undefined, { sensitivity: 'base' })
		);

		this.events.trigger('changed');
	}
}
