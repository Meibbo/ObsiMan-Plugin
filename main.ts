import { addIcon, Plugin, type WorkspaceLeaf } from 'obsidian';
import type { ObsiManSettings } from './src/types/settings';
import { DEFAULT_SETTINGS } from './src/types/settings';
import { PropertyIndexService } from './src/services/PropertyIndexService';
import { FilterService } from './src/services/FilterService';
import { OperationQueueService } from './src/services/OperationQueueService';
import { SessionFileService } from './src/services/SessionFileService';
import { ObsiManView, OBSIMAN_VIEW_TYPE } from './src/views/ObsiManView';
import { ObsiManMainView, OBSIMAN_MAIN_VIEW_TYPE } from './src/views/ObsiManMainView';
import { IconicService } from './src/services/IconicService';
import { PropertyTypeService } from './src/services/PropertyTypeService';
import { BaseFileService } from './src/services/BaseFileService';
import { ObsiManSettingsTab } from './src/settings/ObsiManSettingsTab';
import { setLanguage, t } from './src/i18n/index';

// Custom SVG icon for ObsiMan (100x100 viewBox, currentColor fill)
const OBSIMAN_ICON_SVG = `<g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="10" width="72" height="80" rx="6"/><line x1="30" y1="30" x2="70" y2="30"/><line x1="30" y1="50" x2="70" y2="50"/><line x1="30" y1="70" x2="55" y2="70"/><circle cx="72" cy="72" r="18" fill="currentColor" stroke="none" opacity="0.15"/><path d="M64 72h16 M72 64v16" stroke-width="5"/></g>`;

export class ObsiManPlugin extends Plugin {
	settings!: ObsiManSettings;

	// Core services — public so views/modals can access them
	propertyIndex!: PropertyIndexService;
	filterService!: FilterService;
	queueService!: OperationQueueService;
	sessionService!: SessionFileService;
	iconicService!: IconicService;
	propertyTypeService!: PropertyTypeService;
	baseFileService!: BaseFileService;

	// Native status bar element
	private statusBarEl!: HTMLElement;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Initialize i18n
		setLanguage(this.settings.language);

		// Register custom icon
		addIcon('obsiman-icon', OBSIMAN_ICON_SVG);

		// Initialize and register all services for lifecycle management
		this.propertyIndex = new PropertyIndexService(this.app);
		this.filterService = new FilterService(this.app);
		this.queueService = new OperationQueueService(this.app);
		this.sessionService = new SessionFileService(this.app);
		this.iconicService = new IconicService(this.app);
		this.propertyTypeService = new PropertyTypeService(this.app);
		this.baseFileService = new BaseFileService(this.app, this);

		this.addChild(this.propertyIndex);
		this.addChild(this.filterService);
		this.addChild(this.queueService);
		this.addChild(this.sessionService);
		this.addChild(this.iconicService);
		this.addChild(this.propertyTypeService);
		this.addChild(this.baseFileService);

		// Re-apply filters when metadata cache finishes resolving
		this.registerEvent(
			this.app.metadataCache.on('resolved', () => {
				this.filterService.applyFilters();
			})
		);

		// Native status bar
		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass('obsiman-native-statusbar');

		// Register views
		this.registerView(OBSIMAN_VIEW_TYPE, (leaf) => new ObsiManView(leaf, this));
		this.registerView(
			OBSIMAN_MAIN_VIEW_TYPE,
			(leaf) => new ObsiManMainView(leaf, this)
		);

		// Ribbon icon opens the main (full-screen) view
		this.addRibbonIcon('obsiman-icon', 'Open main view', () => {
			void this.activateMainView();
		});

		// Commands
		this.addCommand({
			id: 'open-main',
			name: 'Open full view',
			callback: () => void this.activateMainView(),
		});

		this.addCommand({
			id: 'open-sidebar',
			name: 'Open sidebar',
			callback: () => void this.activateSidebarView(),
		});

		this.addCommand({
			id: 'apply-queue',
			name: 'Apply pending operations',
			checkCallback: (checking) => {
				if (this.queueService.isEmpty) return false;
				if (!checking) {
					void this.queueService.execute();
				}
				return true;
			},
		});

		// Settings tab
		this.addSettingTab(new ObsiManSettingsTab(this.app, this));
	}

	async onExternalSettingsChange(): Promise<void> {
		await this.loadSettings();
		setLanguage(this.settings.language);
	}

	async loadSettings(): Promise<void> {
		const saved = ((await this.loadData()) ?? {}) as Partial<ObsiManSettings>;
		this.settings = {
			...(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as ObsiManSettings),
			...saved,
		};
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/** Update Obsidian's native status bar with current stats */
	refreshStatusBar(): void {
		if (!this.statusBarEl) return;

		const filteredFiles = this.filterService.filteredFiles;
		const filtered = filteredFiles.length;
		const total = this.propertyIndex.fileCount;
		const queued = this.queueService.queue.length;

		// Compute property and value counts
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

		const parts: string[] = [
			t('statusbar.files', { count: total }),
			t('statusbar.filtered_label', { count: filtered }),
			t('statusbar.props_label', { count: propSet.size }),
			t('statusbar.values_label', { count: valueCount }),
		];

		if (queued > 0) {
			parts.push(t('statusbar.pending', { count: queued }));
		}

		this.statusBarEl.setText(parts.join(' | '));
	}

	/** Open the main (full-screen) view in the center workspace */
	private async activateMainView(): Promise<void> {
		const { workspace } = this.app;

		const leaves = workspace.getLeavesOfType(OBSIMAN_MAIN_VIEW_TYPE);
		if (leaves.length > 0) {
			await workspace.revealLeaf(leaves[0]);
			return;
		}

		const leaf = workspace.getLeaf('tab');
		await leaf.setViewState({
			type: OBSIMAN_MAIN_VIEW_TYPE,
			active: true,
		});
		await workspace.revealLeaf(leaf);
	}

	/** Open the sidebar view */
	private async activateSidebarView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(OBSIMAN_VIEW_TYPE);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({
					type: OBSIMAN_VIEW_TYPE,
					active: true,
				});
			}
		}

		if (leaf) {
			await workspace.revealLeaf(leaf);
		}
	}
}

export default ObsiManPlugin;
