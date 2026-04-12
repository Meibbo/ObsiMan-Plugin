import { getAllTags, Menu, Modal, Notice, Setting, setIcon, type App, type TFile } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import type { PendingChange } from '../types/operation';
import { DELETE_PROP } from '../types/operation';
import { PropertySuggest } from '../utils/autocomplete';
import { translate } from '../i18n/index';
import type { FilterGroup } from '../types/filter';

type SortMode = 'alpha' | 'count' | 'type' | 'values';
type ValueSortMode = 'value_alpha' | 'value_count';
type FilterScope = 'all' | 'filtered' | 'selected';

/** Default icons for property types (used when Iconic plugin is unavailable) */
const TYPE_ICON_MAP: Record<string, string> = {
	text: 'lucide-text',
	number: 'lucide-hash',
	checkbox: 'lucide-check-square',
	list: 'lucide-chevron-right',
	date: 'lucide-calendar',
	datetime: 'lucide-calendar-clock',
	aliases: 'lucide-forward',
	tags: 'lucide-tag',
	multitext: 'lucide-text-cursor-input',
};

/**
 * Hierarchical property explorer with nav toolbar, Iconic icons,
 * right-click context menus, Ctrl+click search, and queue preview.
 *
 * Level 1: Property name + icon + count
 * Level 2: Property values + count
 */
export class PropertyExplorerComponent {
	private containerEl: HTMLElement;
	private plugin: ObsiManPlugin;

	private treeEl: HTMLElement | null = null;
	private searchEl: HTMLInputElement | null = null;
	private searchWrapper: HTMLElement | null = null;
	private searchTerm = '';
	private searchVisible = false;
	private searchMode: 'properties' | 'values' = 'properties';

	private expandedProps = new Set<string>();
	private sortMode: SortMode = 'count';
	private valueSortMode: ValueSortMode = 'value_count';
	private filterScope: FilterScope = 'all';
	private filterByType: string | null = null;

	/** Reference to selected file paths from the file tree */
	private selectedFilePaths = new Set<string>();

	/** Cached file count map — invalidated on render */
	private cachedFileCounts: Map<string, Map<string, number>> | null = null;
	private cachedPropFileCounts: Map<string, number> | null = null;

	/** Pending timer IDs for cleanup */
	private pendingTimers: ReturnType<typeof setTimeout>[] = [];

	private onPropertyFilter?: (property: string, value: string) => void;

	// ── View Options ─────────────────────────────────────────
	private viewFormat: 'tree' | 'grid' | 'cards' = 'tree';
	private showCount = true;
	private showValues = true;
	private showPropIcon = true;
	private showPropName = true;
	private showType = false;
	private tagsOnly = false;
	private hideSearch = false;

	// ── Active Filters ────────────────────────────────────────
	private activeFilterProps = new Set<string>();
	private activeFilterValues = new Map<string, Set<string>>();

