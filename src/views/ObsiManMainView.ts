import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import type { ObsiManSession } from '../types/session';
import { HeaderBarComponent } from '../components/HeaderBarComponent';
import { NavbarComponent } from '../components/NavbarComponent';
import { PropertyExplorerComponent } from '../components/PropertyExplorerComponent';
import { PropertyGridComponent } from '../components/PropertyGridComponent';
import { StatusBarComponent } from '../components/StatusBarComponent';
import { OperationsPanelComponent } from '../components/OperationsPanelComponent';
import { QueueDetailsModal } from '../modals/QueueDetailsModal';
import { t } from '../i18n/index';

export const OBSIMAN_MAIN_VIEW_TYPE = 'obsiman-main';

/**
 * Full-screen main leaf view for ObsiMan.
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────────┐
 * │ HEADER BAR: [Session▼] [●Sync]        [Queue 3] [Apply] │
 * ├──┬──────────────────┬────────────────────────────────────┤
 * │N │  Explorer Panel  │  PropertyGrid                      │
 * │A │  (animated width)│  (spreadsheet)                     │
 * │V │                  │                                    │
 * ├──┴──────────────────┴────────────────────────────────────┤
 * │ STATUS: files | filtered | selected | pending   props·vals│
 * └──────────────────────────────────────────────────────────┘
 */
export class ObsiManMainView extends ItemView {
	private plugin: ObsiManPlugin;

	private headerBar!: HeaderBarComponent;
	private navbar!: NavbarComponent;
	private explorer!: PropertyExplorerComponent;
	private explorerColumn!: HTMLElement;
	private explorerPanel!: HTMLElement;
	private explorerVisible = false;
	private grid!: PropertyGridComponent;
	private statusBar!: StatusBarComponent;

	private operationsPanel!: OperationsPanelComponent;
	private operationsEl!: HTMLElement;
	private operationsVisible = false;

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
		return 'settings-2';
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-main-view');

		// --- Header Bar ---
		const headerBarEl = contentEl.createDiv();
		this.headerBar = new HeaderBarComponent(headerBarEl, this.plugin, {
			onSessionChange: (file) => { void this.handleSessionChange(file); },
			onApplyQueue: () => this.openQueueDetails(),
			onToggleShowSelected: (active) => this.handleShowSelectedToggle(active),
		});

		// --- Content area: [ExplorerColumn | Grid | OperationsPanel] ---
		const contentArea = contentEl.createDiv({ cls: 'obsiman-content-area' });

		// Explorer column: navbar + explorer panel
		this.explorerColumn = contentArea.createDiv({
			cls: 'obsiman-explorer-column is-collapsed',
		});

		// Explorer panel (hidden when collapsed)
		this.explorerPanel = this.explorerColumn.createDiv({ cls: 'obsiman-explorer-panel' });
		this.explorer = new PropertyExplorerComponent(this.explorerPanel, this.plugin);

		// Navbar (inside explorer column, above explorer panel)
		const navbarEl = this.explorerColumn.createDiv();
		// Popover anchor goes in the content area so it can overlay
		const popoverAnchorEl = contentArea.createDiv({ cls: 'obsiman-popover-anchor' });
		this.navbar = new NavbarComponent(navbarEl, popoverAnchorEl, this.plugin, this.explorer, {
			onToggleExplorer: () => this.toggleExplorer(),
			onToggleOperations: () => this.toggleOperations(),
			onFiltersChanged: () => this.refreshFromFilters(),
		});

		// Ensure navbar appears first visually
		this.explorerColumn.insertBefore(navbarEl, this.explorerPanel);

		// --- Grid ---
		const gridWrapper = contentArea.createDiv({ cls: 'obsiman-grid-wrapper' });
		this.grid = new PropertyGridComponent(gridWrapper, this.app, this.plugin, {
			onSelectionChange: (selectedPaths) => {
				void this.handleSelectionChange(selectedPaths);
			},
			onInlineEdit: (change) => this.plugin.queueService.add(change),
		});

