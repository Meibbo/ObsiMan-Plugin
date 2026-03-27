import { ItemView, setIcon, type WorkspaceLeaf, type TFile } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import type { ObsiManSession } from '../types/session';
import { PropertyExplorerComponent } from '../components/PropertyExplorerComponent';
import { PropertyGridComponent } from '../components/PropertyGridComponent';
import { OperationsPanelComponent } from '../components/OperationsPanelComponent';
import { t } from '../i18n/index';

export const OBSIMAN_MAIN_VIEW_TYPE = 'obsiman-main';

/**
 * Full-screen main leaf view for ObsiMan.
 *
 * Layout (after v1.2.3 restructure):
 * ┌──────────────────────────────────────────────────────────┐
 * │ Operations (left)  │  PropertyGrid     │ Properties      │
 * │ [tabs vertical     │  (spreadsheet)    │ Explorer        │
 * │  or horizontal]    │                   │ (right panel)   │
 * │ [pinned queue]     │                   │                 │
 * └────────────────────┴───────────────────┴─────────────────┘
 * Status bar: Obsidian native
 */
export class ObsiManMainView extends ItemView {
	private plugin: ObsiManPlugin;

	private explorer!: PropertyExplorerComponent;
	private explorerPanel!: HTMLElement;
	private propertiesVisible = true;
	private grid!: PropertyGridComponent;

	private operationsPanel!: OperationsPanelComponent;
	private operationsColumn!: HTMLElement;

