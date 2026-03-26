import { setIcon } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { QueueListComponent } from './QueueListComponent';
import { QueueDetailsModal } from '../modals/QueueDetailsModal';
import { LinterModal } from '../modals/LinterModal';
import { FileRenameModal } from '../modals/FileRenameModal';
import { SaveTemplateModal } from '../modals/SaveTemplateModal';
import { t } from '../i18n/index';

type TabId = 'queue' | 'rename' | 'linter' | 'templates' | 'move';

interface Tab {
	id: TabId;
	labelKey: string;
	icon: string;
}

const TABS: Tab[] = [
	{ id: 'queue', labelKey: 'ops.tab.queue', icon: 'lucide-git-compare' },
	{ id: 'rename', labelKey: 'ops.tab.rename', icon: 'lucide-pencil-line' },
	{ id: 'linter', labelKey: 'ops.tab.linter', icon: 'lucide-align-left' },
	{ id: 'templates', labelKey: 'ops.tab.templates', icon: 'lucide-bookmark' },
	{ id: 'move', labelKey: 'ops.tab.move', icon: 'lucide-folder-input' },
];

/**
 * Operations panel with tabbed interface.
 * Tabs: Queue/Diff, Rename, Linter, Templates, Move to Folder.
 */
export class OperationsPanelComponent {
	private containerEl: HTMLElement;
	private plugin: ObsiManPlugin;
	private contentEl!: HTMLElement;
	private activeTab: TabId = 'queue';
	private tabButtons = new Map<TabId, HTMLElement>();
	private queueList: QueueListComponent | null = null;

	constructor(containerEl: HTMLElement, plugin: ObsiManPlugin) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.render();
	}

	private render(): void {
		this.containerEl.empty();

		// Tab bar
		const tabBar = this.containerEl.createDiv({ cls: 'obsiman-operations-tabs' });
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

		// Content area
		this.contentEl = this.containerEl.createDiv({ cls: 'obsiman-operations-content' });
		this.renderTabContent();
	}

	private switchTab(id: TabId): void {
		if (id === this.activeTab) return;
		this.tabButtons.get(this.activeTab)?.removeClass('is-active');
		this.activeTab = id;
		this.tabButtons.get(id)?.addClass('is-active');
		this.renderTabContent();
	}

	private renderTabContent(): void {
		this.contentEl.empty();

		switch (this.activeTab) {
			case 'queue':
				this.renderQueueTab();
				break;
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

	private renderQueueTab(): void {
		const listContainer = this.contentEl.createDiv({ cls: 'obsiman-queue-container' });
		this.queueList = new QueueListComponent(listContainer, (index) => {
			this.plugin.queueService.remove(index);
			this.refreshQueue();
		});
		this.queueList.render(this.plugin.queueService.queue);

		// Action buttons
		const actionRow = this.contentEl.createDiv({ cls: 'obsiman-queue-actions' });

		const detailsBtn = actionRow.createEl('button', {
			cls: 'obsiman-btn-small',
			text: t('queue.title'),
		});
		detailsBtn.addEventListener('click', () => {
			new QueueDetailsModal(this.plugin.app, this.plugin.queueService).open();
		});

		const clearBtn = actionRow.createEl('button', {
			cls: 'obsiman-btn-small',
			text: t('ops.clear'),
		});
		clearBtn.addEventListener('click', () => {
			this.plugin.queueService.clear();
			this.refreshQueue();
		});
	}

	private renderRenameTab(): void {
		const desc = this.contentEl.createEl('p', {
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

		// Save current as template
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
		this.contentEl.createEl('p', {
			cls: 'obsiman-ops-tab-desc obsiman-text-muted',
			text: t('ops.move.coming_soon'),
		});
	}

	refreshQueue(): void {
		if (this.activeTab === 'queue' && this.queueList) {
			this.queueList.render(this.plugin.queueService.queue);
		}
	}
}
