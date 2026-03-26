import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type { ObsiManPlugin } from '../../main';
import { PropertyExplorerComponent } from '../components/PropertyExplorerComponent';
import { FilterTreeComponent } from '../components/FilterTreeComponent';
import { FileListComponent } from '../components/FileListComponent';
import { QueueListComponent } from '../components/QueueListComponent';
import { AddFilterModal } from '../modals/AddFilterModal';
import { QueueDetailsModal } from '../modals/QueueDetailsModal';
import { LinterModal } from '../modals/LinterModal';
import { FileRenameModal } from '../modals/FileRenameModal';
import { SaveTemplateModal } from '../modals/SaveTemplateModal';
import { t } from '../i18n/index';

export const OBSIMAN_VIEW_TYPE = 'obsiman-view';

/**
 * Main sidebar view with 3 collapsible sections:
 * 1. Filters — boolean filter tree with templates
 * 2. Files — checkable file list with search/sort
 * 3. Operations — property operations + queue
 */
export class ObsiManView extends ItemView {
	private plugin: ObsiManPlugin;

	private explorer!: PropertyExplorerComponent;
	private filterTree!: FilterTreeComponent;
	private fileList!: FileListComponent;
	private queueList!: QueueListComponent;

	// Section containers
	private explorerSection!: HTMLElement;
	private filterSection!: HTMLElement;
	private filesSection!: HTMLElement;
	private opsSection!: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: ObsiManPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return OBSIMAN_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t('plugin.name');
	}

	getIcon(): string {
		return 'settings-2';
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsiman-view');

		this.renderExplorerSection(contentEl);
		this.renderFilterSection(contentEl);
		this.renderFilesSection(contentEl);
		this.renderOpsSection(contentEl);

		// Subscribe to service events
		const filterChanged = () => this.refreshFiles();
		this.plugin.filterService.on('changed', filterChanged);
		this.register(() => this.plugin.filterService.off('changed', filterChanged));

		const queueChanged = () => this.refreshQueue();
		this.plugin.queueService.on('changed', queueChanged);
		this.register(() => this.plugin.queueService.off('changed', queueChanged));

		// Initial render
		this.refreshFiles();
		this.refreshQueue();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	// --- Explorer Section ---

	private renderExplorerSection(parent: HTMLElement): void {
		this.explorerSection = parent.createDiv({ cls: 'obsiman-section' });

		const header = this.explorerSection.createDiv({ cls: 'obsiman-section-header' });
		header.createEl('h4', { text: t('explorer.title') });

		const explorerContainer = this.explorerSection.createDiv({ cls: 'obsiman-explorer-container' });
		this.explorer = new PropertyExplorerComponent(explorerContainer, this.plugin);
		this.explorer.render();
	}

	// --- Filter Section ---

	private renderFilterSection(parent: HTMLElement): void {
		this.filterSection = parent.createDiv({ cls: 'obsiman-section' });

		const header = this.filterSection.createDiv({ cls: 'obsiman-section-header' });
		header.createEl('h4', { text: t('section.filters') });

		// Template dropdown
		const templateRow = this.filterSection.createDiv({ cls: 'obsiman-filter-actions' });
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
				const tmpl = this.plugin.settings.filterTemplates.find((t) => t.name === name);
				if (tmpl) this.plugin.filterService.loadTemplate(tmpl);
			}
		});

		// Action buttons
		const btnRow = this.filterSection.createDiv({ cls: 'obsiman-filter-buttons' });

		const addFilterBtn = btnRow.createEl('button', {
			cls: 'obsiman-btn',
			text: t('filter.add_rule'),
		});
		addFilterBtn.addEventListener('click', () => this.openAddFilterModal());

		const clearBtn = btnRow.createEl('button', {
			cls: 'obsiman-btn',
			text: t('filter.clear'),
		});
		clearBtn.addEventListener('click', () => {
			this.plugin.filterService.clearFilters();
			this.refreshFilterTree();
		});

		const saveTemplateBtn = btnRow.createEl('button', {
			cls: 'obsiman-btn',
			text: t('filter.template.save'),
		});
		saveTemplateBtn.addEventListener('click', () => {
			new SaveTemplateModal(
				this.app,
				this.plugin,
				this.plugin.filterService.activeFilter
			).open();
		});

		const refreshBtn = btnRow.createEl('button', {
			cls: 'obsiman-btn',
			text: t('filter.refresh'),
		});
		refreshBtn.addEventListener('click', () => {
			this.plugin.propertyIndex.rebuild();
			this.plugin.filterService.applyFilters();
		});

		// Filter tree container
		const treeContainer = this.filterSection.createDiv({ cls: 'obsiman-filter-tree' });
		this.filterTree = new FilterTreeComponent(treeContainer, (node, parent) => {
			this.plugin.filterService.removeNode(node, parent);
			this.refreshFilterTree();
		});
	}

	private refreshFilterTree(): void {
		this.filterTree.render(this.plugin.filterService.activeFilter);
	}

	private openAddFilterModal(): void {
		new AddFilterModal(
			this.app,
			this.plugin.propertyIndex.getPropertyNames(),
			(prop) => this.plugin.propertyIndex.getPropertyValues(prop),
			(node) => {
				this.plugin.filterService.addNode(node);
				this.refreshFilterTree();
			}
		).open();
	}

	// --- Files Section ---

	private renderFilesSection(parent: HTMLElement): void {
		this.filesSection = parent.createDiv({ cls: 'obsiman-section' });

		const header = this.filesSection.createDiv({ cls: 'obsiman-section-header' });
		header.createEl('h4', { text: t('section.files') });

		const listContainer = this.filesSection.createDiv({ cls: 'obsiman-file-list-container' });
		this.fileList = new FileListComponent(listContainer, this.app, () => {
			// Selection changed — could update status bar or ops section
		});
	}

	private refreshFiles(): void {
		const filtered = this.plugin.filterService.filteredFiles;
		const total = this.plugin.propertyIndex.fileCount;

		this.fileList.render(filtered, total);
		this.refreshFilterTree();
	}

	// --- Operations Section ---

	private renderOpsSection(parent: HTMLElement): void {
		this.opsSection = parent.createDiv({ cls: 'obsiman-section' });

		const header = this.opsSection.createDiv({ cls: 'obsiman-section-header' });
		header.createEl('h4', { text: t('section.operations') });

		// Operation buttons
		const btnRow = this.opsSection.createDiv({ cls: 'obsiman-ops-buttons' });

		const linterBtn = btnRow.createEl('button', {
			cls: 'obsiman-btn',
			text: t('linter.button'),
		});
		linterBtn.addEventListener('click', () => this.openLinter());

		const renameBtn = btnRow.createEl('button', {
			cls: 'obsiman-btn',
			text: t('rename.title'),
		});
		renameBtn.addEventListener('click', () => this.openFileRename());

		// Save template button in filter section is handled separately

		// Queue container
		const queueContainer = this.opsSection.createDiv({ cls: 'obsiman-queue-container' });
		this.queueList = new QueueListComponent(queueContainer, (index) => {
			this.plugin.queueService.remove(index);
		});

		// Apply / Clear buttons
		const actionRow = this.opsSection.createDiv({ cls: 'obsiman-queue-actions' });

		const applyBtn = actionRow.createEl('button', {
			cls: 'obsiman-btn mod-cta',
			text: t('ops.apply'),
		});
		applyBtn.addEventListener('click', () => {
			if (this.plugin.queueService.isEmpty) return;
			new QueueDetailsModal(this.app, this.plugin.queueService).open();
		});

		const clearBtn = actionRow.createEl('button', {
			cls: 'obsiman-btn',
			text: t('ops.clear'),
		});
		clearBtn.addEventListener('click', () => this.plugin.queueService.clear());

		// Stats
		this.opsSection.createDiv({ cls: 'obsiman-stats' });
	}

	private refreshQueue(): void {
		this.queueList.render(this.plugin.queueService.queue);

		// Update stats
		const statsEl = this.opsSection.querySelector('.obsiman-stats');
		if (statsEl) {
			statsEl.empty();
			const total = this.plugin.propertyIndex.fileCount;
			const propCount = this.plugin.propertyIndex.index.size;
			(statsEl as HTMLElement).createSpan({
				text: `${total} files · ${propCount} properties`,
				cls: 'obsiman-stats-text',
			});
		}
	}

	private openFileRename(): void {
		const selected = this.fileList.getSelectedFiles();
		const targets =
			selected.length > 0 ? selected : this.plugin.filterService.filteredFiles;

		new FileRenameModal(
			this.app,
			this.plugin.propertyIndex,
			targets,
			(change) => this.plugin.queueService.add(change)
		).open();
	}

	private openLinter(): void {
		const selected = this.fileList.getSelectedFiles();
		const targets =
			selected.length > 0 ? selected : this.plugin.filterService.filteredFiles;

		new LinterModal(this.app, this.plugin.propertyIndex, targets).open();
	}
}
