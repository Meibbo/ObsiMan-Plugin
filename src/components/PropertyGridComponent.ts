import { Component, MarkdownRenderer, Platform, setIcon, type App, type TFile } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import type { PendingChange } from '../types/operation';
import { t } from '../i18n/index';

export type SortColumn = string;
export type SortDirection = 'asc' | 'desc';

export interface GridCallbacks {
	onSelectionChange: (selectedPaths: Set<string>) => void;
	onInlineEdit: (change: PendingChange) => void;
	onSortChange?: (column: string, direction: SortDirection) => void;
	onColumnResize?: (colWidths: number[], columns: string[]) => void;
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
	private plugin: ObsiManPlugin;
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

	/** Last clicked row index for shift-click range selection */
	private lastClickedIndex = -1;

	/** Whether to show only checked (selected) files */
	private showOnlyChecked = false;

	/** Reference to the header checkbox for indeterminate state updates */
	private headerCheckbox: HTMLInputElement | null = null;

	/** Bound scroll handler for cleanup */
	private scrollHandler: (() => void) | null = null;

	/** Tracks cells already rendered with MarkdownRenderer to avoid re-processing */
	private renderedCells: WeakSet<HTMLElement> = new WeakSet();

	/** Chunk rendering queue for live preview */
	private renderChunkTimer: ReturnType<typeof setTimeout> | null = null;

	/** Lightweight Component for MarkdownRenderer lifecycle */
	private renderComponent = new Component();

	constructor(
		containerEl: HTMLElement,
		app: App,
		plugin: ObsiManPlugin,
		callbacks: GridCallbacks
	) {
		this.containerEl = containerEl;
		this.app = app;
		this.plugin = plugin;
		this.callbacks = callbacks;
	}

