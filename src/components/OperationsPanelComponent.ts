import { setIcon } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { QueueListComponent } from './QueueListComponent';
import { LinterModal } from '../modals/LinterModal';
import { FileRenameModal } from '../modals/FileRenameModal';
import { SaveTemplateModal } from '../modals/SaveTemplateModal';
import { t } from '../i18n/index';

type TabId = 'rename' | 'linter' | 'templates' | 'move';

interface Tab {
	id: TabId;
	labelKey: string;
	icon: string;
}

const TABS: Tab[] = [
	{ id: 'rename', labelKey: 'ops.tab.rename', icon: 'lucide-pencil-line' },
	{ id: 'linter', labelKey: 'ops.tab.linter', icon: 'lucide-align-left' },
	{ id: 'templates', labelKey: 'ops.tab.templates', icon: 'lucide-bookmark' },
	{ id: 'move', labelKey: 'ops.tab.move', icon: 'lucide-folder-input' },
];

export interface OperationsPanelCallbacks {
	onClearSelected?: () => void;
	onToggle?: (expanded: boolean) => void;
}

/**
 * Operations panel with smart vertical/horizontal tabs.
 *
 * Collapsed: thin vertical strip with tab icons + toggle button.
 * Expanded: horizontal tab bar + tab content + pinned queue.
 *
 * Layout (expanded):
 * ┌──────────────────────────────┐
 * │ [Toggle ✕] [Tab] [Tab] ...  │  ← horizontal tab bar
 * ├──────────────────────────────┤
 * │ Tab content (flex: 1)        │
 * ├──────────────────────────────┤
 * │ Pinned queue (always visible)│
 * └──────────────────────────────┘
 *
 * Layout (collapsed):
 * ┌──┐
 * │☰ │  ← toggle button
 * │──│
 * │✏ │  ← tab icons (vertical)
 * │≡ │
 * │⊡ │
 * │→ │
 * └──┘
 */
export class OperationsPanelComponent {
	private containerEl: HTMLElement;
	private plugin: ObsiManPlugin;
	private callbacks: OperationsPanelCallbacks;

	private expanded = true;
	private activeTab: TabId = 'rename';

	// Expanded mode elements
	private contentEl: HTMLElement | null = null;
	private tabButtons = new Map<TabId, HTMLElement>();

	// Pinned queue
	private pinnedQueueEl: HTMLElement | null = null;
	private pinnedQueueList: QueueListComponent | null = null;

