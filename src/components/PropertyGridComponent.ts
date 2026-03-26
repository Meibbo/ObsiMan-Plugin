import { Platform, type App, type TFile } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import type { PendingChange } from '../types/operation';
import { t } from '../i18n/index';

export type SortColumn = string;
export type SortDirection = 'asc' | 'desc';

export interface GridCallbacks {
	onSelectionChange: (selectedPaths: Set<string>) => void;
	onInlineEdit: (change: PendingChange) => void;
}

/** Row height in pixels — used for virtual scroll calculations */
const ROW_HEIGHT = Platform.isMobile ? 44 : 28;
/** Extra rows rendered above/below the visible area */
const OVERSCAN = 8;

/**
 * Full-screen spreadsheet-like property grid with true virtual scrolling.
 *
 * Only renders rows visible in the viewport + overscan buffer.
 * Spacer divs above/below maintain correct scroll height.
 */
export class PropertyGridComponent {
	private containerEl: HTMLElement;
	private app: App;
	private callbacks: GridCallbacks;

	/** Currently displayed files (after filter + sort) */
	private sortedFiles: TFile[] = [];
	/** All files passed to render() — needed for re-sort on column click */
	private allFiles: TFile[] = [];
	/** User-selected file paths */
	readonly selectedPaths: Set<string> = new Set();

	private columns: string[] = [];
	private searchTerm = '';
	private sortColumn: SortColumn = 'name';
	private sortDirection: SortDirection = 'asc';

	// Virtual scroll DOM elements
	private tableWrapperEl: HTMLElement | null = null;
	private tbodyEl: HTMLElement | null = null;
	private topSpacerEl: HTMLElement | null = null;
	private bottomSpacerEl: HTMLElement | null = null;

	/** Currently rendered row range (inclusive start, exclusive end) */
	private renderedStart = 0;
	private renderedEnd = 0;

	/** Last checkbox index for shift-click range selection */
	private lastCheckboxIndex = -1;

	/** Bound scroll handler for cleanup */
	private scrollHandler: (() => void) | null = null;

	constructor(
		containerEl: HTMLElement,
		app: App,
		_plugin: ObsiManPlugin,
		callbacks: GridCallbacks
	) {
		this.containerEl = containerEl;
		this.app = app;
		this.callbacks = callbacks;
	}

	render(
		files: TFile[],
		selectedPaths: Set<string>,
		columns: string[]
	): void {
		this.containerEl.empty();
		this.columns = columns;
		this.allFiles = files;

		// Merge incoming selection
		this.selectedPaths.clear();
		for (const p of selectedPaths) this.selectedPaths.add(p);

		// --- Header bar ---
		const headerBar = this.containerEl.createDiv({ cls: 'obsiman-grid-header' });

		// Search
		const searchEl = headerBar.createEl('input', {
			cls: 'obsiman-grid-search',
			attr: { type: 'text', placeholder: t('files.search') },
		});
		searchEl.value = this.searchTerm;
		searchEl.addEventListener('input', () => {
			this.searchTerm = searchEl.value;
			this.rebuildBody();
		});

		// Bulk select
		const bulkEl = headerBar.createDiv({ cls: 'obsiman-grid-bulk' });
		const selectAllBtn = bulkEl.createEl('button', {
			cls: 'obsiman-btn-small',
			text: t('files.select_all'),
		});
		selectAllBtn.addEventListener('click', () => {
			for (const f of this.sortedFiles) this.selectedPaths.add(f.path);
			this.callbacks.onSelectionChange(new Set(this.selectedPaths));
			this.renderVisibleRows();
		});

		const deselectBtn = bulkEl.createEl('button', {
			cls: 'obsiman-btn-small',
			text: t('files.select_none'),
		});
		deselectBtn.addEventListener('click', () => {
			this.selectedPaths.clear();
			this.callbacks.onSelectionChange(new Set(this.selectedPaths));
			this.renderVisibleRows();
		});

		// --- Table ---
		this.tableWrapperEl = this.containerEl.createDiv({
			cls: 'obsiman-grid-table-wrapper',
		});
		const table = this.tableWrapperEl.createEl('table', { cls: 'obsiman-grid-table' });

		// Thead
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');

		// Checkbox column header
		const thCheck = headerRow.createEl('th', { cls: 'obsiman-grid-th-check' });
		const checkAll = thCheck.createEl('input', {
			attr: { type: 'checkbox' },
		});
		checkAll.addEventListener('change', () => {
			if (checkAll.checked) {
				for (const f of this.sortedFiles) this.selectedPaths.add(f.path);
			} else {
				this.selectedPaths.clear();
			}
			this.callbacks.onSelectionChange(new Set(this.selectedPaths));
			this.renderVisibleRows();
		});

		// Name column
		this.createSortableHeader(headerRow, 'name', t('files.col.name'));

		// Dynamic property columns
		for (const col of this.columns) {
			this.createSortableHeader(headerRow, col, col);
		}

		// Top spacer
		this.topSpacerEl = this.tableWrapperEl.createDiv({ cls: 'obsiman-grid-spacer' });

		// Tbody (will hold only visible rows)
		const tbodyTable = this.tableWrapperEl.createEl('table', { cls: 'obsiman-grid-table obsiman-grid-body-table' });
		this.tbodyEl = tbodyTable.createEl('tbody') as unknown as HTMLElement;

		// Bottom spacer
		this.bottomSpacerEl = this.tableWrapperEl.createDiv({ cls: 'obsiman-grid-spacer' });

		// Scroll listener
		if (this.scrollHandler) {
			this.tableWrapperEl.removeEventListener('scroll', this.scrollHandler);
		}
		this.scrollHandler = () => this.onScroll();
		this.tableWrapperEl.addEventListener('scroll', this.scrollHandler, { passive: true });

		this.rebuildBody();
	}

