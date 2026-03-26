import type { TFile } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { FilterTreeComponent } from './FilterTreeComponent';
import { QueueListComponent } from './QueueListComponent';
import { AddFilterModal } from '../modals/AddFilterModal';
import { CreateSessionModal } from '../modals/CreateSessionModal';
import { LinterModal } from '../modals/LinterModal';
import { FileRenameModal } from '../modals/FileRenameModal';
import { SaveTemplateModal } from '../modals/SaveTemplateModal';
import { t } from '../i18n/index';

export interface ToolbarCallbacks {
	onSessionChange: (file: TFile | null) => void;
	onApplyQueue: () => void;
	onClearQueue: () => void;
	onFiltersChanged: () => void;
	onToggleExplorer?: () => void;
}

/**
 * Top toolbar for the main view.
 *
 * Layout:
 * [Session ▼] [Filters ▼] [Queue ▼] | [Properties] [Apply]
 *
 * Filter and Queue buttons toggle popover panels below the toolbar.
 */
export class ToolbarComponent {
	private containerEl: HTMLElement;
	private plugin: ObsiManPlugin;
	private callbacks: ToolbarCallbacks;

	// Popover elements
	private filterPopover!: HTMLElement;
	private queuePopover!: HTMLElement;
	private filterTree!: FilterTreeComponent;
	private queueList!: QueueListComponent;

	// Summary badge
	private filterBadge!: HTMLElement;
	private syncIndicator!: HTMLElement;
	private sessionSelect!: HTMLSelectElement;