	constructor(containerEl: HTMLElement, plugin: ObsiManPlugin, options?: { defaultScope?: FilterScope; onPropertyFilter?: (property: string, value: string) => void; hideSearch?: boolean }) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		if (options?.defaultScope) {
			this.filterScope = options.defaultScope;
		}
		if (options?.onPropertyFilter) {
			this.onPropertyFilter = options.onPropertyFilter;
		}
		this.hideSearch = options?.hideSearch ?? false;
		if (this.hideSearch) {
			this.searchVisible = false;
		}
	}

	render(): void {
		this.containerEl.empty();
		this.containerEl.addClass('obsiman-explorer');
		this.invalidateCache();

		// Collapsible search with mode toggle
		if (!this.hideSearch) {
			this.searchWrapper = this.containerEl.createDiv({
				cls: `obsiman-explorer-search-collapsible ${this.searchVisible ? 'is-open' : ''}`,
			});
	
			const searchRow = this.searchWrapper.createDiv({ cls: 'obsiman-explorer-search-row' });
	
			// Input + clear button in a relative wrapper (clear overlaid inside input)
			const inputWrap = searchRow.createDiv({ cls: 'obsiman-explorer-search-input-wrap' });
	
			this.searchEl = inputWrap.createEl('input', {
				cls: 'obsiman-explorer-search-input',
				attr: {
					type: 'text',
					placeholder: this.searchMode === 'properties'
						? translate('explorer.search')
						: (translate('explorer.search_values') ?? 'Search values…'),
				},
			});
			this.searchEl.value = this.searchTerm;
	
			// Clear button — absolutely positioned inside the input wrapper
			const clearBtn = inputWrap.createDiv({
				cls: 'obsiman-explorer-search-clear clickable-icon',
				attr: { 'aria-label': translate('filters.search.clear') ?? 'Clear search' },
			});
			setIcon(clearBtn, 'lucide-x');
			clearBtn.addEventListener('click', () => {
				this.searchTerm = '';
				if (this.searchEl) this.searchEl.value = '';
				this.renderTree();
				clearBtn.toggleClass('is-hidden', true);
			});
			// Show only when there's text
			clearBtn.toggleClass('is-hidden', !this.searchTerm);
	
			// Search mode toggle: properties (key icon) ↔ values (tag icon)
			const modeBtn = searchRow.createDiv({
				cls: `clickable-icon obsiman-search-mode-toggle${this.searchMode === 'values' ? ' is-active' : ''}`,
				attr: {
					'aria-label': this.searchMode === 'properties'
						? (translate('explorer.search_mode_values') ?? 'Search values')
						: (translate('explorer.search_mode_props') ?? 'Search properties'),
				},
			});
			setIcon(modeBtn, this.searchMode === 'properties' ? 'lucide-tag' : 'lucide-key-round');
			modeBtn.addEventListener('click', () => {
				this.searchMode = this.searchMode === 'properties' ? 'values' : 'properties';
				this.render();
			});
	
			// Update clear button visibility on input
			this.searchEl.addEventListener('input', () => {
				this.searchTerm = this.searchEl?.value ?? '';
				clearBtn.toggleClass('is-hidden', !this.searchTerm);
				this.renderTree();
			});
		}

		// Tree container
		this.treeEl = this.containerEl.createDiv({ cls: 'obsiman-explorer-tree' });
		this.renderTree();
	}

	refresh(): void {
		this.invalidateCache();
		this.renderTree();
	}

	setSelectedFiles(paths: Set<string>): void {
		this.selectedFilePaths = paths;
		if (this.filterScope === 'selected') {
			this.invalidateCache();
			this.renderTree();
		}
	}

	// ── Nav Toolbar ──────────────────────────────────────────

	/** Toggle search input visibility */
	toggleSearch(): void {
		this.searchVisible = !this.searchVisible;
		this.searchWrapper?.toggleClass('is-open', this.searchVisible);
		if (this.searchVisible) this.searchEl?.focus();
		if (!this.searchVisible && this.searchTerm) {
			this.searchTerm = '';
			if (this.searchEl) this.searchEl.value = '';
			this.renderTree();
		}
	}

	showFilterMenu(e: MouseEvent): void {
		const menu = new Menu();

		// Scope options
		const scopes: { value: FilterScope; label: string }[] = [
			{ value: 'all', label: translate('explorer.filter.all_vault') },
			{ value: 'filtered', label: translate('explorer.filter.filtered') },
			{ value: 'selected', label: translate('explorer.filter.selected') },
		];
		for (const s of scopes) {
			menu.addItem((item) =>
				item
					.setTitle(s.label)
					.setChecked(this.filterScope === s.value)
					.onClick(() => {
						this.filterScope = s.value;
						this.invalidateCache();
						this.render();
					})
			);
		}

		menu.addSeparator();

		// By type submenu
		const types = this.plugin.propertyTypeService.getAllTypes();
		if (types.length > 0) {
			menu.addItem((item) => {
				item.setTitle(translate('explorer.filter.by_type'));
				const sub = (item as unknown as { setSubmenu: () => Menu }).setSubmenu();
				// "All types" option
				sub.addItem((si) =>
					si
						.setTitle('—')
						.setChecked(this.filterByType === null)
						.onClick(() => {
							this.filterByType = null;
							this.invalidateCache();
							this.render();
						})
				);
				for (const type of types) {
					sub.addItem((si) =>
						si
							.setTitle(type)
							.setIcon(TYPE_ICON_MAP[type] ?? 'lucide-text')
							.setChecked(this.filterByType === type)
							.onClick(() => {
								this.filterByType = type;
								this.invalidateCache();
								this.render();
							})
					);
				}
			});
		}

		menu.showAtMouseEvent(e);
	}

	showSortMenu(e: MouseEvent): void {
		const menu = new Menu();

		// Properties section header
		menu.addItem((item) => item.setTitle(translate('explorer.sort.section_props')).setDisabled(true));
		const propModes: { value: SortMode; label: string }[] = [
			{ value: 'alpha', label: translate('explorer.sort.alpha') },
			{ value: 'count', label: translate('explorer.sort.count') },
			{ value: 'type', label: translate('explorer.sort.type') },
			{ value: 'values', label: translate('explorer.sort.values') },
		];
		for (const m of propModes) {
			menu.addItem((item) =>
				item
					.setTitle(m.label)
					.setChecked(this.sortMode === m.value)
					.onClick(() => {
						this.sortMode = m.value;
						this.render();
					})
			);
		}

		menu.addSeparator();

		// Values section header
		menu.addItem((item) => item.setTitle(translate('explorer.sort.section_values')).setDisabled(true));
		const valueModes: { value: ValueSortMode; label: string }[] = [
			{ value: 'value_alpha', label: translate('explorer.sort.value_name') },
			{ value: 'value_count', label: translate('explorer.sort.value_count') },
		];
		for (const m of valueModes) {
			menu.addItem((item) =>
				item
					.setTitle(m.label)
					.setChecked(this.valueSortMode === m.value)
					.onClick(() => {
						this.valueSortMode = m.value;
						this.render();
					})
			);
		}

		menu.showAtMouseEvent(e);
	}

	openCreateProperty(): void {
		if (this.selectedFilePaths.size === 0) {
			new Notice(translate('explorer.warn.no_files_selected'));
			return;
		}
		new CreatePropertyModal(
			this.plugin.app,
			this.plugin,
			this.getOperationFiles()
		).open();
	}

	// ── Tree Rendering ──────────────────────────────────────

	private renderTree(): void {
		if (!this.treeEl) return;
		this.treeEl.toggleClass('obsiman-explorer-grid', this.viewFormat === 'grid' && !this.tagsOnly);
		this.treeEl.toggleClass('obsiman-explorer-cards', this.viewFormat === 'cards' && !this.tagsOnly);
		if (this.tagsOnly) {
			this.renderTagsOnlyTree();
			return;
		}
		if (this.viewFormat === 'grid') {
			this.renderGridView();
			return;
		}
		if (this.viewFormat === 'cards') {
			this.renderCardsView(null);
			return;
		}
		this.treeEl.empty();

		const index = this.plugin.propertyIndex.index;
		const fileCounts = this.getFileCountMap();
		const propFileCounts = this.getPropFileCounts();

		// Get property names
		let propNames = [...index.keys()];

		// In filtered/selected scope, hide properties with zero file count
		if (this.filterScope !== 'all') {
			propNames = propNames.filter((n) => (propFileCounts.get(n) ?? 0) > 0);
		}

		// Filter by search
		if (this.searchTerm) {
			const term = this.searchTerm.toLowerCase();
			if (this.searchMode === 'properties') {
				propNames = propNames.filter((n) => n.toLowerCase().includes(term));
			} else {
				// Value search: keep properties that have at least one matching value
				propNames = propNames.filter((n) => {
					const vals = index.get(n);
					if (!vals) return false;
					return [...vals].some((v) => v.toLowerCase().includes(term));
				});
			}
		}

		// Filter by type
		if (this.filterByType) {
			propNames = propNames.filter(
				(n) => this.plugin.propertyTypeService.getType(n) === this.filterByType
			);
		}

		// Sort
		propNames = this.sortProperties(propNames, index, propFileCounts);

		if (propNames.length === 0) {
			this.treeEl.createDiv({ cls: 'obsiman-explorer-empty', text: translate('explorer.empty') });
			return;
		}

		for (const propName of propNames) {
			this.renderPropertyNode(this.treeEl, propName, index, fileCounts, propFileCounts);
		}

		// Queue preview
		if (this.plugin.settings.explorerShowQueuePreview) {
			this.renderQueuePreview();
		}
	}

	private sortProperties(
		names: string[],
		index: Map<string, Set<string>>,
		propFileCounts: Map<string, number>
	): string[] {
		switch (this.sortMode) {
			case 'count':
				return names.sort((a, b) => (propFileCounts.get(b) ?? 0) - (propFileCounts.get(a) ?? 0));
			case 'type':
				return names.sort((a, b) => {
					const typeA = this.plugin.propertyTypeService.getType(a) ?? 'zzz';
					const typeB = this.plugin.propertyTypeService.getType(b) ?? 'zzz';
					if (typeA !== typeB) return typeA.localeCompare(typeB);
					return a.localeCompare(b, undefined, { sensitivity: 'base' });
				});
			case 'values':
				return names.sort((a, b) => (index.get(b)?.size ?? 0) - (index.get(a)?.size ?? 0));
			default:
				return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
		}
	}

	private renderPropertyNode(
		parent: HTMLElement,
		propName: string,
		index: Map<string, Set<string>>,
		fileCounts: Map<string, Map<string, number>>,
		propFileCounts: Map<string, number>
	): void {
		const values = index.get(propName);
		if (!values || values.size === 0) return;

		const isExpanded = this.expandedProps.has(propName);
		const totalFiles = propFileCounts.get(propName) ?? 0;

		const nodeEl = parent.createDiv({ cls: 'tree-item obsiman-explorer-node' });
		// Highlight if property is an active filter
		if (this.activeFilterProps.has(propName)) {
			nodeEl.addClass('is-active-filter');
		}

		// Pulse animation if matching search term
		if (this.searchTerm && this.searchMode === 'properties' && propName.toLowerCase().includes(this.searchTerm.toLowerCase())) {
			nodeEl.addClass('obsiman-search-highlight');
			// Remove class after animation finishes so it can re-trigger on next search
			setTimeout(() => { if (nodeEl && nodeEl.parentElement) nodeEl.removeClass('obsiman-search-highlight'); }, 800);
		}

		const headerEl = nodeEl.createDiv({
			cls: `tree-item-self is-clickable obsiman-explorer-header ${isExpanded ? '' : 'is-collapsed'}`,
		});

		// Toggle arrow (Lucide chevron)
		const toggleSpan = headerEl.createDiv({ cls: 'tree-item-icon collapse-icon obsiman-explorer-toggle' });
		setIcon(toggleSpan, isExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right');

		const innerEl = headerEl.createDiv({ cls: 'tree-item-inner' });

		// Property icon (Iconic custom → fallback to type icon; hidden only if both showPropIcon and showType are false)
		const iconData = this.plugin.iconicService.getIcon(propName);
		if (this.showPropIcon || this.showType) {
			const iconSpan = innerEl.createSpan({ cls: 'obsiman-explorer-icon' });
			if (iconData && this.showPropIcon) {
				setIcon(iconSpan, iconData.icon);
				if (iconData.color) iconSpan.style.color = `var(--color-${iconData.color})`;
			} else {
				const propType = this.plugin.propertyTypeService.getType(propName) ?? 'text';
				setIcon(iconSpan, TYPE_ICON_MAP[propType] ?? 'lucide-text');
				iconSpan.addClass('obsiman-explorer-icon-default');
			}
		}

		// Property name
		if (this.showPropName) {
			innerEl.createSpan({ cls: 'obsiman-explorer-prop-name', text: propName });
		}

		// Count
		if (this.showCount) {
			headerEl.createDiv({ cls: 'tree-item-flair obsiman-explorer-badge', text: String(totalFiles) });
		}

		// Left click: expand/collapse (or Ctrl+click: search)
		headerEl.addEventListener('click', (e) => {
			if ((e.ctrlKey || e.metaKey) && this.plugin.settings.explorerCtrlClickSearch) {
				e.preventDefault();
				e.stopPropagation();
				this.openCoreSearch(`["${propName}"]`);
				return;
			}
			if (this.expandedProps.has(propName)) {
				this.expandedProps.delete(propName);
			} else {
				this.expandedProps.add(propName);
			}
			this.renderTree();
		});

		// Right click: context menu
		headerEl.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.showPropertyContextMenu(e, propName);
		});

		// Level 2: Values
		if (isExpanded) {
			const childrenEl = nodeEl.createDiv({ cls: 'tree-item-children obsiman-explorer-children' });
			const valueCounts = fileCounts.get(propName) ?? new Map<string, number>();
			const sortedValues = [...values].sort((a, b) => {
				if (this.valueSortMode === 'value_alpha') {
					const cmp = a.localeCompare(b, undefined, { sensitivity: 'base' });
					if (cmp !== 0) return cmp;
					return (valueCounts.get(b) ?? 0) - (valueCounts.get(a) ?? 0);
				}
				const countA = valueCounts.get(a) ?? 0;
				const countB = valueCounts.get(b) ?? 0;
				if (countB !== countA) return countB - countA;
				return a.localeCompare(b, undefined, { sensitivity: 'base' });
			});

			for (const value of sortedValues) {
				const count = valueCounts.get(value) ?? 0;
				// Hide values with 0 scoped files when not in all-vault scope
				if (count === 0 && this.filterScope !== 'all') continue;

				const valTreeItem = childrenEl.createDiv({ cls: 'tree-item' });
				const valueEl = valTreeItem.createDiv({ cls: 'tree-item-self is-clickable obsiman-explorer-value' });

				// Highlight if value is an active filter for this property
				if (this.activeFilterValues.get(propName)?.has(value)) {
					valueEl.addClass('is-active-filter');
				}

				// Pulse animation if matching search term
				if (this.searchTerm && this.searchMode === 'values' && value.toLowerCase().includes(this.searchTerm.toLowerCase())) {
					valueEl.addClass('obsiman-search-highlight');
					setTimeout(() => { if (valueEl && valueEl.parentElement) valueEl.removeClass('obsiman-search-highlight'); }, 800);
				}

				valueEl.createDiv({ cls: 'tree-item-icon' }); // Spacer for deeper tree logic
				const valInnerEl = valueEl.createDiv({ cls: 'tree-item-inner' });
				valInnerEl.createSpan({ cls: 'obsiman-explorer-value-text', text: value });

				if (this.showCount) {
					valueEl.createDiv({ cls: 'tree-item-flair obsiman-explorer-badge', text: String(count) });
				}

				// Left click: add filter (or Ctrl+click: search)
				valueEl.addEventListener('click', (e) => {
					e.stopPropagation();
					if ((e.ctrlKey || e.metaKey) && this.plugin.settings.explorerCtrlClickSearch) {
						e.preventDefault();
						this.openCoreSearch(`["${propName}": ${value}]`);
						return;
					}
					this.plugin.filterService.addNode({
						type: 'rule',
						filterType: 'specific_value',
						property: propName,
						values: [value],
					});
					this.onPropertyFilter?.(propName, value);
				});

				// Right click: value context menu
				valueEl.addEventListener('contextmenu', (e) => {
					e.preventDefault();
					e.stopPropagation();
					this.showValueContextMenu(e, propName, value);
				});
			}
		}
	}

	// ── Queue Preview ────────────────────────────────────────

	private renderQueuePreview(): void {
		if (!this.treeEl) return;
		const queue = this.plugin.queueService.queue;
		if (queue.length === 0) return;

		const existingProps = new Set(this.plugin.propertyIndex.index.keys());

		for (const change of queue) {
			if (change.type === 'property') {
				if (change.action === 'set' && !existingProps.has(change.property)) {
					// New property being added
					const pendingEl = this.treeEl.createDiv({ cls: 'obsiman-explorer-node obsiman-explorer-pending' });
					const headerEl = pendingEl.createDiv({ cls: 'obsiman-explorer-header' });
					headerEl.createSpan({ cls: 'obsiman-explorer-toggle', text: '▶' });
					headerEl.createSpan({ cls: 'obsiman-explorer-prop-name', text: change.property });
					headerEl.createSpan({ cls: 'obsiman-explorer-badge', text: `+${change.files.length}` });
				}
				if (change.action === 'delete') {
					// Mark existing property as pending deletion
					const nodes = this.treeEl.querySelectorAll('.obsiman-explorer-prop-name');
					for (const node of nodes) {
						if (node.textContent === change.property) {
							node.closest('.obsiman-explorer-node')?.addClass('obsiman-explorer-deleting');
						}
					}
				}
			}
		}
	}

	// ── Context Menus ────────────────────────────────────────

	private showPropertyContextMenu(e: MouseEvent, propName: string): void {
		const menu = new Menu();

		// Rename
		menu.addItem((item) =>
			item.setTitle(translate('explorer.ctx.rename')).setIcon('lucide-pencil').onClick(() => {
				new RenamePropertyModal(this.plugin.app, this.plugin, propName, this.getOperationFiles()).open();
			})
		);

		// Property Type submenu
		menu.addItem((item) => {
			item.setTitle(translate('explorer.ctx.type')).setIcon('lucide-type');
			const sub = (item as unknown as { setSubmenu: () => Menu }).setSubmenu();
			const currentType = this.plugin.propertyTypeService.getType(propName);
			const types = ['text', 'number', 'checkbox', 'list', 'date', 'datetime'];
			for (const type of types) {
				sub.addItem((si) =>
					si
						.setTitle(translate(`prop.type.${type}`))
						.setIcon(TYPE_ICON_MAP[type] ?? 'lucide-text')
						.setChecked(currentType === type)
						.onClick(async () => {
							await this.plugin.propertyTypeService.setType(propName, type);
							this.refresh();
						})
				);
			}
		});

		// Trigger Native Obsidian Property Menu Hook (Iconic & other plugins inject here)
		this.plugin.app.workspace.trigger('property-menu', menu, propName);

		menu.addSeparator();

		// Add Value (Only if > 1 active filters applied globally!)
		const countRules = (group: FilterGroup): number => {
			let count = 0;
			for (const child of group.children) {
				if (child.type === 'rule') count++;
				else if (child.type === 'group') count += countRules(child);
			}
			return count;
		};
		const activeFiltersCount = countRules(this.plugin.filterService.activeFilter);

		if (activeFiltersCount > 1) {
			menu.addItem((item) =>
				item.setTitle(translate('explorer.ctx.add_value')).setIcon('lucide-plus-circle').onClick(() => {
					new AddValueModal(this.plugin.app, this.plugin, propName, this.getOperationFiles()).open();
				})
			);
		}

		// Delete Property
		menu.addItem((item) =>
			item.setTitle(translate('explorer.ctx.delete_prop')).setIcon('lucide-trash-2').onClick(() => {
				const files = this.getOperationFiles();
				const change: PendingChange = {
					type: 'property',
					property: propName,
					action: 'delete',
					details: `delete ${propName} (${files.length} files)`,
					files,
					logicFunc: () => ({ [DELETE_PROP]: propName }),
					customLogic: false,
				};
				this.plugin.queueService.add(change);
				this.refresh();
			})
		);

		menu.showAtMouseEvent(e);
	}

	private showValueContextMenu(e: MouseEvent, propName: string, value: string): void {
		const scopedFiles = this.getFilesWithValue(propName, value);
		const menu = new Menu();

		// Rename Value
		menu.addItem((item) =>
			item.setTitle(translate('explorer.ctx.rename')).setIcon('lucide-pencil').onClick(() => {
				new RenameValueModal(this.plugin.app, this.plugin, propName, value, scopedFiles).open();
			})
		);

		// Move Value
		menu.addItem((item) =>
			item.setTitle(translate('explorer.ctx.move_value')).setIcon('lucide-move').onClick(() => {
				new MoveValueModal(this.plugin.app, this.plugin, propName, value, scopedFiles).open();
			})
		);

		// Convert submenu
		menu.addItem((item) => {
			item.setTitle(translate('explorer.ctx.convert')).setIcon('lucide-repeat');
			const sub = (item as unknown as { setSubmenu: () => Menu }).setSubmenu();
			const conversions: { label: string; fn: (v: string) => string }[] = [
				{ label: translate('explorer.ctx.wikilink'), fn: (v) => `[[${v.replace(/^\[\[|\]\]$/g, '')}]]` },
				{ label: translate('explorer.ctx.wikilink_alias'), fn: (v) => `[[${v.replace(/^\[\[|\]\]$/g, '')}|${v.replace(/^\[\[|\]\]$/g, '')}]]` },
				{ label: translate('explorer.ctx.md_link'), fn: (v) => `[${v.replace(/^\[\[|\]\]$/g, '')}](${v.replace(/^\[\[|\]\]$/g, '')})` },
				{ label: translate('explorer.ctx.uppercase'), fn: (v) => v.toUpperCase() },
				{ label: translate('explorer.ctx.lowercase'), fn: (v) => v.toLowerCase() },
				{ label: translate('explorer.ctx.capitalize'), fn: (v) => v.replace(/\b\w/g, (c) => c.toUpperCase()) },
			];
			for (const conv of conversions) {
				sub.addItem((si) =>
					si.setTitle(conv.label).onClick(() => {
						this.queueValueTransform(propName, value, conv.fn);
					})
				);
			}
		});

		menu.addSeparator();

		// Delete Value
		menu.addItem((item) =>
			item.setTitle(translate('explorer.ctx.delete_value')).setIcon('lucide-trash-2').onClick(() => {
				this.queueValueDelete(propName, value);
			})
		);

		menu.showAtMouseEvent(e);
	}

	private showTagContextMenu(e: MouseEvent, tagPath: string, _count: number): void {
		const menu = new Menu();

		menu.addItem((item) =>
			item.setTitle(translate('explorer.ctx.tag.filter')).setIcon('lucide-filter').onClick(() => {
				this.plugin.filterService.addNode({
					type: 'rule',
					filterType: 'has_tag',
					property: '',
					values: [tagPath],
				});
			})
		);

		// Placeholder for future tag operations
		menu.addSeparator();
		menu.addItem((item) =>
			item.setTitle(translate('explorer.ctx.tag.coming_soon')).setDisabled(true)
		);

		menu.showAtMouseEvent(e);
	}

	// ── Operation Helpers ────────────────────────────────────

	/** Intersect operation scope with files that actually have propName === value */
	private getFilesWithValue(propName: string, value: string): TFile[] {
		const isMatch = (v: unknown) =>
			(typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') && String(v) === value;

		return this.getOperationFiles().filter((file) => {
			const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
			const val: unknown = fm[propName];
			if (Array.isArray(val)) return (val as unknown[]).some(isMatch);
			return isMatch(val);
		});
	}

	private getOperationFiles(): TFile[] {
		const scope = this.plugin.settings.explorerOperationScope;
		if (scope === 'selected' || (scope === 'auto' && this.selectedFilePaths.size > 0)) {
			const files = this.plugin.app.vault.getMarkdownFiles().filter((f) => this.selectedFilePaths.has(f.path));
			if (files.length === 0 && scope === 'auto') {
				return this.plugin.filterService.filteredFiles;
			}
			return files;
		}
		if (scope === 'filtered') return this.plugin.filterService.filteredFiles;
		if (scope === 'all') return this.plugin.app.vault.getMarkdownFiles();
		// auto fallback
		return this.plugin.filterService.filteredFiles.length > 0
			? this.plugin.filterService.filteredFiles
			: this.plugin.app.vault.getMarkdownFiles();
	}

	private queueValueTransform(propName: string, oldValue: string, transform: (v: string) => string): void {
		const newValue = transform(oldValue);
		if (newValue === oldValue) return;
		const files = this.getFilesWithValue(propName, oldValue);
		const change: PendingChange = {
			type: 'property',
			property: propName,
			action: 'set',
			details: `${propName}: "${oldValue}" → "${newValue}"`,
			files,
			logicFunc: (_file, metadata) => {
				const current = metadata[propName];
				if (Array.isArray(current)) {
					return { [propName]: (current as unknown[]).map((v) => String(v) === oldValue ? newValue : v) };
				}
				if (String(current) === oldValue) {
					return { [propName]: newValue };
				}
				return null;
			},
			customLogic: false,
		};
		this.plugin.queueService.add(change);
		this.refresh();
	}

	private queueValueDelete(propName: string, value: string): void {
		const files = this.getFilesWithValue(propName, value);
		const change: PendingChange = {
			type: 'property',
			property: propName,
			action: 'set',
			details: `${propName}: remove "${value}"`,
			files,
			logicFunc: (_file, metadata) => {
				const current = metadata[propName];
				if (Array.isArray(current)) {
					const filtered = current.filter((v) => String(v) !== value);
					return { [propName]: filtered };
				}
				if (String(current) === value) {
					return { [DELETE_PROP]: propName };
				}
				return null;
			},
			customLogic: false,
		};
		this.plugin.queueService.add(change);
		this.refresh();
	}

	// ── Core Search ──────────────────────────────────────────

	private openCoreSearch(query: string): void {
		// Uses internal Obsidian API — no public alternative available
		(this.plugin.app as unknown as { commands: { executeCommandById: (id: string) => void } }).commands.executeCommandById('global-search:open');
		const timer = setTimeout(() => {
			const input = this.containerEl.ownerDocument.querySelector('.search-input-container input') as HTMLInputElement;
			if (input) {
				input.value = query;
				input.dispatchEvent(new Event('input'));
			}
		}, 150);
		this.pendingTimers.push(timer);
	}

	// ── Public API Methods ────────────────────────────────────

	setViewOptions(opts: {
		format: 'tree' | 'grid' | 'cards';
		showCount: boolean;
		showValues: boolean;
		showPropIcon: boolean;
		showPropName: boolean;
		showType: boolean;
		tagsOnly: boolean;
	}): void {
		this.viewFormat = opts.format;
		this.showCount = opts.showCount;
		this.showValues = opts.showValues;
		this.showPropIcon = opts.showPropIcon;
		this.showPropName = opts.showPropName;
		this.showType = opts.showType;
		this.tagsOnly = opts.tagsOnly;
		this.invalidateCache();
		this.renderTree();
	}

	setActiveFilters(props: Set<string>, vals: Map<string, Set<string>>): void {
		this.activeFilterProps = props;
		this.activeFilterValues = vals;
		this.renderTree();
	}

	/** Set an external search term (from the Filters header search pill) and re-render.
	 *  @param mode 'properties' searches property names, 'values' searches values within each property.
	 */
	setSearchTerm(term: string, mode: 'properties' | 'values' = 'properties'): void {
		this.searchTerm = term;
		this.searchMode = mode;
		this.renderTree();
	}

	// ── Grid View ─────────────────────────────────────────────

	private renderGridView(): void {
		if (!this.treeEl) return;
		this.treeEl.empty();

		// Use the same property + file-count data as the tree view
		const index = this.plugin.propertyIndex.index;
		const fileCounts = this.getFileCountMap();
		const propFileCounts = this.getPropFileCounts();

		let propNames = [...index.keys()];

		// Hide 0-count props when scoped
		if (this.filterScope !== 'all') {
			propNames = propNames.filter((n) => (propFileCounts.get(n) ?? 0) > 0);
		}

		// Filter by search term
		if (this.searchTerm) {
			const term = this.searchTerm.toLowerCase();
			if (this.searchMode === 'properties') {
				propNames = propNames.filter((n) => n.toLowerCase().includes(term));
			} else {
				propNames = propNames.filter((n) => {
					const vals = index.get(n);
					return vals ? [...vals].some((v) => v.toLowerCase().includes(term)) : false;
				});
			}
		}

		if (this.filterByType) {
			propNames = propNames.filter(
				(n) => this.plugin.propertyTypeService.getType(n) === this.filterByType
			);
		}

		propNames = this.sortProperties(propNames, index, propFileCounts);

		if (propNames.length === 0) {
			this.treeEl.createDiv({ cls: 'obsiman-explorer-empty', text: translate('explorer.empty') });
			return;
		}

		// ── Table: rows = properties, value-chips in col 2 ──────
		const table = this.treeEl.createEl('table', { cls: 'obsiman-grid-table' });
		const tbody = table.createEl('tbody');

		for (const propName of propNames) {
			const values = index.get(propName);
			if (!values || values.size === 0) continue;

			const totalFiles = propFileCounts.get(propName) ?? 0;
			const valueCounts = fileCounts.get(propName) ?? new Map<string, number>();
			const row = tbody.createEl('tr', { cls: 'obsiman-grid-row' });

			// ── Col 1: property name + optional icon + count ──
			const propCell = row.createEl('td', { cls: 'obsiman-grid-td obsiman-grid-td-prop' });

			if (this.showPropIcon || this.showType) {
				const iconData = this.plugin.iconicService.getIcon(propName);
				const iconSpan = propCell.createSpan({ cls: 'obsiman-explorer-icon' });
				if (iconData && this.showPropIcon) {
					setIcon(iconSpan, iconData.icon);
					if (iconData.color) iconSpan.style.color = `var(--color-${iconData.color})`;
				} else {
					const propType = this.plugin.propertyTypeService.getType(propName) ?? 'text';
					setIcon(iconSpan, TYPE_ICON_MAP[propType] ?? 'lucide-text');
					iconSpan.addClass('obsiman-explorer-icon-default');
				}
			}

			if (this.showPropName) {
				propCell.createSpan({ cls: 'obsiman-grid-prop-name', text: propName });
			}

			if (this.showCount) {
				propCell.createSpan({ cls: 'obsiman-explorer-badge', text: String(totalFiles) });
			}

			// Click property cell → has_property filter
			propCell.addEventListener('click', () => {
				this.plugin.filterService.addNode({
					type: 'rule',
					filterType: 'has_property',
					property: propName,
					values: [],
				});
			});

			// ── Col 2: values as chips ────────────────────────
			const valuesCell = row.createEl('td', { cls: 'obsiman-grid-td obsiman-grid-td-values' });

			// Sort values same as tree view
			const sortedValues = [...values].sort((a, b) => {
				if (this.valueSortMode === 'value_alpha') {
					return a.localeCompare(b, undefined, { sensitivity: 'base' });
				}
				return (valueCounts.get(b) ?? 0) - (valueCounts.get(a) ?? 0);
			});

			for (const value of sortedValues) {
				const count = valueCounts.get(value) ?? 0;
				if (count === 0 && this.filterScope !== 'all') continue;

				const chip = valuesCell.createSpan({ cls: 'obsiman-grid-value-chip' });
				if (this.activeFilterValues.get(propName)?.has(value)) {
					chip.addClass('is-active-filter');
				}

				chip.createSpan({ cls: 'obsiman-grid-chip-text', text: value });
				if (this.showCount) {
					chip.createSpan({ cls: 'obsiman-grid-chip-count', text: String(count) });
				}

				// Click chip → specific_value filter
				chip.addEventListener('click', (e) => {
					e.stopPropagation();
					this.plugin.filterService.addNode({
						type: 'rule',
						filterType: 'specific_value',
						property: propName,
						values: [value],
					});
				});
			}
		}
	}

	// ── Cards View ─────────────────────────────────────────────

	private renderCardsView(drillProp: string | null): void {
		if (!this.treeEl) return;
		this.treeEl.empty();

		if (drillProp !== null) {
			this.renderCardsDrilldown(drillProp);
			return;
		}

		// ── Card grid — one card per property ────────────────
		const index = this.plugin.propertyIndex.index;
		const propFileCounts = this.getPropFileCounts();

		let propNames = [...index.keys()];
		if (this.filterScope !== 'all') {
			propNames = propNames.filter((n) => (propFileCounts.get(n) ?? 0) > 0);
		}
		if (this.searchTerm) {
			const term = this.searchTerm.toLowerCase();
			propNames = propNames.filter((n) => n.toLowerCase().includes(term));
		}
		if (this.filterByType) {
			propNames = propNames.filter(
				(n) => this.plugin.propertyTypeService.getType(n) === this.filterByType
			);
		}
		propNames = this.sortProperties(propNames, index, propFileCounts);

		if (propNames.length === 0) {
			this.treeEl.createDiv({ cls: 'obsiman-explorer-empty', text: translate('explorer.empty') });
			return;
		}

		const grid = this.treeEl.createDiv({ cls: 'obsiman-cards-grid' });

		for (const propName of propNames) {
			const totalFiles = propFileCounts.get(propName) ?? 0;
			const propType = this.plugin.propertyTypeService.getType(propName) ?? 'text';
			const iconData = this.plugin.iconicService.getIcon(propName);

			const card = grid.createDiv({ cls: 'obsiman-card' });
			if (this.activeFilterProps.has(propName)) card.addClass('is-active-filter');

			// Large icon (centered)
			const iconWrap = card.createDiv({ cls: 'obsiman-card-icon' });
			if (iconData && this.showPropIcon) {
				setIcon(iconWrap, iconData.icon);
				if (iconData.color) iconWrap.style.setProperty('color', `var(--color-${iconData.color})`);
			} else {
				setIcon(iconWrap, TYPE_ICON_MAP[propType] ?? 'lucide-text');
			}

			// Property name
			if (this.showPropName) {
				card.createDiv({ cls: 'obsiman-card-title', text: propName });
			}

			// Stats row
			const stats = card.createDiv({ cls: 'obsiman-card-stats' });
			if (this.showCount) {
				stats.createSpan({ cls: 'obsiman-card-stat-count', text: String(totalFiles) });
			}
			if (this.showType) {
				const typeSpan = stats.createSpan({ cls: 'obsiman-card-stat-type' });
				setIcon(typeSpan, TYPE_ICON_MAP[propType] ?? 'lucide-text');
			}

			// Click → drill-down
			card.addEventListener('click', () => {
				this.renderCardsView(propName);
			});
		}
	}

	private renderCardsDrilldown(propName: string): void {
		if (!this.treeEl) return;

		const index = this.plugin.propertyIndex.index;
		const fileCounts = this.getFileCountMap();
		const propFileCounts = this.getPropFileCounts();
		const values = index.get(propName);
		const valueCounts = fileCounts.get(propName) ?? new Map<string, number>();
		const totalFiles = propFileCounts.get(propName) ?? 0;
		const propType = this.plugin.propertyTypeService.getType(propName) ?? 'text';
		const iconData = this.plugin.iconicService.getIcon(propName);

		// ── Topbar ────────────────────────────────────────────
		const topbar = this.treeEl.createDiv({ cls: 'obsiman-cards-drill-topbar' });

		// ← Back
		const backBtn = topbar.createDiv({ cls: 'obsiman-cards-back clickable-icon' });
		setIcon(backBtn, 'lucide-arrow-left');
		backBtn.addEventListener('click', () => {
			this.renderCardsView(null);
		});

		// Large icon
		const iconWrap = topbar.createDiv({ cls: 'obsiman-cards-drill-icon' });
		if (iconData && this.showPropIcon) {
			setIcon(iconWrap, iconData.icon);
			if (iconData.color) iconWrap.style.setProperty('color', `var(--color-${iconData.color})`);
		} else {
			setIcon(iconWrap, TYPE_ICON_MAP[propType] ?? 'lucide-text');
		}

		// Property name heading
		topbar.createDiv({ cls: 'obsiman-cards-drill-title', text: propName });

		// Stats (far right)
		if (this.showCount) {
			topbar.createDiv({
				cls: 'obsiman-cards-drill-stats',
				text: String(totalFiles),
			});
		}

		// ── Values as chips ───────────────────────────────────
		if (!values || values.size === 0) {
			this.treeEl.createDiv({ cls: 'obsiman-explorer-empty', text: translate('explorer.empty') });
			return;
		}

		const chipsWrap = this.treeEl.createDiv({ cls: 'obsiman-cards-chips' });

		const sortedValues = [...values].sort((a, b) => {
			if (this.valueSortMode === 'value_alpha') {
				return a.localeCompare(b, undefined, { sensitivity: 'base' });
			}
			return (valueCounts.get(b) ?? 0) - (valueCounts.get(a) ?? 0);
		});

		for (const value of sortedValues) {
			const count = valueCounts.get(value) ?? 0;
			if (count === 0 && this.filterScope !== 'all') continue;

			const chip = chipsWrap.createDiv({ cls: 'obsiman-cards-chip' });
			if (this.activeFilterValues.get(propName)?.has(value)) {
				chip.addClass('is-active-filter');
			}

			chip.createSpan({ cls: 'obsiman-cards-chip-text', text: value });
			if (this.showCount) {
				chip.createSpan({ cls: 'obsiman-cards-chip-count', text: String(count) });
			}

			chip.addEventListener('click', () => {
				this.plugin.filterService.addNode({
					type: 'rule',
					filterType: 'specific_value',
					property: propName,
					values: [value],
				});
			});
		}
	}

	// ── Tags-Only Mode ────────────────────────────────────────

	private renderTagsOnlyTree(): void {
		if (!this.treeEl) return;
		// viewFormat / showValues / showType reserved for future rendering modes
		void this.viewFormat;
		void this.showValues;
		void this.showType;
		this.treeEl.empty();

		const files = this.getScopeFiles();
		const tagCounts = new Map<string, number>();

		for (const file of files) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			if (!cache) continue;
			const allTags = getAllTags(cache) ?? [];
			const seen = new Set<string>();
			for (const tag of allTags) {
				const normalised = tag.startsWith('#') ? tag : `#${tag}`;
				if (!seen.has(normalised)) {
					seen.add(normalised);
					tagCounts.set(normalised, (tagCounts.get(normalised) ?? 0) + 1);
				}
			}
		}

		if (tagCounts.size === 0) {
			this.treeEl.createDiv({ cls: 'obsiman-explorer-empty', text: translate('explorer.empty') });
			return;
		}

		type TagNode = { count: number; children: Map<string, TagNode> };
		const root: Map<string, TagNode> = new Map();

		for (const [tag, count] of tagCounts) {
			const parts = tag.replace(/^#/, '').split('/');
			let level = root;
			for (const part of parts) {
				if (!level.has(part)) level.set(part, { count: 0, children: new Map() });
				level = level.get(part)!.children;
			}
			// Set count on leaf node
			let cursor = root;
			for (let i = 0; i < parts.length; i++) {
				const node = cursor.get(parts[i])!;
				if (i === parts.length - 1) node.count = count;
				cursor = node.children;
			}
		}

		const renderTagNode = (parent: HTMLElement, name: string, node: TagNode, fullPath: string) => {
			const nodeEl = parent.createDiv({ cls: 'obsiman-explorer-node' });
			const headerEl = nodeEl.createDiv({ cls: 'obsiman-explorer-header' });
			const hasChildren = node.children.size > 0;
			const isExpanded = this.expandedProps.has(fullPath);

			const toggleSpan = headerEl.createSpan({ cls: 'obsiman-explorer-toggle' });
			setIcon(toggleSpan, hasChildren ? (isExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right') : 'lucide-dot');

			const iconSpan = headerEl.createSpan({ cls: 'obsiman-explorer-icon' });
			setIcon(iconSpan, 'lucide-tag');

			headerEl.createSpan({ cls: 'obsiman-explorer-prop-name', text: name });
			if (this.showCount && node.count > 0) {
				headerEl.createSpan({ cls: 'obsiman-explorer-badge', text: String(node.count) });
			}

			headerEl.addEventListener('click', () => {
				if (hasChildren) {
					if (this.expandedProps.has(fullPath)) this.expandedProps.delete(fullPath);
					else this.expandedProps.add(fullPath);
					this.renderTree();
				} else {
					// Leaf tag: add has_tag filter rule
					this.plugin.filterService.addNode({
						type: 'rule',
						filterType: 'has_tag',
						property: '',
						values: [fullPath],
					});
				}
			});

			headerEl.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.showTagContextMenu(e, fullPath, node.count);
			});

			if (hasChildren && isExpanded) {
				const childrenEl = nodeEl.createDiv({ cls: 'obsiman-explorer-children' });
				for (const [childName, childNode] of node.children) {
					renderTagNode(childrenEl, childName, childNode, `${fullPath}/${childName}`);
				}
			}
		};

		for (const [name, node] of root) {
			renderTagNode(this.treeEl, name, node, name);
		}
	}

	private getScopeFiles(): TFile[] {
		if (this.filterScope === 'selected') {
			const files = this.plugin.app.vault.getMarkdownFiles()
				.filter((f) => this.selectedFilePaths.has(f.path));
			return files.length > 0 ? files : this.plugin.filterService.filteredFiles;
		}
		if (this.filterScope === 'filtered') return this.plugin.filterService.filteredFiles;
		return this.plugin.app.vault.getMarkdownFiles();
	}

	/** Clean up any pending timers */
	destroy(): void {
		for (const timer of this.pendingTimers) {
			clearTimeout(timer);
		}
		this.pendingTimers.length = 0;
	}

	// ── File Count Caching ───────────────────────────────────

	private invalidateCache(): void {
		this.cachedFileCounts = null;
		this.cachedPropFileCounts = null;
	}

	private getScopedFiles(): TFile[] {
		switch (this.filterScope) {
			case 'filtered':
				return this.plugin.filterService.filteredFiles;
			case 'selected':
				return this.plugin.app.vault.getMarkdownFiles().filter((f) => this.selectedFilePaths.has(f.path));
			default:
				return this.plugin.app.vault.getMarkdownFiles();
		}
	}

	private getFileCountMap(): Map<string, Map<string, number>> {
		if (this.cachedFileCounts) return this.cachedFileCounts;
		const result = new Map<string, Map<string, number>>();
		const files = this.getScopedFiles();

		for (const file of files) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm) continue;

			for (const [key, value] of Object.entries(fm)) {
				if (key === 'position') continue;
				if (!result.has(key)) result.set(key, new Map());
				const valueCounts = result.get(key)!;
				if (Array.isArray(value)) {
					for (const v of value) {
						if (v != null) {
							const s = String(v);
							valueCounts.set(s, (valueCounts.get(s) ?? 0) + 1);
						}
					}
				} else if (value != null) {
					const s = String(value);
					valueCounts.set(s, (valueCounts.get(s) ?? 0) + 1);
				}
			}
		}

		this.cachedFileCounts = result;
		return result;
	}

	private getPropFileCounts(): Map<string, number> {
		if (this.cachedPropFileCounts) return this.cachedPropFileCounts;
		const result = new Map<string, number>();
		const files = this.getScopedFiles();

		for (const file of files) {
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;
			for (const key of Object.keys(cache.frontmatter)) {
				if (key === 'position') continue;
				result.set(key, (result.get(key) ?? 0) + 1);
			}
		}

		this.cachedPropFileCounts = result;
		return result;
	}
}