	/** Get TFile objects for currently selected paths */
	getSelectedFiles(): TFile[] {
		return this.app.vault
			.getMarkdownFiles()
			.filter((f) => this.selectedPaths.has(f.path));
	}

	// --- Virtual scroll core ---

	private rebuildBody(): void {
		// Filter by search
		let files = this.allFiles;
		if (this.searchTerm) {
			const term = this.searchTerm.toLowerCase();
			files = this.allFiles.filter((f) =>
				f.basename.toLowerCase().includes(term)
			);
		}

		// Sort
		this.sortedFiles = this.sortFiles(files);

		// Reset scroll position and render
		this.renderedStart = 0;
		this.renderedEnd = 0;
		if (this.tableWrapperEl) {
			this.tableWrapperEl.scrollTop = 0;
		}
		this.renderVisibleRows();
	}

	private onScroll(): void {
		this.renderVisibleRows();
	}

	private renderVisibleRows(): void {
		if (!this.tableWrapperEl || !this.tbodyEl || !this.topSpacerEl || !this.bottomSpacerEl) return;

		const scrollTop = this.tableWrapperEl.scrollTop;
		const viewportHeight = this.tableWrapperEl.clientHeight;
		const totalRows = this.sortedFiles.length;

		// Calculate visible range
		const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
		const endIdx = Math.min(
			totalRows,
			Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN
		);

		// Update spacers
		this.topSpacerEl.style.height = `${startIdx * ROW_HEIGHT}px`;
		this.bottomSpacerEl.style.height = `${Math.max(0, (totalRows - endIdx) * ROW_HEIGHT)}px`;

		// Only re-render if the range changed
		if (startIdx === this.renderedStart && endIdx === this.renderedEnd) return;

		this.renderedStart = startIdx;
		this.renderedEnd = endIdx;

		// Clear and re-render visible rows
		this.tbodyEl.empty();
		for (let i = startIdx; i < endIdx; i++) {
			this.renderRow(this.tbodyEl, this.sortedFiles[i], i);
		}
	}

	private renderRow(tbody: HTMLElement, file: TFile, rowIndex: number): void {
		const tr = tbody.createEl('tr', { cls: 'obsiman-grid-row' });
		tr.style.height = `${ROW_HEIGHT}px`;

		// Checkbox
		const tdCheck = tr.createEl('td', { cls: 'obsiman-grid-td-check' });
		const cb = tdCheck.createEl('input', {
			attr: { type: 'checkbox' },
		});
		cb.checked = this.selectedPaths.has(file.path);
		cb.addEventListener('change', (e) => {
			// Shift+click range selection
			if ((e as MouseEvent).shiftKey && this.lastCheckboxIndex >= 0) {
				const start = Math.min(this.lastCheckboxIndex, rowIndex);
				const end = Math.max(this.lastCheckboxIndex, rowIndex);
				for (let i = start; i <= end; i++) {
					if (cb.checked) {
						this.selectedPaths.add(this.sortedFiles[i].path);
					} else {
						this.selectedPaths.delete(this.sortedFiles[i].path);
					}
				}
				this.renderVisibleRows();
			} else {
				if (cb.checked) {
					this.selectedPaths.add(file.path);
				} else {
					this.selectedPaths.delete(file.path);
				}
			}
			this.lastCheckboxIndex = rowIndex;
			this.callbacks.onSelectionChange(new Set(this.selectedPaths));
		});

		// File name (clickable)
		const tdName = tr.createEl('td', { cls: 'obsiman-grid-td-name' });
		const nameLink = tdName.createSpan({
			cls: 'obsiman-grid-name-link',
			text: file.basename,
		});
		nameLink.addEventListener('click', () => {
			void this.app.workspace.openLinkText(file.path, '', false);
		});

		// Property columns
		const cache = this.app.metadataCache.getFileCache(file);
		const fm = (cache?.frontmatter ?? {}) as Record<string, unknown>;

		for (const col of this.columns) {
			const td = tr.createEl('td', { cls: 'obsiman-grid-td-prop' });
			const value = fm[col];
			td.setText(this.formatValue(value));

			// Inline editing on double-click
			td.addEventListener('dblclick', () => {
				this.startInlineEdit(td, file, col, value);
			});
		}
	}