	/** Current session state (null = no session file loaded) */
	private session: ObsiManSession | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: ObsiManPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return OBSIMAN_MAIN_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t('view.main.title');
	}

	getIcon(): string {
		return 'obsiman-icon';
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-main-view');

		// --- Content area: [OperationsColumn | Grid | PropertiesPanel] ---
		const contentArea = contentEl.createDiv({ cls: 'obsiman-content-area' });

		// --- Operations column (LEFT) ---
		this.operationsColumn = contentArea.createDiv({
			cls: 'obsiman-ops-column',
		});
		this.operationsPanel = new OperationsPanelComponent(
			this.operationsColumn,
			this.plugin,
			{
				onClearSelected: () => {
					void this.handleSelectionChange(new Set());
				},
				onToggle: (expanded) => {
					if (expanded) {
						this.operationsColumn.removeClass('is-collapsed');
					} else {
						this.operationsColumn.addClass('is-collapsed');
					}
				},
			}
		);

		// --- Grid (CENTER) ---
		const gridWrapper = contentArea.createDiv({ cls: 'obsiman-grid-wrapper' });
		this.grid = new PropertyGridComponent(gridWrapper, this.app, this.plugin, {
			onSelectionChange: (selectedPaths) => {
				void this.handleSelectionChange(selectedPaths);
			},
			onInlineEdit: (change) => this.plugin.queueService.add(change),
		});

		// --- Properties panel toggle + panel (RIGHT) ---
		const propsToggle = contentArea.createDiv({ cls: 'obsiman-props-toggle-strip' });
		const propsToggleBtn = propsToggle.createDiv({
			cls: 'clickable-icon',
			attr: { 'aria-label': t('explorer.toggle') },
		});
		setIcon(propsToggleBtn, 'lucide-panel-right');
		propsToggleBtn.addEventListener('click', () => this.toggleProperties());

		this.explorerPanel = contentArea.createDiv({
			cls: 'obsiman-properties-panel-right',
		});
		this.buildPropertiesPanel();

		// --- Subscribe to service events ---
		const filterChanged = () => this.refreshFromFilters();
		this.plugin.filterService.on('changed', filterChanged);
		this.register(() => this.plugin.filterService.off('changed', filterChanged));

		const queueChanged = () => {
			this.plugin.refreshStatusBar();
			this.operationsPanel.refreshQueue();
		};
		this.plugin.queueService.on('changed', queueChanged);
		this.register(() => this.plugin.queueService.off('changed', queueChanged));

		const sessionChanged = (s: ObsiManSession | null) =>
			this.handleExternalSessionChange(s);
		this.plugin.sessionService.on('file-changed', sessionChanged);
		this.register(() =>
			this.plugin.sessionService.off('file-changed', sessionChanged)
		);

		// --- Initial load ---
		await this.loadInitialSession();
		this.refreshFromFilters();
	}

	async onClose(): Promise<void> {
		this.explorer?.destroy();
		this.contentEl.empty();
	}

	// --- Properties panel (right side) ---

	private toggleProperties(): void {
		this.propertiesVisible = !this.propertiesVisible;
		if (this.propertiesVisible) {
			this.explorerPanel.removeClass('is-collapsed');
		} else {
			this.explorerPanel.addClass('is-collapsed');
		}
	}

	private buildPropertiesPanel(): void {
		// Mini toolbar for explorer controls
		const toolbar = this.explorerPanel.createDiv({ cls: 'obsiman-props-toolbar' });

		const addBtn = (icon: string, label: string, onClick: (e: MouseEvent) => void) => {
			const btn = toolbar.createDiv({
				cls: 'clickable-icon',
				attr: { 'aria-label': label },
			});
			setIcon(btn, icon);
			btn.addEventListener('click', onClick);
		};

		addBtn('lucide-search', t('explorer.btn.search'), () => this.explorer.toggleSearch());
		addBtn('lucide-list-filter', t('explorer.btn.filter'), (e) => this.explorer.showFilterMenu(e));
		addBtn('lucide-arrow-up-down', t('explorer.btn.sort'), (e) => this.explorer.showSortMenu(e));
		addBtn('lucide-plus', t('explorer.btn.create'), () => this.explorer.openCreateProperty());

		// Explorer component (default to filtered files scope in main view)
		const explorerContainer = this.explorerPanel.createDiv({ cls: 'obsiman-props-explorer-wrap' });
		this.explorer = new PropertyExplorerComponent(explorerContainer, this.plugin, {
			defaultScope: 'filtered',
		});
		this.explorer.render();
	}

	// --- Session management ---

	private async loadInitialSession(): Promise<void> {
		const path = this.plugin.settings.sessionFilePath;
		if (!path) return;

		const tfile = this.app.vault.getFileByPath(path);
		if (tfile) {
			await this.handleSessionChange(tfile);
		}
	}

	private async handleSessionChange(file: TFile | null): Promise<void> {
		if (!file) {
			this.session = null;
			this.plugin.sessionService.unwatchFile();
			this.plugin.settings.sessionFilePath = '';
			await this.plugin.saveSettings();
			this.plugin.filterService.clearFilters();
			return;
		}

		this.session = await this.plugin.sessionService.loadFromFile(file);
		this.plugin.sessionService.watchFile(file);
		this.plugin.settings.sessionFilePath = file.path;
		await this.plugin.saveSettings();

		if (this.session.filters.children.length > 0) {
			this.plugin.filterService.setFilter(this.session.filters);
		} else {
			this.plugin.filterService.clearFilters();
		}
	}

	private handleExternalSessionChange(session: ObsiManSession | null): void {
		if (!session) return;
		this.session = session;
		this.refreshGrid();
		this.plugin.refreshStatusBar();
	}

	// --- Refresh cycle ---

	private refreshFromFilters(): void {
		this.refreshGrid();
		this.plugin.refreshStatusBar();
	}

	private refreshGrid(): void {
		if (!this.grid) return;
		const files = this.plugin.filterService.filteredFiles;
		const columns = this.session?.columns ?? this.plugin.settings.gridColumns;
		const selectedPaths = this.session?.selectedPaths ?? new Set<string>();
		this.grid.render(files, selectedPaths, columns);
	}

	private async handleSelectionChange(selectedPaths: Set<string>): Promise<void> {
		if (this.session) {
			this.session.selectedPaths = selectedPaths;
		}

		this.explorer.setSelectedFiles(selectedPaths);

		const file = this.plugin.sessionService.currentFile;
		if (file) {
			await this.plugin.sessionService.syncSelectionToFile(file, selectedPaths);
		}

		this.plugin.refreshStatusBar();
	}
}