// ── Mini Modals for Context Menu Actions ─────────────────────

class CreatePropertyModal extends Modal {
	private plugin: ObsiManPlugin;
	private files: TFile[];
	private propName = '';
	private propValue = '';
	private propType = 'text';

	constructor(app: App, plugin: ObsiManPlugin, files: TFile[]) {
		super(app);
		this.plugin = plugin;
		this.files = files;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-modal');
		contentEl.createEl('h3', { text: translate('explorer.btn.create') });

		new Setting(contentEl).setName(translate('prop.property')).addText((text) => {
			text.setPlaceholder('Property name...').onChange((v) => { this.propName = v; });
			new PropertySuggest(this.app, text.inputEl, this.plugin.propertyIndex.getPropertyNames(), (v) => { this.propName = v; text.setValue(v); });
		});

		new Setting(contentEl).setName(translate('prop.type')).addDropdown((dd) =>
			dd.addOptions({ text: translate('prop.type.text'), number: translate('prop.type.number'), checkbox: translate('prop.type.checkbox'), list: translate('prop.type.list'), date: translate('prop.type.date') })
				.setValue(this.propType).onChange((v) => { this.propType = v; })
		);

		new Setting(contentEl).setName(translate('prop.value')).addText((text) =>
			text.setPlaceholder('Value (optional)').onChange((v) => { this.propValue = v; })
		);

		new Setting(contentEl).addButton((btn) =>
			btn.setButtonText(translate('prop.add_to_queue')).setCta().onClick(() => { this.submit(); this.close(); })
		).addButton((btn) => btn.setButtonText('Cancel').onClick(() => this.close()));
	}