	constructor(
		containerEl: HTMLElement,
		plugin: ObsiManPlugin,
		callbacks: OperationsPanelCallbacks = {}
	) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.callbacks = callbacks;
		this.render();
	}

	private render(): void {
		this.containerEl.empty();
		this.tabButtons.clear();

		if (this.expanded) {
			this.renderExpanded();
		} else {
			this.renderCollapsed();
		}
	}

	// --- Collapsed: vertical icon strip ---

	private renderCollapsed(): void {
		this.containerEl.addClass('obsiman-ops-collapsed');
		this.containerEl.removeClass('obsiman-ops-expanded');

		const strip = this.containerEl.createDiv({ cls: 'obsiman-ops-strip' });

		// Toggle button (top)
		const toggleBtn = strip.createDiv({
			cls: 'clickable-icon obsiman-ops-strip-toggle',
			attr: { 'aria-label': t('ops.panel.title') },
		});
		setIcon(toggleBtn, 'lucide-panel-left');
		toggleBtn.addEventListener('click', () => this.toggle());

		// Tab icons
		for (const tab of TABS) {
			const btn = strip.createDiv({
				cls: `clickable-icon obsiman-ops-strip-tab${tab.id === this.activeTab ? ' is-active' : ''}`,
				attr: { 'aria-label': t(tab.labelKey) },
			});
			setIcon(btn, tab.icon);
			btn.addEventListener('click', () => {
				this.activeTab = tab.id;
				this.toggle(); // expand and show this tab
			});
		}
	}

	// --- Expanded: full panel ---

	private renderExpanded(): void {
		this.containerEl.removeClass('obsiman-ops-collapsed');
		this.containerEl.addClass('obsiman-ops-expanded');

		// Tab bar (horizontal)
		const tabBar = this.containerEl.createDiv({ cls: 'obsiman-ops-tabbar' });

		// Toggle button (top-right of tab bar)
		const toggleBtn = tabBar.createDiv({
			cls: 'clickable-icon obsiman-ops-tabbar-toggle',
			attr: { 'aria-label': t('ops.panel.title') },
		});
		setIcon(toggleBtn, 'lucide-panel-left-close');
		toggleBtn.addEventListener('click', () => this.toggle());

		// Tab buttons
		for (const tab of TABS) {
			const tabBtn = tabBar.createDiv({
				cls: `obsiman-operations-tab${tab.id === this.activeTab ? ' is-active' : ''}`,
				attr: { 'aria-label': t(tab.labelKey) },
			});
			const iconSpan = tabBtn.createSpan();
			setIcon(iconSpan, tab.icon);
			tabBtn.createSpan({ text: t(tab.labelKey) });
			tabBtn.addEventListener('click', () => this.switchTab(tab.id));
			this.tabButtons.set(tab.id, tabBtn);
		}

		// Tab content area
		this.contentEl = this.containerEl.createDiv({ cls: 'obsiman-operations-content' });
		this.renderTabContent();

		// Pinned queue
		this.pinnedQueueEl = this.containerEl.createDiv({ cls: 'obsiman-operations-pinned-queue' });
		this.renderPinnedQueue();
	}

	// --- Toggle ---

	private toggle(): void {
		this.expanded = !this.expanded;
		this.callbacks.onToggle?.(this.expanded);
		this.render();
	}

	// --- Tab switching ---

	private switchTab(id: TabId): void {
		if (id === this.activeTab) return;
		this.tabButtons.get(this.activeTab)?.removeClass('is-active');
		this.activeTab = id;
		this.tabButtons.get(id)?.addClass('is-active');
		this.renderTabContent();
	}

	private renderTabContent(): void {
		if (!this.contentEl) return;
		this.contentEl.empty();

		switch (this.activeTab) {
			case 'rename':
				this.renderRenameTab();
				break;
			case 'linter':
				this.renderLinterTab();
				break;
			case 'templates':
				this.renderTemplatesTab();
				break;
			case 'move':
				this.renderMoveTab();
				break;
		}
	}

	// --- Pinned queue ---

	private renderPinnedQueue(): void {
		if (!this.pinnedQueueEl) return;
		this.pinnedQueueEl.empty();

		// Header
		const header = this.pinnedQueueEl.createDiv({ cls: 'obsiman-pinned-queue-header' });
		header.createSpan({ text: t('ops.tab.queue'), cls: 'obsiman-pinned-queue-title' });

		const badge = header.createSpan({ cls: 'obsiman-pinned-queue-badge' });
		badge.setText(String(this.plugin.queueService.queue.length));

		// Queue list (selectable)
		const listContainer = this.pinnedQueueEl.createDiv({ cls: 'obsiman-pinned-queue-list' });
		this.pinnedQueueList = new QueueListComponent(listContainer, {
			onRemove: (index) => {
				this.plugin.queueService.remove(index);
				this.refreshQueue();
			},
			selectable: true,
		});
		this.pinnedQueueList.render(this.plugin.queueService.queue);

		// Action buttons
		const actionRow = this.pinnedQueueEl.createDiv({ cls: 'obsiman-pinned-queue-actions' });

		const removeSelectedBtn = actionRow.createEl('button', {
			cls: 'obsiman-btn-small',
			text: t('ops.remove_selected') ?? 'Remove selected',
		});
		removeSelectedBtn.addEventListener('click', () => {
			if (!this.pinnedQueueList) return;
			const indices = this.pinnedQueueList.getSelectedIndices();
			// Remove in reverse order to preserve indices
			for (const idx of [...indices].sort((a, b) => b - a)) {
				this.plugin.queueService.remove(idx);
			}
			this.refreshQueue();
		});

		const applyBtn = actionRow.createEl('button', {
			cls: 'obsiman-btn-small mod-cta',
			text: t('ops.apply') ?? 'Apply',
		});
		applyBtn.addEventListener('click', () => {
			if (!this.plugin.queueService.isEmpty) {
				void this.plugin.queueService.execute();
			}
		});

		const clearQueueBtn = actionRow.createEl('button', {
			cls: 'obsiman-btn-small',
			text: t('ops.clear'),
		});
		clearQueueBtn.addEventListener('click', () => {
			this.plugin.queueService.clear();
			this.refreshQueue();
		});

		if (this.callbacks.onClearSelected) {
			const clearSelectedBtn = actionRow.createEl('button', {
				cls: 'obsiman-btn-small',
				text: t('statusbar.clear_selected') ?? 'Clear selected',
			});
			clearSelectedBtn.addEventListener('click', () => {
				this.callbacks.onClearSelected?.();
			});
		}
	}

	// --- Tab renderers ---

	private renderRenameTab(): void {
		if (!this.contentEl) return;

		this.contentEl.createEl('p', {
			cls: 'obsiman-ops-tab-desc',
			text: t('rename.title'),
		});

		const openBtn = this.contentEl.createEl('button', {
			cls: 'obsiman-btn',
			text: t('rename.title'),
		});
		openBtn.addEventListener('click', () => {
			const files = this.plugin.filterService.filteredFiles;
			new FileRenameModal(
				this.plugin.app,
				this.plugin.propertyIndex,
				files,
				(change) => this.plugin.queueService.add(change)
			).open();
		});
	}

	private renderLinterTab(): void {
		if (!this.contentEl) return;

		const openBtn = this.contentEl.createEl('button', {
			cls: 'obsiman-btn',
			text: t('linter.button'),
		});
		openBtn.addEventListener('click', () => {
			const files = this.plugin.filterService.filteredFiles;
			new LinterModal(this.plugin.app, this.plugin.propertyIndex, files).open();
		});
	}

	private renderTemplatesTab(): void {
		if (!this.contentEl) return;

		const templates = this.plugin.settings.filterTemplates;

		if (templates.length === 0) {
			this.contentEl.createEl('p', {
				cls: 'obsiman-ops-tab-desc',
				text: t('settings.templates.desc'),
			});
		} else {
			const listEl = this.contentEl.createDiv({ cls: 'obsiman-template-list' });
			for (const tmpl of templates) {
				const row = listEl.createDiv({ cls: 'obsiman-template-row' });
				row.createSpan({ text: tmpl.name });
				row.createSpan({
					cls: 'obsiman-text-muted',
					text: ` (${tmpl.root.children.length})`,
				});

				const loadBtn = row.createEl('button', {
					cls: 'obsiman-btn-small',
					text: t('filter.template.load'),
				});
				loadBtn.addEventListener('click', () => {
					this.plugin.filterService.loadTemplate(tmpl);
				});
			}
		}

		const saveBtn = this.contentEl.createEl('button', {
			cls: 'obsiman-btn-small',
			text: t('filter.template.save'),
		});
		saveBtn.addEventListener('click', () => {
			new SaveTemplateModal(
				this.plugin.app,
				this.plugin,
				this.plugin.filterService.activeFilter
			).open();
		});
	}

	private renderMoveTab(): void {
		if (!this.contentEl) return;

		this.contentEl.createEl('p', {
			cls: 'obsiman-ops-tab-desc obsiman-text-muted',
			text: t('ops.move.coming_soon'),
		});
	}

	// --- Public API ---

	refreshQueue(): void {
		if (this.expanded && this.pinnedQueueList) {
			this.renderPinnedQueue();
		}
	}
}