		// --- Operations panel ---
		this.operationsEl = contentArea.createDiv({
			cls: 'obsiman-operations-panel-right is-collapsed',
		});
		this.operationsPanel = new OperationsPanelComponent(this.operationsEl, this.plugin);

		// --- Status Bar ---
		const statusEl = contentEl.createDiv({ cls: 'obsiman-statusbar' });
		this.statusBar = new StatusBarComponent(statusEl);

		// --- Subscribe to service events ---
		const filterChanged = () => this.refreshFromFilters();
		this.plugin.filterService.on('changed', filterChanged);
		this.register(() => this.plugin.filterService.off('changed', filterChanged));

		const queueChanged = () => {
			this.refreshStatusBar();
			this.headerBar.refreshQueueBadge(this.plugin.queueService.queue.length);
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
		this.contentEl.empty();
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

	private async handleSessionChange(file: import('obsidian').TFile | null): Promise<void> {
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

		// Apply filters from session
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
		this.refreshStatusBar();
	}

	// --- Refresh cycle ---

	private refreshFromFilters(): void {
		this.refreshGrid();
		this.refreshStatusBar();
		this.navbar?.refreshFilterBadge();
	}

	private refreshGrid(): void {
		if (!this.grid) return;
		const files = this.plugin.filterService.filteredFiles;
		const columns = this.session?.columns ?? this.plugin.settings.gridColumns;
		const selectedPaths = this.session?.selectedPaths ?? new Set<string>();

		// Apply "show only selected" filter
		const showSelected = this.headerBar?.isShowSelectedOnly();
		const displayFiles = showSelected && selectedPaths.size > 0
			? files.filter((f) => selectedPaths.has(f.path))
			: files;

		this.grid.render(displayFiles, selectedPaths, columns);
	}

	private refreshStatusBar(): void {
		if (!this.statusBar) return;
		const filteredFiles = this.plugin.filterService.filteredFiles;
		const filtered = filteredFiles.length;
		const total = this.plugin.propertyIndex.fileCount;
		const selected = this.session?.selectedPaths.size ?? 0;
		const queued = this.plugin.queueService.queue.length;

		// Compute property and value counts from filtered files
		const propSet = new Set<string>();
		let valueCount = 0;
		for (const file of filteredFiles) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			if (!fm) continue;
			for (const [key, val] of Object.entries(fm)) {
				if (key === 'position') continue;
				propSet.add(key);
				valueCount += Array.isArray(val) ? val.length : 1;
			}
		}

		this.statusBar.render({
			filtered,
			total,
			selected,
			queued,
			propertyCount: propSet.size,
			valueCount,
		});
	}

	private async handleSelectionChange(selectedPaths: Set<string>): Promise<void> {
		if (this.session) {
			this.session.selectedPaths = selectedPaths;
		}

		// Sync explorer selection
		this.explorer.setSelectedFiles(selectedPaths);

		// Sync to file if a session is active
		const file = this.plugin.sessionService.currentFile;
		if (file) {
			await this.plugin.sessionService.syncSelectionToFile(file, selectedPaths);
		}

		this.refreshStatusBar();
	}

	private handleShowSelectedToggle(_active: boolean): void {
		this.refreshGrid();
	}

	// --- Explorer toggle (animated) ---

	private toggleExplorer(): void {
		this.explorerVisible = !this.explorerVisible;
		if (this.explorerVisible) {
			this.explorerColumn.removeClass('is-collapsed');
			this.navbar.setOrientation('horizontal');
			this.explorerPanel.show();
			this.explorer.render();
		} else {
			this.explorerColumn.addClass('is-collapsed');
			this.navbar.setOrientation('vertical');
			this.explorerPanel.hide();
		}
	}

	// --- Operations panel toggle (Phase 6 stub) ---

	private toggleOperations(): void {
		this.operationsVisible = !this.operationsVisible;
		if (this.operationsVisible) {
			this.operationsEl.removeClass('is-collapsed');
		} else {
			this.operationsEl.addClass('is-collapsed');
		}
	}

	// --- Actions ---

	private openQueueDetails(): void {
		if (this.plugin.queueService.isEmpty) return;
		new QueueDetailsModal(this.app, this.plugin.queueService).open();
	}
}