	private submit(): void {
		if (!this.propName) return;
		let value: unknown = this.propValue;
		if (this.propType === 'number') value = Number(this.propValue) || 0;
		if (this.propType === 'checkbox') value = !['false', '0', 'no', ''].includes(this.propValue.toLowerCase());
		if (this.propType === 'list') value = this.propValue.split(',').map((s) => s.trim()).filter(Boolean);

		const change: PendingChange = {
			type: 'property',
			property: this.propName,
			action: 'set',
			details: `${this.propName} = ${String(value)}`,
			files: this.files,
			logicFunc: () => ({ [this.propName]: value }),
			customLogic: false,
		};
		this.plugin.queueService.add(change);
	}

	onClose(): void { this.contentEl.empty(); }
}

class RenamePropertyModal extends Modal {
	private plugin: ObsiManPlugin;
	private oldName: string;
	private files: TFile[];
	private newName = '';
	private conflictMode: 'append' | 'replace' = 'append';

	constructor(app: App, plugin: ObsiManPlugin, oldName: string, files: TFile[]) {
		super(app);
		this.plugin = plugin;
		this.oldName = oldName;
		this.files = files;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-modal');
		contentEl.createEl('h3', { text: `${translate('explorer.ctx.rename')}: ${this.oldName}` });

		new Setting(contentEl).setName(translate('prop.new_name')).addText((text) => {
			text.setPlaceholder('New name...').onChange((v) => { this.newName = v; });
			new PropertySuggest(this.app, text.inputEl, this.plugin.propertyIndex.getPropertyNames(), (v) => { this.newName = v; text.setValue(v); });
		});

		// Conflict resolution
		new Setting(contentEl).setName(translate('explorer.rename.target_exists')).addDropdown((dd) =>
			dd.addOptions({ append: translate('explorer.rename.append'), replace: translate('explorer.rename.replace') })
				.setValue(this.conflictMode).onChange((v) => { this.conflictMode = v as 'append' | 'replace'; })
		);

		new Setting(contentEl).addButton((btn) =>
			btn.setButtonText(translate('prop.add_to_queue')).setCta().onClick(() => { this.submit(); this.close(); })
		).addButton((btn) => btn.setButtonText('Cancel').onClick(() => this.close()));
	}