	private startInlineEdit(
		td: HTMLElement,
		file: TFile,
		property: string,
		currentValue: unknown
	): void {
		const currentText = this.formatValue(currentValue);
		td.empty();
		td.addClass('obsiman-grid-editing');

		const input = td.createEl('input', {
			cls: 'obsiman-grid-edit-input',
			attr: { type: 'text', value: currentText },
		});
		input.focus();
		input.select();

		const commit = () => {
			const newText = input.value.trim();
			td.removeClass('obsiman-grid-editing');
			td.empty();
			td.setText(newText || currentText);

			if (newText !== currentText) {
				const newValue = this.parseEditedValue(newText, currentValue);

				const change: PendingChange = {
					property,
					action: 'set',
					details: `${property} = ${newText}`,
					files: [file],
					logicFunc: () => ({ [property]: newValue }),
					customLogic: false,
				};
				this.callbacks.onInlineEdit(change);
			}
		};

		const cancel = () => {
			td.removeClass('obsiman-grid-editing');
			td.empty();
			td.setText(currentText);
		};

		input.addEventListener('blur', commit);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				input.blur();
			} else if (e.key === 'Escape') {
				input.removeEventListener('blur', commit);
				cancel();
			} else if (e.key === 'Tab') {
				e.preventDefault();
				input.blur();
				// Move to next editable cell
				const nextTd = td.nextElementSibling as HTMLElement | null;
				if (nextTd?.hasClass('obsiman-grid-td-prop')) {
					nextTd.dispatchEvent(new MouseEvent('dblclick'));
				}
			}
		});
	}

	private formatValue(val: unknown): string {
		if (val === null || val === undefined) return '';
		if (Array.isArray(val)) return val.map(String).join(', ');
		if (typeof val === 'boolean') return val ? 'true' : 'false';
		return String(val as string | number | boolean);
	}

	private parseEditedValue(text: string, original: unknown): unknown {
		if (typeof original === 'number') {
			const n = Number(text);
			return isNaN(n) ? text : n;
		}
		if (typeof original === 'boolean') {
			return text.toLowerCase() === 'true' || text === '1';
		}
		if (Array.isArray(original)) {
			return text
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
		}
		return text;
	}

	private createSortableHeader(
		row: HTMLElement,
		column: string,
		label: string
	): void {
		const th = row.createEl('th', { cls: 'obsiman-grid-th-sortable' });
		const arrow =
			this.sortColumn === column
				? this.sortDirection === 'asc'
					? ' ↑'
					: ' ↓'
				: '';
		th.setText(label + arrow);

		if (this.sortColumn === column) {
			th.addClass('obsiman-grid-th-active');
		}

		th.addEventListener('click', () => {
			if (this.sortColumn === column) {
				this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
			} else {
				this.sortColumn = column;
				this.sortDirection = 'asc';
			}
			this.rebuildBody();
		});
	}

	private sortFiles(files: TFile[]): TFile[] {
		const sorted = [...files];
		const dir = this.sortDirection === 'asc' ? 1 : -1;

		sorted.sort((a, b) => {
			if (this.sortColumn === 'name') {
				return (
					dir *
					a.basename.localeCompare(b.basename, undefined, {
						sensitivity: 'base',
					})
				);
			}

			const aFm = this.app.metadataCache.getFileCache(a)?.frontmatter ?? {};
			const bFm = this.app.metadataCache.getFileCache(b)?.frontmatter ?? {};
			const aVal = this.formatValue(aFm[this.sortColumn]);
			const bVal = this.formatValue(bFm[this.sortColumn]);

			return dir * aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
		});

		return sorted;
	}
}
