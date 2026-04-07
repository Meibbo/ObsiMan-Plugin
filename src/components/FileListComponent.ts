import type { TFile, App } from 'obsidian';
import { t } from '../i18n/index';

export type SortColumn = 'name' | 'props' | 'path';
export type SortDirection = 'asc' | 'desc';

/**
 * Renders a checkable file list with search filtering and column sorting.
 * Designed for the sidebar — keeps rendering lightweight.
 */
export class FileListComponent {
	private containerEl: HTMLElement;
	private app: App;

	/** Currently displayed files (after search filter) */
	private displayedFiles: TFile[] = [];
	/** User-selected files */
	readonly selectedFiles: Set<string> = new Set();

	private searchTerm = '';
	private searchName = '';
	private searchFolder = '';
	private filterSelectedOnly = false;
	private sortColumn: SortColumn = 'name';
	private sortDirection: SortDirection = 'asc';

	/** Max files to render at once (performance guard for 1100+ file vault) */
	private readonly RENDER_LIMIT = 200;
	private showAll = false;

	/** Stored from last render call for re-renders */
	private currentFiles: TFile[] = [];
	private currentTotal = 0;

	/** Header checkbox ref for bulk toggle */
	private headerCheckbox: HTMLInputElement | null = null;

	private onSelectionChange: () => void;

	constructor(
		containerEl: HTMLElement,
		app: App,
		onSelectionChange: () => void
	) {
		this.containerEl = containerEl;
		this.app = app;
		this.onSelectionChange = onSelectionChange;
	}

	render(files: TFile[], totalCount: number): void {
		this.currentFiles = files;
		this.currentTotal = totalCount;
		this.containerEl.empty();

		// Header with count
		const headerEl = this.containerEl.createDiv({ cls: 'obsiman-files-header' });
		headerEl.createSpan({
			text: t('files.count', {
				filtered: files.length,
				total: totalCount,
			}),
			cls: 'obsiman-files-count',
		});

		// Search input
		const searchEl = headerEl.createEl('input', {
			cls: 'obsiman-files-search',
			attr: { type: 'text', placeholder: t('files.search') },
		});
		searchEl.value = this.searchTerm;
		searchEl.addEventListener('input', () => {
			this.searchTerm = searchEl.value;
			this.updateList();
		});

		// Column headers with header checkbox
		const colHeaderEl = this.containerEl.createDiv({ cls: 'obsiman-files-col-header' });

		// Header checkbox (select all / none)
		this.headerCheckbox = colHeaderEl.createEl('input', {
			cls: 'obsiman-file-checkbox',
			attr: { type: 'checkbox' },
		});
		this.headerCheckbox.addEventListener('change', () => {
			if (this.headerCheckbox!.checked) {
				for (const f of this.displayedFiles) this.selectedFiles.add(f.path);
			} else {
				for (const f of this.displayedFiles) this.selectedFiles.delete(f.path);
			}
			this.updateList();
			this.onSelectionChange();
		});

		this.createSortableHeader(colHeaderEl, 'name', t('files.col.name'));
		this.createSortableHeader(colHeaderEl, 'props', t('files.col.props'));
		this.createSortableHeader(colHeaderEl, 'path', t('files.col.path'));

		// File list container
		this.containerEl.createDiv({ cls: 'obsiman-files-list' });

		this.updateList();
	}

	private createSortableHeader(
		parent: HTMLElement,
		column: SortColumn,
		label: string,
	): void {
		const isActive = this.sortColumn === column;
		const arrow = isActive ? (this.sortDirection === 'asc' ? ' ↑' : ' ↓') : '';
		const el = parent.createEl('button', {
			cls: `obsiman-col-header ${isActive ? 'active' : ''}`,
			text: label + arrow,
		});
		el.addEventListener('click', () => {
			if (this.sortColumn === column) {
				this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
			} else {
				this.sortColumn = column;
				this.sortDirection = 'asc';
			}
			this.render(this.currentFiles, this.currentTotal);
		});
	}

	private updateList(): void {
		const listEl = this.containerEl.querySelector('.obsiman-files-list');
		if (!listEl) return;
		listEl.empty();

		// Apply search filters
		let filtered = this.currentFiles;
		if (this.searchTerm) {
			const term = this.searchTerm.toLowerCase();
			filtered = filtered.filter((f) => f.basename.toLowerCase().includes(term));
		}
		if (this.searchName) {
			filtered = filtered.filter((f) => f.basename.toLowerCase().includes(this.searchName));
		}
		if (this.searchFolder) {
			filtered = filtered.filter((f) => f.path.toLowerCase().includes(this.searchFolder));
		}
		if (this.filterSelectedOnly) {
			filtered = filtered.filter((f) => this.selectedFiles.has(f.path));
		}

		// Sort
		filtered = this.sortFiles(filtered);
		this.displayedFiles = filtered;

		// Render with limit
		const limit = this.showAll ? filtered.length : Math.min(filtered.length, this.RENDER_LIMIT);
		for (let i = 0; i < limit; i++) {
			this.renderFileRow(listEl as HTMLElement, filtered[i]);
		}

		// "Show more" button if needed
		if (!this.showAll && filtered.length > this.RENDER_LIMIT) {
			const moreBtn = (listEl as HTMLElement).createEl('button', {
				cls: 'obsiman-btn-small obsiman-show-more',
				text: `Show all ${filtered.length} files...`,
			});
			moreBtn.addEventListener('click', () => {
				this.showAll = true;
				this.updateList();
			});
		}

		// Update header checkbox state
		this.updateHeaderCheckbox();
	}