	private submit(): void {
		if (!this.newName || this.newName === this.oldName) return;
		const change: PendingChange = {
			type: 'property',
			property: this.oldName,
			action: 'rename',
			details: `${this.oldName} → ${this.newName}`,
			files: this.files,
			logicFunc: (_file, metadata) => {
				if (!(this.oldName in metadata)) return null;
				const oldVal = metadata[this.oldName];
				const existingVal = metadata[this.newName];

				let newVal: unknown;
				if (existingVal != null && this.conflictMode === 'append') {
					// Merge values
					const existArr: unknown[] = Array.isArray(existingVal) ? existingVal : [existingVal];
					const oldArr: unknown[] = Array.isArray(oldVal) ? oldVal : [oldVal];
					newVal = [...existArr, ...oldArr];
				} else {
					newVal = oldVal;
				}
				return { [this.newName]: newVal, [DELETE_PROP]: this.oldName };
			},
			customLogic: false,
		};
		this.plugin.queueService.add(change);
	}

	onClose(): void { this.contentEl.empty(); }
}

class AddValueModal extends Modal {
	private plugin: ObsiManPlugin;
	private propName: string;
	private files: TFile[];
	private value = '';
	private replaceMode = false;
	private asWikilink = false;

	constructor(app: App, plugin: ObsiManPlugin, propName: string, files: TFile[]) {
		super(app);
		this.plugin = plugin;
		this.propName = propName;
		this.files = files;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-modal');
		contentEl.createEl('h3', { text: `${translate('explorer.ctx.add_value')}: ${this.propName}` });

		new Setting(contentEl).setName(translate('prop.value')).addText((text) => {
			text.setPlaceholder('Value...').onChange((v) => { this.value = v; });
			new PropertySuggest(this.app, text.inputEl, this.plugin.propertyIndex.getPropertyValues(this.propName), (v) => { this.value = v; text.setValue(v); });
		});

		new Setting(contentEl).setName(translate('explorer.add_value.replace')).setDesc(translate('explorer.add_value.append'))
			.addToggle((toggle) => toggle.setValue(this.replaceMode).onChange((v) => { this.replaceMode = v; }));

		new Setting(contentEl).setName(translate('explorer.add_value.as_wikilink'))
			.addToggle((toggle) => toggle.setValue(this.asWikilink).onChange((v) => { this.asWikilink = v; }));

		new Setting(contentEl).addButton((btn) =>
			btn.setButtonText(translate('prop.add_to_queue')).setCta().onClick(() => { this.submit(); this.close(); })
		).addButton((btn) => btn.setButtonText('Cancel').onClick(() => this.close()));
	}