	render(
		files: TFile[],
		selectedPaths: Set<string>,
		columns: string[]
	): void {
		// Clean up previous render component children
		this.renderComponent.unload();
		this.renderComponent = new Component();
		this.renderComponent.load();

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

		// Show-only-checked toggle
		const filterToggle = headerBar.createDiv({
			cls: 'obsiman-grid-filter-toggle clickable-icon',
			attr: { 'aria-label': t('files.show_checked_only') },
		});
		setIcon(filterToggle, 'lucide-list-checks');
		if (this.showOnlyChecked) filterToggle.addClass('is-active');
		filterToggle.addEventListener('click', () => {
			this.showOnlyChecked = !this.showOnlyChecked;
			filterToggle.toggleClass('is-active', this.showOnlyChecked);
			this.rebuildBody();
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
		let totalWidth = CHECK_COL_WIDTH;
		for (let i = 0; i < this.colWidths.length; i++) {
			const col = colgroup.createEl('col');
			col.style.width = `${this.colWidths[i]}px`;
			totalWidth += this.colWidths[i];
		}

		// Set explicit table width so table-layout:fixed respects colgroup
		this.tableEl.style.width = `${totalWidth}px`;
		this.tableEl.style.minWidth = `${totalWidth}px`;
	}

	private buildHeaderRow(): void {
		if (!this.theadEl) return;
		this.theadEl.empty();
		const headerRow = this.theadEl.createEl('tr');

		// Checkbox column header with indeterminate support
		const thCheck = headerRow.createEl('th', { cls: 'obsiman-grid-th-check' });
		const checkAll = thCheck.createEl('input', {
			attr: { type: 'checkbox' },
		});
		this.headerCheckbox = checkAll;
		this.updateHeaderCheckbox();

		checkAll.addEventListener('click', (e) => {
			e.preventDefault();
			const someSelected = this.selectedPaths.size > 0;
			const allSelected =
				someSelected &&
				this.sortedFiles.every((f) => this.selectedPaths.has(f.path));

			if (someSelected && !allSelected) {
				// Indeterminate → select all visible (promote partial to full)
				for (const f of this.sortedFiles) this.selectedPaths.add(f.path);
				checkAll.checked = true;
				checkAll.indeterminate = false;
			} else if (allSelected) {
				// All selected → deselect all
				this.selectedPaths.clear();
				checkAll.checked = false;
				checkAll.indeterminate = false;
			} else {
				// None selected → select all visible
				for (const f of this.sortedFiles) this.selectedPaths.add(f.path);
				checkAll.checked = true;
				checkAll.indeterminate = false;
			}
			this.callbacks.onSelectionChange(new Set(this.selectedPaths));
			this.updateHeaderCheckbox();
			if (this.showOnlyChecked) { this.rebuildBody(); } else { this.updateVisibleCheckStates(); }
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
			files = files.filter((f) =>
				f.basename.toLowerCase().includes(term)
			);
		}

		// Filter to only checked files if toggle is active
		if (this.showOnlyChecked) {
			files = files.filter((f) => this.selectedPaths.has(f.path));
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

	private renderVisibleRows(force = false): void {
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

		// Only re-render if the range changed (unless forced by selection change)
		if (!force && startIdx === this.renderedStart && endIdx === this.renderedEnd) return;

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

		// Schedule live preview rendering if enabled
		const renderMode = this.plugin.settings.gridRenderMode ?? 'plain';
		if (renderMode !== 'plain') {
			this.scheduleLivePreviewChunk();
		}
	}

	private renderRow(tbody: HTMLElement, file: TFile, rowIndex: number): void {
		const isSelected = this.selectedPaths.has(file.path);
		const tr = tbody.createEl('tr', { cls: 'obsiman-grid-row' });
		tr.style.height = `${ROW_HEIGHT}px`;
		tr.dataset.rowIndex = String(rowIndex);
		if (isSelected) tr.addClass('is-selected');

		// Row-level click handler for Excel-like selection
		tr.addEventListener('click', (e) => {
			// Ignore clicks on checkboxes, links, and edit inputs
			const target = e.target as HTMLElement;
			if (
				target.tagName === 'INPUT' ||
				target.hasClass('obsiman-grid-name-link')
			)
				return;

			this.handleRowClick(rowIndex, e);
		});

		// Checkbox
		const tdCheck = tr.createEl('td', { cls: 'obsiman-grid-td-check' });
		const cb = tdCheck.createEl('input', {
			attr: { type: 'checkbox' },
		});
		cb.checked = isSelected;
		cb.addEventListener('click', (e) => {
			e.stopPropagation();
			// Checkbox always toggles (never clears others like row click does)
			if (e.shiftKey && this.lastClickedIndex >= 0) {
				const start = Math.min(this.lastClickedIndex, rowIndex);
				const end = Math.max(this.lastClickedIndex, rowIndex);
				if (!e.ctrlKey && !e.metaKey) this.selectedPaths.clear();
				for (let i = start; i <= end; i++) {
					this.selectedPaths.add(this.sortedFiles[i].path);
				}
			} else {
				if (this.selectedPaths.has(file.path)) {
					this.selectedPaths.delete(file.path);
				} else {
					this.selectedPaths.add(file.path);
				}
			}
			this.lastClickedIndex = rowIndex;
			cb.checked = this.selectedPaths.has(file.path);
			this.callbacks.onSelectionChange(new Set(this.selectedPaths));
			this.updateHeaderCheckbox();
			if (this.showOnlyChecked) { this.rebuildBody(); } else { this.updateVisibleCheckStates(); }
		});

		// File name: click text=open, dblclick cell=rename
		const tdName = tr.createEl('td', { cls: 'obsiman-grid-td-name' });
		const nameLink = tdName.createSpan({
			cls: 'obsiman-grid-name-link',
			text: file.basename,
		});
		nameLink.addEventListener('click', (e) => {
			e.stopPropagation();
			void this.app.workspace.openLinkText(file.path, '', false);
		});

		// Rename on double-click (if name column is editable)
		const editableCols = this.plugin.settings.gridEditableColumns ?? ['name'];
		if (editableCols.includes('name')) {
			tdName.addEventListener('dblclick', (e) => {
				e.stopPropagation();
				this.startNameEdit(tdName, file);
			});
		}

		// Property columns
		const cache = this.app.metadataCache.getFileCache(file);
		const fm = (cache?.frontmatter ?? {}) as Record<string, unknown>;

		for (const col of this.columns) {
			const td = tr.createEl('td', { cls: 'obsiman-grid-td-prop' });
			const value = fm[col];

			// Render tag-type columns as Obsidian tag chips
			const isTagCol = col === 'tags' ||
				this.plugin.propertyTypeService.getType(col) === 'tags';

			if (isTagCol && Array.isArray(value) && value.length > 0) {
				this.renderTagChips(td, value as unknown[]);
			} else {
				const text = this.formatValue(value);

				// Render with live preview or plain text
				const renderMode = this.plugin.settings.gridRenderMode ?? 'plain';
				const livePreviewCols = this.plugin.settings.gridLivePreviewColumns ?? [];
				const shouldRenderLive = renderMode !== 'plain' &&
					(livePreviewCols.length === 0 || livePreviewCols.includes(col));

				if (shouldRenderLive && text) {
					td.addClass('obsiman-grid-live-cell');
					// Queue for chunk rendering
					td.dataset.liveText = text;
					td.dataset.livePath = file.path;
					td.setText(text); // Plain text as fallback until rendered
				} else {
					td.setText(text);
				}
			}

			// Inline editing on double-click
			if (editableCols.length === 0 || editableCols.includes(col)) {
				td.addEventListener('dblclick', (e) => {
					e.stopPropagation();
					this.startInlineEdit(td, file, col, value);
				});
			}
		}
	}

	/** Rename a file via inline edit in the name cell */
	private startNameEdit(td: HTMLElement, file: TFile): void {
		const currentName = file.basename;
		td.empty();
		td.addClass('obsiman-grid-editing');

		const input = td.createEl('input', {
			cls: 'obsiman-grid-edit-input',
			attr: { type: 'text', value: currentName },
		});
		input.focus();
		input.select();

		const restoreNameLink = (name: string) => {
			td.empty();
			td.removeClass('obsiman-grid-editing');
			const nameLink = td.createSpan({
				cls: 'obsiman-grid-name-link',
				text: name,
			});
			nameLink.addEventListener('click', (ev) => {
				ev.stopPropagation();
				void this.app.workspace.openLinkText(file.path, '', false);
			});
		};

		const commit = async () => {
			const newName = input.value.trim();
			if (newName && newName !== currentName) {
				const newPath = file.path.replace(/[^/]+$/, newName + '.' + file.extension);
				try {
					await this.app.fileManager.renameFile(file, newPath);
					restoreNameLink(newName);
					return;
				} catch (err) {
					console.error('ObsiMan: rename failed', err);
				}
			}
			restoreNameLink(currentName);
		};

		input.addEventListener('blur', () => void commit());
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				input.blur();
			} else if (e.key === 'Escape') {
				input.removeEventListener('blur', () => void commit());
				restoreNameLink(currentName);
			}
		});
	}

	/** Process live preview cells in chunks after rendering */
	private scheduleLivePreviewChunk(): void {
		if (this.renderChunkTimer) clearTimeout(this.renderChunkTimer);
		this.renderChunkTimer = setTimeout(() => this.processLivePreviewChunk(), 16);
	}

	private processLivePreviewChunk(): void {
		if (!this.tbodyEl) return;
		const chunkSize = this.plugin.settings.gridRenderChunkSize ?? 100;
		const cells = this.tbodyEl.querySelectorAll('.obsiman-grid-live-cell');
		let processed = 0;

		for (const cell of cells) {
			const el = cell as HTMLElement;
			if (this.renderedCells.has(el)) continue;
			this.renderedCells.add(el);

			const text = el.dataset.liveText;
			const path = el.dataset.livePath;
			if (!text || !path) continue;

			el.empty();
			void MarkdownRenderer.render(this.app, text, el, path, this.renderComponent);
			processed++;
			if (processed >= chunkSize) {
				// Schedule next chunk
				this.renderChunkTimer = setTimeout(() => this.processLivePreviewChunk(), 16);
				return;
			}
		}
	}

	/**
	 * Excel-like selection logic:
	 * - Plain click: select only this row (clear others)
	 * - Ctrl+click: toggle this row without affecting others
	 * - Shift+click: range select from last clicked row
	 * - Ctrl+Shift+click: add range to existing selection
	 */
	private handleRowClick(rowIndex: number, e: MouseEvent): void {
		const file = this.sortedFiles[rowIndex];
		if (!file) return;

		if (e.shiftKey && this.lastClickedIndex >= 0) {
			// Range selection
			const start = Math.min(this.lastClickedIndex, rowIndex);
			const end = Math.max(this.lastClickedIndex, rowIndex);

			if (!e.ctrlKey && !e.metaKey) {
				// Shift only: replace selection with range
				this.selectedPaths.clear();
			}

			// Add range to selection
			for (let i = start; i <= end; i++) {
				this.selectedPaths.add(this.sortedFiles[i].path);
			}
		} else if (e.ctrlKey || e.metaKey) {
			// Toggle individual row
			if (this.selectedPaths.has(file.path)) {
				this.selectedPaths.delete(file.path);
			} else {
				this.selectedPaths.add(file.path);
			}
			this.lastClickedIndex = rowIndex;
		} else {
			// Plain click: select only this row
			this.selectedPaths.clear();
			this.selectedPaths.add(file.path);
			this.lastClickedIndex = rowIndex;
		}

		this.callbacks.onSelectionChange(new Set(this.selectedPaths));
		this.updateHeaderCheckbox();
		if (this.showOnlyChecked) { this.rebuildBody(); } else { this.updateVisibleCheckStates(); }
	}

	/** Update header checkbox state: unchecked, checked, or indeterminate with accent border */
	private updateHeaderCheckbox(): void {
		if (!this.headerCheckbox) return;
		const total = this.sortedFiles.length;
		const selectedCount = this.sortedFiles.filter((f) =>
			this.selectedPaths.has(f.path)
		).length;

		const thCheck = this.headerCheckbox.closest('th');

		if (selectedCount === 0 || selectedCount === 1) {
			// No accent for 0 or 1 selected (no group operation for single file)
			this.headerCheckbox.checked = false;
			this.headerCheckbox.indeterminate = false;
			thCheck?.removeClass('is-indeterminate');
		} else if (selectedCount === total) {
			// All selected — checked with accent
			this.headerCheckbox.checked = true;
			this.headerCheckbox.indeterminate = false;
			thCheck?.addClass('is-indeterminate');
		} else {
			// Partial (>1) — indeterminate with accent
			this.headerCheckbox.checked = false;
			this.headerCheckbox.indeterminate = true;
			thCheck?.addClass('is-indeterminate');
		}
	}

	/** Patches checked/selected state on already-rendered rows without a full rebuild. */
	private updateVisibleCheckStates(): void {
		if (!this.tbodyEl) return;
		const rows = this.tbodyEl.querySelectorAll<HTMLTableRowElement>('tr.obsiman-grid-row');
		for (const tr of rows) {
			const idx = parseInt(tr.dataset.rowIndex ?? '', 10);
			if (isNaN(idx)) continue;
			const file = this.sortedFiles[idx];
			if (!file) continue;
			const isSelected = this.selectedPaths.has(file.path);
			tr.toggleClass('is-selected', isSelected);
			const cb = tr.querySelector<HTMLInputElement>('td.obsiman-grid-td-check input[type="checkbox"]');
			if (cb) cb.checked = isSelected;
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

	/** Renders tag values as Obsidian-style tag chips inside a cell element. */
	private renderTagChips(td: HTMLElement, values: unknown[]): void {
		td.empty();
		for (const val of values) {
			const tag = String(val).replace(/^#/, '');
			if (!tag) continue;
			const chip = td.createEl('a', { cls: 'tag' });
			chip.setAttribute('href', `#${tag}`);
			chip.textContent = `#${tag}`;
			chip.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				void this.app.workspace.openLinkText(`#${tag}`, '', false);
			});
		}
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
			this.callbacks.onSortChange?.(this.sortColumn, this.sortDirection);
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
			this.callbacks.onColumnResize?.(this.colWidths, this.columns);
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
