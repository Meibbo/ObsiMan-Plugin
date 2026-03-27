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
/** Default column width in pixels */
const DEFAULT_COL_WIDTH = 150;
/** Checkbox column width */
const CHECK_COL_WIDTH = 30;
/** Minimum column width during resize */
const MIN_COL_WIDTH = 60;

/**
 * Full-screen spreadsheet-like property grid with true virtual scrolling.
 *
 * Uses a single table with sticky thead for perfect column alignment.
 * Columns are resizable via drag handles on header borders.
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

	/** Column widths in pixels (index 0 = name, rest = property columns) */
	private colWidths: number[] = [];

	// Virtual scroll DOM elements
	private tableWrapperEl: HTMLElement | null = null;
	private tableEl: HTMLTableElement | null = null;
	private theadEl: HTMLElement | null = null;
	private tbodyEl: HTMLElement | null = null;

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

		// Initialize column widths if needed
		const totalCols = 1 + columns.length; // name + property columns
		if (this.colWidths.length !== totalCols) {
			this.colWidths = Array.from<number>({ length: totalCols }).map((_, i) =>
				i === 0 ? 220 : DEFAULT_COL_WIDTH
			);
		}

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

		// --- Single table with sticky header ---
		this.tableWrapperEl = this.containerEl.createDiv({
			cls: 'obsiman-grid-table-wrapper',
		});

		this.tableEl = this.tableWrapperEl.createEl('table', {
			cls: 'obsiman-grid-table obsiman-grid-fixed',
		});

		// Colgroup for explicit column widths
		this.rebuildColgroup();

		// Thead
		this.theadEl = this.tableEl.createEl('thead');
		this.buildHeaderRow();

		// Tbody (virtual rows)
		this.tbodyEl = this.tableEl.createEl('tbody') as unknown as HTMLElement;

		// Scroll listener
		if (this.scrollHandler) {
			this.tableWrapperEl.removeEventListener('scroll', this.scrollHandler);
		}
		this.scrollHandler = () => this.onScroll();
		this.tableWrapperEl.addEventListener('scroll', this.scrollHandler, { passive: true });

		this.rebuildBody();
	}

	/** Get TFile objects for currently selected paths (O(1) per file) */
	getSelectedFiles(): TFile[] {
		const result: TFile[] = [];
		for (const path of this.selectedPaths) {
			const file = this.app.vault.getFileByPath(path);
			if (file) result.push(file);
		}
		return result;
	}

	// --- Column width management ---

	private rebuildColgroup(): void {
		if (!this.tableEl) return;
		// Remove existing colgroup
		const existing = this.tableEl.querySelector('colgroup');
		if (existing) existing.remove();

		const colgroup = this.tableEl.createEl('colgroup');
		// Checkbox column
		const checkCol = colgroup.createEl('col');
		checkCol.style.width = `${CHECK_COL_WIDTH}px`;

		// Data columns (name + properties)
		for (let i = 0; i < this.colWidths.length; i++) {
			const col = colgroup.createEl('col');
			col.style.width = `${this.colWidths[i]}px`;
		}
	}

	private buildHeaderRow(): void {
		if (!this.theadEl) return;
		this.theadEl.empty();
		const headerRow = this.theadEl.createEl('tr');

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
		this.createSortableHeader(headerRow, 'name', t('files.col.name'), 0);

		// Dynamic property columns
		for (let i = 0; i < this.columns.length; i++) {
			this.createSortableHeader(headerRow, this.columns[i], this.columns[i], i + 1);
		}
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
		if (!this.tableWrapperEl || !this.tbodyEl) return;

		const scrollTop = this.tableWrapperEl.scrollTop;
		const viewportHeight = this.tableWrapperEl.clientHeight;
		const totalRows = this.sortedFiles.length;

		// Account for thead height
		const theadHeight = this.theadEl?.offsetHeight ?? 0;
		const adjustedScrollTop = Math.max(0, scrollTop - theadHeight);

		// Calculate visible range
		const startIdx = Math.max(0, Math.floor(adjustedScrollTop / ROW_HEIGHT) - OVERSCAN);
		const endIdx = Math.min(
			totalRows,
			Math.ceil((adjustedScrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN
		);

		// Only re-render if the range changed
		if (startIdx === this.renderedStart && endIdx === this.renderedEnd) return;

		this.renderedStart = startIdx;
		this.renderedEnd = endIdx;

		// Clear and re-render visible rows with spacer rows for virtual scroll
		this.tbodyEl.empty();

		// Top spacer row
		if (startIdx > 0) {
			const spacerRow = this.tbodyEl.createEl('tr');
			spacerRow.style.height = `${startIdx * ROW_HEIGHT}px`;
		}

		// Visible rows
		for (let i = startIdx; i < endIdx; i++) {
			this.renderRow(this.tbodyEl, this.sortedFiles[i], i);
		}

		// Bottom spacer row
		const remaining = totalRows - endIdx;
		if (remaining > 0) {
			const spacerRow = this.tbodyEl.createEl('tr');
			spacerRow.style.height = `${remaining * ROW_HEIGHT}px`;
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
		label: string,
		colIndex: number
	): void {
		const th = row.createEl('th', { cls: 'obsiman-grid-th-sortable' });

		// Label + sort arrow
		const labelSpan = th.createSpan({ cls: 'obsiman-grid-th-label' });
		const arrow =
			this.sortColumn === column
				? this.sortDirection === 'asc'
					? ' \u2191'
					: ' \u2193'
				: '';
		labelSpan.setText(label + arrow);

		if (this.sortColumn === column) {
			th.addClass('obsiman-grid-th-active');
		}

		labelSpan.addEventListener('click', () => {
			if (this.sortColumn === column) {
				this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
			} else {
				this.sortColumn = column;
				this.sortDirection = 'asc';
			}
			this.buildHeaderRow();
			this.rebuildBody();
		});

		// Resize handle
		const handle = th.createDiv({ cls: 'obsiman-grid-resize-handle' });
		handle.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.startResize(colIndex, e.clientX);
		});
	}

	private startResize(colIndex: number, startX: number): void {
		const startWidth = this.colWidths[colIndex];

		const onMove = (e: MouseEvent) => {
			const delta = e.clientX - startX;
			this.colWidths[colIndex] = Math.max(MIN_COL_WIDTH, startWidth + delta);
			this.rebuildColgroup();
		};

		const onUp = () => {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			document.body.removeClass('obsiman-resizing');
		};

		document.body.addClass('obsiman-resizing');
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
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