	private submit(): void {
		if (!this.value) return;
		const finalValue = this.asWikilink ? `[[${this.value}]]` : this.value;
		const change: PendingChange = {
			type: 'property',
			property: this.propName,
			action: 'set',
			details: `${this.propName} += "${finalValue}"`,
			files: this.files,
			logicFunc: (_file, metadata) => {
				if (this.replaceMode) {
					return { [this.propName]: finalValue };
				}
				const existing = metadata[this.propName];
				const list: unknown[] = Array.isArray(existing) ? [...(existing as unknown[])] : existing != null ? [existing] : [];
				list.push(finalValue);
				return { [this.propName]: list };
			},
			customLogic: false,
		};
		this.plugin.queueService.add(change);
	}

	onClose(): void { this.contentEl.empty(); }
}

class RenameValueModal extends Modal {
	private plugin: ObsiManPlugin;
	private propName: string;
	private oldValue: string;
	private files: TFile[];
	private newValue = '';

	constructor(app: App, plugin: ObsiManPlugin, propName: string, oldValue: string, files: TFile[]) {
		super(app);
		this.plugin = plugin;
		this.propName = propName;
		this.oldValue = oldValue;
		this.files = files;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-modal');
		contentEl.createEl('h3', { text: `${translate('explorer.ctx.rename')}: "${this.oldValue}"` });

		new Setting(contentEl).setName(translate('prop.new_name')).addText((text) => {
			text.setPlaceholder('New value...').setValue(this.newValue).onChange((v) => { this.newValue = v; });
			new PropertySuggest(this.app, text.inputEl, this.plugin.propertyIndex.getPropertyValues(this.propName), (v) => { this.newValue = v; text.setValue(v); });
		});

		new Setting(contentEl).addButton((btn) =>
			btn.setButtonText(translate('prop.add_to_queue')).setCta().onClick(() => { this.submit(); this.close(); })
		).addButton((btn) => btn.setButtonText('Cancel').onClick(() => this.close()));
	}

