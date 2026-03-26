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

	/** Load a saved filter template */
	loadTemplate(template: FilterTemplate): void {
		this.activeFilter = JSON.parse(JSON.stringify(template.root)) as FilterGroup;
		this.applyFilters();
	}

	/** Recompute filtered files from the active filter tree */
	applyFilters(): void {
		const allFiles = this.app.vault.getMarkdownFiles();

		if (this.activeFilter.children.length === 0) {
			this.filteredFiles = [...allFiles];
		} else {
			const getMeta = (file: TFile) =>
				this.app.metadataCache.getFileCache(file);
			const matchingPaths = evalNode(this.activeFilter, allFiles, getMeta);
			this.filteredFiles = allFiles.filter((f) => matchingPaths.has(f.path));
		}

		// Sort by basename
		this.filteredFiles.sort((a, b) =>
			a.basename.localeCompare(b.basename, undefined, { sensitivity: 'base' })
		);

		this.events.trigger('changed');
	}
}
