import { ItemView, setIcon, type WorkspaceLeaf } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { OBSIMAN_EXPLORER_VIEW_TYPE } from './ObsiManExplorerView';
import { FilterTreeComponent } from '../components/FilterTreeComponent';
import { FileListComponent } from '../components/FileListComponent';
import { QueueListComponent } from '../components/QueueListComponent';
import { AddFilterModal } from '../modals/AddFilterModal';
import { QueueDetailsModal } from '../modals/QueueDetailsModal';
import { LinterModal } from '../modals/LinterModal';
import { FileRenameModal } from '../modals/FileRenameModal';
import { SaveTemplateModal } from '../modals/SaveTemplateModal';
import { PropertyManagerModal } from '../modals/PropertyManagerModal';
import { t } from '../i18n/index';

export const OBSIMAN_VIEW_TYPE = 'obsiman-view';

type PageId = string;
type PopupType = 'active-filters' | 'scope';
type OpsTab = 'fileops' | 'linter' | 'template' | 'content';

/**
 * Sidebar view with 3 navigable pages and bottom nav.
 *
 * ┌──────────────────────────────┐
 * │ ObsiMan              [↗]    │  ← header + expand button
 * ├──────────────────────────────┤
 * │ [page 1] [page 2] [page 3]  │  ← page container (slides)
 * ├──────────────────────────────┤
 * │         ○  ●  ○              │  ← bottom nav dots
 * └──────────────────────────────┘
 * Popup overlay slides up from bottom when active.
 */
export class ObsiManView extends ItemView {
	private plugin: ObsiManPlugin;

	// Page state
	private activePage: PageId = 'files';

	// DOM refs
	private pageContainer!: HTMLElement;
	private navDots: Map<PageId, HTMLElement> = new Map();
	private pages: Map<PageId, HTMLElement> = new Map();
	private popupOverlay!: HTMLElement;
	private popupContent!: HTMLElement;

	// Refreshable stat refs inside the Files page
	private statsEl!: HTMLElement;
	private filterBadgeEl!: HTMLElement;
	private opsBadgeEl!: HTMLElement;

	// Components
	private fileList!: FileListComponent;
	private filterTree!: FilterTreeComponent;
	private queueList!: QueueListComponent;

	// Sub-tab content elements
	private opsTabContents: Map<OpsTab, HTMLElement> = new Map();
	private opsTabBtns: Map<OpsTab, HTMLElement> = new Map();