	private submit(): void {
		if (!this.newValue || this.newValue === this.oldValue) return;
		const change: PendingChange = {
			type: 'property',
			property: this.propName,
			action: 'set',
			details: `${this.propName}: "${this.oldValue}" → "${this.newValue}"`,
			files: this.files,
			logicFunc: (_file, metadata) => {
				const current = metadata[this.propName];
				if (Array.isArray(current)) {
					return { [this.propName]: (current as unknown[]).map((v) => String(v) === this.oldValue ? this.newValue : v) };
				}
				if (String(current) === this.oldValue) return { [this.propName]: this.newValue };
				return null;
			},
			customLogic: false,
		};
		this.plugin.queueService.add(change);
	}

	onClose(): void { this.contentEl.empty(); }
}

class MoveValueModal extends Modal {
	private plugin: ObsiManPlugin;
	private sourceProp: string;
	private value: string;
	private files: TFile[];
	private targetProp = '';

	constructor(app: App, plugin: ObsiManPlugin, sourceProp: string, value: string, files: TFile[]) {
		super(app);
		this.plugin = plugin;
		this.sourceProp = sourceProp;
		this.value = value;
		this.files = files;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-modal');
		contentEl.createEl('h3', { text: `${translate('explorer.ctx.move_value')}: "${this.value}"` });

		new Setting(contentEl).setName(translate('prop.property')).addText((text) => {
			text.setPlaceholder('Target property...').onChange((v) => { this.targetProp = v; });
			new PropertySuggest(this.app, text.inputEl, this.plugin.propertyIndex.getPropertyNames(), (v) => { this.targetProp = v; text.setValue(v); });
		});

		new Setting(contentEl).addButton((btn) =>
			btn.setButtonText(translate('prop.add_to_queue')).setCta().onClick(() => { this.submit(); this.close(); })
		).addButton((btn) => btn.setButtonText('Cancel').onClick(() => this.close()));
	}

	private submit(): void {
		if (!this.targetProp) return;
		const change: PendingChange = {
			type: 'property',
			property: this.sourceProp,
			action: 'set',
			details: `move "${this.value}" from ${this.sourceProp} → ${this.targetProp}`,
			files: this.files,
			logicFunc: (_file, metadata) => {
				const current = metadata[this.sourceProp];
				const updates: Record<string, unknown> = {};

				// Remove from source
				if (Array.isArray(current)) {
					updates[this.sourceProp] = current.filter((v) => String(v) !== this.value);
				} else if (String(current) === this.value) {
					updates[DELETE_PROP] = this.sourceProp;
				} else {
					return null;
				}

				// Add to target
				const targetCurrent = metadata[this.targetProp];
				const targetList: unknown[] = Array.isArray(targetCurrent) ? [...(targetCurrent as unknown[])] : targetCurrent != null ? [targetCurrent] : [];
				targetList.push(this.value);
				updates[this.targetProp] = targetList;

				return updates;
			},
			customLogic: false,
		};
		this.plugin.queueService.add(change);
	}

	onClose(): void { this.contentEl.empty(); }
}