	constructor(
		containerEl: HTMLElement,
		plugin: ObsiManPlugin,
		callbacks: ToolbarCallbacks
	) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.callbacks = callbacks;
		this.render();
	}

	private render(): void {
		this.containerEl.empty();

		const leftGroup = this.containerEl.createDiv({ cls: 'obsiman-toolbar-left' });
		const rightGroup = this.containerEl.createDiv({ cls: 'obsiman-toolbar-right' });

		// --- Session picker ---
		this.sessionSelect = leftGroup.createEl('select', {
			cls: 'obsiman-toolbar-select dropdown',
		});
		this.populateSessionSelect();

		const currentPath = this.plugin.settings.sessionFilePath;

		this.sessionSelect.addEventListener('change', async () => {
			const val = this.sessionSelect.value;
			if (val === '__new__') {
				this.sessionSelect.value = currentPath || '';
				this.openCreateSessionModal();
			} else if (val === '') {
				this.callbacks.onSessionChange(null);
			} else {
				const file = this.plugin.app.vault.getFileByPath(val);
				if (file) {
					this.callbacks.onSessionChange(file);
				}
			}
		});

		// Sync status indicator (●)
		this.syncIndicator = leftGroup.createSpan({ cls: 'obsiman-sync-indicator' });
		this.refreshSyncStatus();

		// --- Filter toggle ---
		const filterBtn = leftGroup.createEl('button', {
			cls: 'obsiman-toolbar-btn',
			text: t('toolbar.filters'),
		});
		this.filterBadge = filterBtn.createSpan({ cls: 'obsiman-toolbar-badge' });
		this.refreshFilterSummary();

		filterBtn.addEventListener('click', () => {
			this.togglePopover('filter');
		});

		// --- Queue toggle ---
		const queueBtn = leftGroup.createEl('button', {
			cls: 'obsiman-toolbar-btn',
			text: t('toolbar.queue'),
		});
		queueBtn.addEventListener('click', () => {
			this.togglePopover('queue');
		});

		// --- Explorer toggle ---
		if (this.callbacks.onToggleExplorer) {
			const explorerBtn = leftGroup.createEl('button', {
				cls: 'obsiman-toolbar-btn',
				text: t('explorer.toggle'),
			});
			explorerBtn.addEventListener('click', () =>
				this.callbacks.onToggleExplorer!()
			);
		}

		// --- Action buttons ---
		const linterBtn = rightGroup.createEl('button', {
			cls: 'obsiman-btn',
			text: t('linter.button'),
		});
		linterBtn.addEventListener('click', () => {
			const files = this.plugin.filterService.filteredFiles;
			new LinterModal(this.plugin.app, this.plugin.propertyIndex, files).open();
		});

		const renameBtn = rightGroup.createEl('button', {
			cls: 'obsiman-btn',
			text: t('rename.title'),
		});
		renameBtn.addEventListener('click', () => {
			const files = this.plugin.filterService.filteredFiles;
			new FileRenameModal(
				this.plugin.app,
				this.plugin.propertyIndex,
				files,
				(change) => this.plugin.queueService.add(change)
			).open();
		});

		const applyBtn = rightGroup.createEl('button', {
			cls: 'obsiman-btn mod-cta',
			text: t('ops.apply'),
		});
		applyBtn.addEventListener('click', () => this.callbacks.onApplyQueue());

		// --- Popover panels (hidden by default) ---
		this.filterPopover = this.containerEl.createDiv({
			cls: 'obsiman-popover obsiman-popover-hidden',
		});
		this.renderFilterPopover();

		this.queuePopover = this.containerEl.createDiv({
			cls: 'obsiman-popover obsiman-popover-hidden',
		});
		this.renderQueuePopover();
	}

	private renderFilterPopover(): void {
		this.filterPopover.empty();

		const header = this.filterPopover.createDiv({ cls: 'obsiman-popover-header' });
		header.createEl('h4', { text: t('section.filters') });

		// Template dropdown
		const templateRow = this.filterPopover.createDiv({ cls: 'obsiman-filter-actions' });
		const templateSelect = templateRow.createEl('select', {
			cls: 'obsiman-template-select dropdown',
		});
		templateSelect.createEl('option', { value: '', text: t('filter.template.none') });
		for (const tmpl of this.plugin.settings.filterTemplates) {
			templateSelect.createEl('option', { value: tmpl.name, text: tmpl.name });
		}
		templateSelect.addEventListener('change', () => {
			const name = templateSelect.value;
			if (name) {
				const tmpl = this.plugin.settings.filterTemplates.find(
					(t) => t.name === name
				);
				if (tmpl) {
					this.plugin.filterService.loadTemplate(tmpl);
					this.refreshFilterTree();
				}
			}
		});

		// Action buttons
		const btnRow = this.filterPopover.createDiv({ cls: 'obsiman-filter-buttons' });

		const addBtn = btnRow.createEl('button', {
			cls: 'obsiman-btn-small',
			text: t('filter.add_rule'),
		});
		addBtn.addEventListener('click', () => this.openAddFilterModal());

		const clearBtn = btnRow.createEl('button', {
			cls: 'obsiman-btn-small',
			text: t('filter.clear'),
		});
		clearBtn.addEventListener('click', () => {
			this.plugin.filterService.clearFilters();
			this.refreshFilterTree();
		});

		const saveBtn = btnRow.createEl('button', {
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

		const refreshBtn = btnRow.createEl('button', {
			cls: 'obsiman-btn-small',
			text: t('filter.refresh'),
		});
		refreshBtn.addEventListener('click', () => {
			this.plugin.propertyIndex.rebuild();
			this.plugin.filterService.applyFilters();
		});

		// Filter tree container
		const treeContainer = this.filterPopover.createDiv({ cls: 'obsiman-filter-tree' });
		this.filterTree = new FilterTreeComponent(treeContainer, (node, parent) => {
			this.plugin.filterService.removeNode(node, parent);
			this.refreshFilterTree();
		});

		this.refreshFilterTree();
	}

	private renderQueuePopover(): void {
		this.queuePopover.empty();

		const header = this.queuePopover.createDiv({ cls: 'obsiman-popover-header' });
		header.createEl('h4', { text: t('section.operations') });

		const listContainer = this.queuePopover.createDiv({ cls: 'obsiman-queue-container' });
		this.queueList = new QueueListComponent(listContainer, (index) => {
			this.plugin.queueService.remove(index);
			this.refreshQueueList();
		});

		const actionRow = this.queuePopover.createDiv({ cls: 'obsiman-queue-actions' });

		const clearBtn = actionRow.createEl('button', {
			cls: 'obsiman-btn-small',
			text: t('ops.clear'),
		});
		clearBtn.addEventListener('click', () => {
			this.callbacks.onClearQueue();
			this.refreshQueueList();
		});

		this.refreshQueueList();
	}

	private togglePopover(which: 'filter' | 'queue'): void {
		const target = which === 'filter' ? this.filterPopover : this.queuePopover;
		const other = which === 'filter' ? this.queuePopover : this.filterPopover;

		// Close the other popover
		other.addClass('obsiman-popover-hidden');

		// Toggle the target
		if (target.hasClass('obsiman-popover-hidden')) {
			target.removeClass('obsiman-popover-hidden');
			// Refresh content when opening
			if (which === 'filter') this.refreshFilterTree();
			else this.refreshQueueList();
		} else {
			target.addClass('obsiman-popover-hidden');
		}
	}

	private refreshFilterTree(): void {
		this.filterTree?.render(this.plugin.filterService.activeFilter);
		this.refreshFilterSummary();
	}

	private refreshQueueList(): void {
		this.queueList?.render(this.plugin.queueService.queue);
	}

	/** Update the filter count badge on the toolbar button */
	refreshFilterSummary(): void {
		if (!this.filterBadge) return;
		const count = this.plugin.filterService.activeFilter.children.length;
		this.filterBadge.setText(count > 0 ? ` (${count})` : '');
	}

	private openAddFilterModal(): void {
		new AddFilterModal(
			this.plugin.app,
			this.plugin.propertyIndex.getPropertyNames(),
			(prop) => this.plugin.propertyIndex.getPropertyValues(prop),
			(node) => {
				this.plugin.filterService.addNode(node);
				this.refreshFilterTree();
			}
		).open();
	}

	/** Populate session dropdown from vault files */
	private populateSessionSelect(): void {
		this.sessionSelect.empty();

		this.sessionSelect.createEl('option', {
			value: '',
			text: t('toolbar.no_session'),
		});

		const sessionFiles = this.plugin.sessionService.getSessionFiles();
		for (const f of sessionFiles) {
			this.sessionSelect.createEl('option', {
				value: f.path,
				text: f.basename,
			});
		}

		this.sessionSelect.createEl('option', {
			value: '__new__',
			text: t('toolbar.new_session'),
		});

		const currentPath = this.plugin.settings.sessionFilePath;
		if (currentPath) {
			this.sessionSelect.value = currentPath;
		}
	}

	/** Refresh the session dropdown (call when files are created/deleted) */
	refreshSessionList(): void {
		const currentVal = this.sessionSelect?.value;
		this.populateSessionSelect();
		if (currentVal && this.sessionSelect) {
			this.sessionSelect.value = currentVal;
		}
	}

	/** Update the sync status indicator */
	refreshSyncStatus(): void {
		if (!this.syncIndicator) return;
		const status = this.plugin.sessionService.getSyncStatus();
		this.syncIndicator.empty();

		switch (status) {
			case 'synced':
				this.syncIndicator.setText('●');
				this.syncIndicator.className = 'obsiman-sync-indicator obsiman-sync-ok';
				this.syncIndicator.title = t('session.synced');
				break;
			case 'conflict':
				this.syncIndicator.setText('●');
				this.syncIndicator.className = 'obsiman-sync-indicator obsiman-sync-conflict';
				this.syncIndicator.title = t('session.conflict');
				break;
			case 'external':
				this.syncIndicator.setText('●');
				this.syncIndicator.className = 'obsiman-sync-indicator obsiman-sync-external';
				this.syncIndicator.title = t('session.outdated');
				break;
			default:
				this.syncIndicator.setText('');
				this.syncIndicator.className = 'obsiman-sync-indicator';
				break;
		}
	}

	private openCreateSessionModal(): void {
		new CreateSessionModal(
			this.plugin.app,
			this.plugin,
			(file) => this.callbacks.onSessionChange(file)
		).open();
	}
}