	constructor(leaf: WorkspaceLeaf, plugin: ObsiManPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string { return OBSIMAN_VIEW_TYPE; }
	getDisplayText(): string { return t('plugin.name'); }
	getIcon(): string { return 'obsiman-icon'; }

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-view');

		// Resolve start page from saved settings
		const pageOrder = this.resolvedPageOrder();
		this.activePage = pageOrder[0];

		// --- Header ---
		const header = contentEl.createDiv({ cls: 'obsiman-view-header' });
		header.createEl('span', { text: t('plugin.name'), cls: 'obsiman-view-title' });
		const expandBtn = header.createDiv({
			cls: 'obsiman-view-expand clickable-icon',
			attr: { 'aria-label': t('nav.expand') },
		});
		setIcon(expandBtn, 'lucide-expand');
		expandBtn.addEventListener('click', () => void this.openMainView());

		// --- Page container ---
		this.pageContainer = contentEl.createDiv({ cls: 'obsiman-page-container' });

		for (const pageId of pageOrder) {
			const pageEl = this.pageContainer.createDiv({
				cls: 'obsiman-page',
				attr: { 'data-page': pageId },
			});
			this.pages.set(pageId, pageEl);
			this.buildPage(pageId, pageEl);
		}

		// --- Bottom nav ---
		const bottomNav = contentEl.createDiv({ cls: 'obsiman-bottom-nav' });
		for (const pageId of pageOrder) {
			const dot = bottomNav.createDiv({
				cls: 'obsiman-nav-dot',
				attr: { 'data-target': pageId, 'aria-label': this.pageLabel(pageId) },
			});
			const badge = dot.createDiv({ cls: 'obsiman-nav-dot-badge is-hidden' });
			// store badge refs for later updates
			if (pageId === 'filters') this.filterBadgeEl = badge;
			if (pageId === 'ops') this.opsBadgeEl = badge;

			dot.addEventListener('click', () => this.navigateTo(pageId));
			this.navDots.set(pageId, dot);
		}

		// --- Popup overlay ---
		this.popupOverlay = contentEl.createDiv({ cls: 'obsiman-popup-overlay is-hidden' });
		this.popupContent = this.popupOverlay.createDiv({ cls: 'obsiman-popup-content' });
		// Click on backdrop (not content) closes the popup
		this.popupOverlay.addEventListener('click', (e) => {
			if (e.target === this.popupOverlay) this.closePopup();
		});

		// --- Event subscriptions ---
		const filterChanged = () => {
			this.updateStats();
			this.refreshFilterTree();
			this.updateFilterBadge();
		};
		this.plugin.filterService.on('changed', filterChanged);
		this.register(() => this.plugin.filterService.off('changed', filterChanged));

		const queueChanged = () => {
			this.updateStats();
			this.refreshQueue();
			this.updateOpsBadge();
		};
		this.plugin.queueService.on('changed', queueChanged);
		this.register(() => this.plugin.queueService.off('changed', queueChanged));

		// --- Initial state ---
		this.navigateTo(this.activePage, false); // no animation on initial open
		this.refreshFiles();
		this.refreshQueue();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	// ─── Page routing ────────────────────────────────────────────────────────

	private resolvedPageOrder(): PageId[] {
		const order = this.plugin.settings.pageOrder;
		const valid = ['files', 'filters', 'ops'];
		if (
			Array.isArray(order) &&
			order.length === 3 &&
			valid.every((p) => order.includes(p))
		) {
			return order;
		}
		return ['files', 'filters', 'ops'];
	}

	private pageLabel(pageId: PageId): string {
		const map: Record<string, string> = {
			files: t('nav.files'),
			filters: t('nav.filters'),
			ops: t('nav.ops'),
		};
		return map[pageId] ?? pageId;
	}

	private navigateTo(pageId: PageId, animate = true): void {
		const pageOrder = this.resolvedPageOrder();
		const index = pageOrder.indexOf(pageId);
		if (index === -1) return;

		this.activePage = pageId;

		// Slide the container
		if (animate) {
			this.pageContainer.addClass('is-animating');
			// Remove class after transition ends to allow instant jumps later
			const onEnd = () => {
				this.pageContainer.removeClass('is-animating');
				this.pageContainer.removeEventListener('transitionend', onEnd);
			};
			this.pageContainer.addEventListener('transitionend', onEnd);
		}
		this.pageContainer.style.transform = `translateX(-${index * 100}%)`;

		// Update nav dots
		for (const [id, dot] of this.navDots) {
			dot.toggleClass('is-active', id === pageId);
		}
	}

	// ─── Page builders ────────────────────────────────────────────────────────

	private buildPage(pageId: PageId, el: HTMLElement): void {
		if (pageId === 'files') this.buildFilesPage(el);
		else if (pageId === 'filters') this.buildFiltersPage(el);
		else if (pageId === 'ops') this.buildOpsPage(el);
	}

	// ─── Files page ──────────────────────────────────────────────────────────

	private buildFilesPage(parent: HTMLElement): void {
		// Stats + active-filters button
		const topBar = parent.createDiv({ cls: 'obsiman-files-topbar' });
		this.statsEl = topBar.createDiv({ cls: 'obsiman-sidebar-stats' });

		const filtersBtn = topBar.createDiv({
			cls: 'obsiman-active-filters-btn clickable-icon',
			attr: { 'aria-label': t('filters.active') },
		});
		setIcon(filtersBtn, 'lucide-filter');
		filtersBtn.createSpan({ cls: 'obsiman-active-filters-label', text: t('filters.active') });
		filtersBtn.addEventListener('click', () => this.showPopup('active-filters'));

		// Toggle-all row
		const toggleRow = parent.createDiv({ cls: 'obsiman-files-toggle-row' });
		const toggleAll = toggleRow.createEl('input', { type: 'checkbox' });
		toggleAll.id = 'obsiman-toggle-all';
		toggleAll.addEventListener('change', () => {
			if (toggleAll.checked) {
				this.fileList.selectAll();
			} else {
				this.fileList.deselectAll();
			}
		});
		toggleRow.createEl('label', {
			text: t('files.select_all'),
			attr: { for: 'obsiman-toggle-all' },
		});

		// File list
		const listContainer = parent.createDiv({ cls: 'obsiman-file-list-container' });
		this.fileList = new FileListComponent(listContainer, this.app, () => {});

		this.updateStats();
	}

	// ─── Filters page ─────────────────────────────────────────────────────────

	private buildFiltersPage(parent: HTMLElement): void {
		// Action buttons
		const btnRow = parent.createDiv({ cls: 'obsiman-filter-buttons' });

		const addBtn = btnRow.createEl('button', { cls: 'obsiman-btn', text: t('filter.add_rule') });
		addBtn.addEventListener('click', () => this.openAddFilterModal());

		const clearBtn = btnRow.createEl('button', { cls: 'obsiman-btn', text: t('filter.clear') });
		clearBtn.addEventListener('click', () => {
			this.plugin.filterService.clearFilters();
			this.refreshFilterTree();
			this.updateFilterBadge();
		});

		const saveBtn = btnRow.createEl('button', { cls: 'obsiman-btn', text: t('filter.template.save') });
		saveBtn.addEventListener('click', () => {
			new SaveTemplateModal(this.app, this.plugin, this.plugin.filterService.activeFilter).open();
		});

		// Filter tree
		const treeContainer = parent.createDiv({ cls: 'obsiman-filter-tree' });
		this.filterTree = new FilterTreeComponent(treeContainer, (node, parentNode) => {
			this.plugin.filterService.removeNode(node, parentNode);
			this.refreshFilterTree();
			this.updateFilterBadge();
		});

		this.refreshFilterTree();
	}

	// ─── Operations page ──────────────────────────────────────────────────────

	private buildOpsPage(parent: HTMLElement): void {
		// Sub-tab bar
		const tabBar = parent.createDiv({ cls: 'obsiman-subtab-bar' });
		const tabArea = parent.createDiv({ cls: 'obsiman-subtab-area' });

		const tabs: Array<{ id: OpsTab; label: string }> = [
			{ id: 'fileops', label: t('ops.tab.fileops') },
			{ id: 'linter', label: t('ops.tab.linter_short') },
			{ id: 'template', label: t('ops.tab.template_short') },
			{ id: 'content', label: t('ops.tab.content_short') },
		];

		for (const tab of tabs) {
			// Tab button
			const tabBtn = tabBar.createDiv({ cls: 'obsiman-subtab', attr: { 'data-tab': tab.id } });
			tabBtn.createSpan({ text: tab.label });
			tabBtn.addEventListener('click', () => this.setOpsTab(tab.id));
			this.opsTabBtns.set(tab.id, tabBtn);

			// Tab content container
			const content = tabArea.createDiv({ cls: 'obsiman-subtab-content', attr: { 'data-tab': tab.id } });
			this.opsTabContents.set(tab.id, content);

			// Build each tab's content
			if (tab.id === 'fileops') this.buildFileOpsTab(content);
			else if (tab.id === 'linter') this.buildLinterTab(content);
			else content.createDiv({ cls: 'obsiman-coming-soon', text: t('ops.coming_soon') });
		}

		this.setOpsTab('fileops');
	}

	private buildFileOpsTab(parent: HTMLElement): void {
		// Action buttons
		const btnRow = parent.createDiv({ cls: 'obsiman-ops-buttons' });

		const renameBtn = btnRow.createEl('button', { cls: 'obsiman-btn' });
		setIcon(renameBtn.createSpan({ cls: 'obsiman-btn-icon' }), 'lucide-pencil');
		renameBtn.createSpan({ text: t('ops.rename') });
		renameBtn.addEventListener('click', () => this.openFileRename());

		const propBtn = btnRow.createEl('button', { cls: 'obsiman-btn' });
		setIcon(propBtn.createSpan({ cls: 'obsiman-btn-icon' }), 'lucide-plus');
		propBtn.createSpan({ text: t('ops.add_property') });
		propBtn.addEventListener('click', () => this.openPropertyManager());

		const scopeBtn = btnRow.createEl('button', { cls: 'obsiman-btn' });
		setIcon(scopeBtn.createSpan({ cls: 'obsiman-btn-icon' }), 'lucide-crosshair');
		scopeBtn.createSpan({ text: t('scope.title') });
		scopeBtn.addEventListener('click', () => this.showPopup('scope'));

		// Queue list
		const queueContainer = parent.createDiv({ cls: 'obsiman-queue-container' });
		this.queueList = new QueueListComponent(queueContainer, {
			onRemove: (index: number) => { this.plugin.queueService.remove(index); },
		});

		// Apply / Clear actions
		const actionRow = parent.createDiv({ cls: 'obsiman-queue-actions' });
		const applyBtn = actionRow.createEl('button', { cls: 'obsiman-btn mod-cta', text: t('ops.apply') });
		applyBtn.addEventListener('click', () => {
			if (this.plugin.queueService.isEmpty) return;
			new QueueDetailsModal(this.app, this.plugin.queueService).open();
		});
		const clearBtn = actionRow.createEl('button', { cls: 'obsiman-btn', text: t('ops.clear') });
		clearBtn.addEventListener('click', () => this.plugin.queueService.clear());
	}

	private buildLinterTab(parent: HTMLElement): void {
		parent.createDiv({ cls: 'obsiman-linter-desc', text: t('ops.linter.desc') });

		const runBtn = parent.createEl('button', { cls: 'obsiman-btn mod-cta', text: t('ops.linter.run') });
		runBtn.addEventListener('click', () => this.openLinter());
	}

	private setOpsTab(tab: OpsTab): void {
		for (const [id, el] of this.opsTabContents) {
			el.toggleClass('is-active', id === tab);
		}
		for (const [id, btn] of this.opsTabBtns) {
			btn.toggleClass('is-active', id === tab);
		}
	}

	// ─── Popup system ─────────────────────────────────────────────────────────

	private showPopup(type: PopupType): void {
		this.popupContent.empty();

		if (type === 'active-filters') this.buildActiveFiltersPopup(this.popupContent);
		else if (type === 'scope') this.buildScopePopup(this.popupContent);

		this.popupOverlay.removeClass('is-hidden');
		// Trigger animation on next frame
		requestAnimationFrame(() => {
			this.popupOverlay.addClass('is-open');
		});
	}

	private closePopup(): void {
		this.popupOverlay.removeClass('is-open');
		const onEnd = () => {
			this.popupOverlay.addClass('is-hidden');
			this.popupOverlay.removeEventListener('transitionend', onEnd);
		};
		this.popupOverlay.addEventListener('transitionend', onEnd);
	}

	private buildActiveFiltersPopup(parent: HTMLElement): void {
		const header = parent.createDiv({ cls: 'obsiman-popup-header' });
		header.createEl('span', { text: t('filters.active'), cls: 'obsiman-popup-title' });
		const closeBtn = header.createDiv({ cls: 'clickable-icon', attr: { 'aria-label': 'Close' } });
		setIcon(closeBtn, 'lucide-x');
		closeBtn.addEventListener('click', () => this.closePopup());

		// Render current filter tree (read-only preview + clear option)
		const treeEl = parent.createDiv({ cls: 'obsiman-filter-tree obsiman-popup-filter-tree' });
		const popupTree = new FilterTreeComponent(treeEl, (node, parentNode) => {
			this.plugin.filterService.removeNode(node, parentNode);
			// Re-render the tree inline
			popupTree.render(this.plugin.filterService.activeFilter);
			this.updateFilterBadge();
		});
		popupTree.render(this.plugin.filterService.activeFilter);

		const btnRow = parent.createDiv({ cls: 'obsiman-popup-actions' });
		const clearBtn = btnRow.createEl('button', { cls: 'obsiman-btn', text: t('filter.clear') });
		clearBtn.addEventListener('click', () => {
			this.plugin.filterService.clearFilters();
			this.updateFilterBadge();
			this.closePopup();
		});
		const addBtn = btnRow.createEl('button', { cls: 'obsiman-btn mod-cta', text: t('filter.add_rule') });
		addBtn.addEventListener('click', () => {
			this.closePopup();
			this.openAddFilterModal();
		});
	}

	private buildScopePopup(parent: HTMLElement): void {
		const header = parent.createDiv({ cls: 'obsiman-popup-header' });
		header.createEl('span', { text: t('scope.title'), cls: 'obsiman-popup-title' });
		const closeBtn = header.createDiv({ cls: 'clickable-icon', attr: { 'aria-label': 'Close' } });
		setIcon(closeBtn, 'lucide-x');
		closeBtn.addEventListener('click', () => this.closePopup());

		const current = this.plugin.settings.explorerOperationScope;
		const options: Array<{ value: string; label: string; icon: string }> = [
			{ value: 'all', label: t('scope.all'), icon: 'lucide-database' },
			{ value: 'filtered', label: t('scope.filtered'), icon: 'lucide-filter' },
			{ value: 'selected', label: t('scope.selected'), icon: 'lucide-check-square' },
		];

		const list = parent.createDiv({ cls: 'obsiman-scope-list' });
		for (const opt of options) {
			const item = list.createDiv({ cls: 'obsiman-scope-item' });
			if (opt.value === current) item.addClass('is-active');
			setIcon(item.createDiv({ cls: 'obsiman-scope-icon' }), opt.icon);
			item.createSpan({ text: opt.label });
			item.addEventListener('click', () => {
				this.plugin.settings.explorerOperationScope = opt.value as 'auto' | 'selected' | 'filtered' | 'all';
				void this.plugin.saveSettings();
				this.closePopup();
			});
		}
	}

	// ─── Badge / stats updates ────────────────────────────────────────────────

	private updateStats(): void {
		if (!this.statsEl) return;
		const total = this.plugin.propertyIndex.fileCount;
		const filtered = this.plugin.filterService.filteredFiles.length;
		const selected = this.plugin.basesInjector.selectedPaths.size;
		const queued = this.plugin.queueService.queue.length;

		let text = `${total} files · ${filtered} filtered`;
		if (selected > 0) text += ` · ${selected} selected`;
		if (queued > 0) text += ` · ${queued} pending`;
		this.statsEl.setText(text);
	}

	private updateFilterBadge(): void {
		if (!this.filterBadgeEl) return;
		const count = this.plugin.filterService.activeFilter?.children?.length ?? 0;
		this.filterBadgeEl.toggleClass('is-hidden', count === 0);
		if (count > 0) this.filterBadgeEl.setText(String(count));
	}

	private updateOpsBadge(): void {
		if (!this.opsBadgeEl) return;
		const count = this.plugin.queueService.queue.length;
		this.opsBadgeEl.toggleClass('is-hidden', count === 0);
		if (count > 0) this.opsBadgeEl.setText(String(count));
	}

	// ─── Component refresh ────────────────────────────────────────────────────

	private refreshFiles(): void {
		const filtered = this.plugin.filterService.filteredFiles;
		const total = this.plugin.propertyIndex.fileCount;
		this.fileList?.render(filtered, total);
		this.updateStats();
		this.updateFilterBadge();
	}

	private refreshFilterTree(): void {
		this.filterTree?.render(this.plugin.filterService.activeFilter);
	}

	private refreshQueue(): void {
		this.queueList?.render(this.plugin.queueService.queue);
		this.updateOpsBadge();
	}

	// ─── Modal launchers ──────────────────────────────────────────────────────

	private openAddFilterModal(): void {
		new AddFilterModal(
			this.app,
			this.plugin.propertyIndex.getPropertyNames(),
			(prop) => this.plugin.propertyIndex.getPropertyValues(prop),
			(node) => {
				this.plugin.filterService.addNode(node);
				this.refreshFilterTree();
				this.updateFilterBadge();
			}
		).open();
	}

	private openFileRename(): void {
		const selected = this.fileList.getSelectedFiles();
		const targets = selected.length > 0 ? selected : this.plugin.filterService.filteredFiles;
		new FileRenameModal(this.app, this.plugin.propertyIndex, targets, (change) =>
			this.plugin.queueService.add(change)
		).open();
	}

	private openPropertyManager(): void {
		const selected = this.fileList.getSelectedFiles();
		const targets = selected.length > 0 ? selected : this.plugin.filterService.filteredFiles;
		new PropertyManagerModal(
			this.app,
			this.plugin.propertyIndex,
			targets,
			(change) => this.plugin.queueService.add(change)
		).open();
	}

	private openLinter(): void {
		const selected = this.fileList.getSelectedFiles();
		const targets = selected.length > 0 ? selected : this.plugin.filterService.filteredFiles;
		new LinterModal(this.app, this.plugin.propertyIndex, targets).open();
	}

	private async openMainView(): Promise<void> {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(OBSIMAN_EXPLORER_VIEW_TYPE);
		if (leaves.length > 0) {
			await workspace.revealLeaf(leaves[0]);
			return;
		}
		const leaf = workspace.getLeaf('split');
		await leaf.setViewState({ type: OBSIMAN_EXPLORER_VIEW_TYPE, active: true });
		await workspace.revealLeaf(leaf);
	}
}