	private updateHeaderCheckbox(): void {
		if (!this.headerCheckbox) return;
		const total = this.displayedFiles.length;
		if (total === 0) {
			this.headerCheckbox.checked = false;
			this.headerCheckbox.indeterminate = false;
			return;
		}
		const selectedCount = this.displayedFiles.filter((f) => this.selectedFiles.has(f.path)).length;
		if (selectedCount === 0) {
			this.headerCheckbox.checked = false;
			this.headerCheckbox.indeterminate = false;
		} else if (selectedCount === total) {
			this.headerCheckbox.checked = true;
			this.headerCheckbox.indeterminate = false;
		} else {
			this.headerCheckbox.checked = false;
			this.headerCheckbox.indeterminate = true;
		}
	}

	private renderFileRow(parent: HTMLElement, file: TFile): void {
		const rowEl = parent.createDiv({ cls: 'obsiman-file-row' });

		// Checkbox
		const checkbox = rowEl.createEl('input', {
			cls: 'obsiman-file-checkbox',
			attr: { type: 'checkbox' },
		});
		checkbox.checked = this.selectedFiles.has(file.path);
		checkbox.addEventListener('change', () => {
			if (checkbox.checked) {
				this.selectedFiles.add(file.path);
			} else {
				this.selectedFiles.delete(file.path);
			}
			this.updateHeaderCheckbox();
			this.onSelectionChange();
		});

		// File name (clickable to open)
		const nameEl = rowEl.createSpan({
			cls: 'obsiman-file-name',
			text: file.basename,
		});
		nameEl.addEventListener('click', () => {
			void this.app.workspace.openLinkText(file.path, '', false);
		});

		// Property count
		const cache = this.app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter ?? {};
		const propCount = Object.keys(fm).filter((k) => k !== 'position').length;
		rowEl.createSpan({
			cls: 'obsiman-file-props',
			text: String(propCount),
		});

		// Path (folder only)
		const folder = file.parent?.path ?? '';
		rowEl.createSpan({
			cls: 'obsiman-file-path',
			text: folder,
		});
	}

	private sortFiles(files: TFile[]): TFile[] {
		const sorted = [...files];
		const dir = this.sortDirection === 'asc' ? 1 : -1;

		sorted.sort((a, b) => {
			switch (this.sortColumn) {
				case 'name':
					return dir * a.basename.localeCompare(b.basename, undefined, { sensitivity: 'base' });
				case 'props': {
					const aCount = this.getPropCount(a);
					const bCount = this.getPropCount(b);
					return dir * (aCount - bCount);
				}
				case 'path':
					return dir * (a.parent?.path ?? '').localeCompare(b.parent?.path ?? '');
				default:
					return 0;
			}
		});

		return sorted;
	}

	private getPropCount(file: TFile): number {
		const cache = this.app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter ?? {};
		return Object.keys(fm).filter((k) => k !== 'position').length;
	}

	/** Select all currently displayed files */
	selectAll(): void {
		for (const f of this.currentFiles) this.selectedFiles.add(f.path);
		this.updateList();
		this.onSelectionChange();
	}

	/** Deselect all files */
	deselectAll(): void {
		this.selectedFiles.clear();
		this.updateList();
		this.onSelectionChange();
	}

	/** Get TFile objects for currently selected files (O(1) per file) */
	getSelectedFiles(): TFile[] {
		const result: TFile[] = [];
		for (const path of this.selectedFiles) {
			const file = this.app.vault.getFileByPath(path);
			if (file) result.push(file);
		}
		return result;
	}

	/** Filter list by file name and/or folder substring (case-insensitive) */
	setSearchFilter(name: string, folder: string): void {
		this.searchName = name.toLowerCase().trim();
		this.searchFolder = folder.toLowerCase().trim();
		this.render(this.currentFiles, this.currentTotal);
	}

	/** Show only selected files or all files */
	showSelectedOnly(on: boolean): void {
		this.filterSelectedOnly = on;
		this.render(this.currentFiles, this.currentTotal);
	}
}
