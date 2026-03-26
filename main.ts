import { Plugin, type WorkspaceLeaf } from 'obsidian';
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
import { ObsiManSettingsTab } from './src/settings/ObsiManSettingsTab';
import { setLanguage } from './src/i18n/index';

export class ObsiManPlugin extends Plugin {
	settings!: ObsiManSettings;

	// Core services — public so views/modals can access them
	propertyIndex!: PropertyIndexService;
	filterService!: FilterService;
	queueService!: OperationQueueService;
	sessionService!: SessionFileService;
	iconicService!: IconicService;
	propertyTypeService!: PropertyTypeService;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Initialize i18n
		setLanguage(this.settings.language);

		// Initialize services
		this.propertyIndex = new PropertyIndexService(this.app);
		this.filterService = new FilterService(this.app);
		this.queueService = new OperationQueueService(this.app);
		this.sessionService = new SessionFileService(this.app);
		this.iconicService = new IconicService();
		this.propertyTypeService = new PropertyTypeService();

		// Load async services
		this.iconicService.load(this.app);
		this.propertyTypeService.load(this.app);

		// Register services for lifecycle management
		this.addChild(this.propertyIndex);
		this.addChild(this.filterService);
		this.addChild(this.queueService);
		this.addChild(this.sessionService);

		// Register views
		this.registerView(OBSIMAN_VIEW_TYPE, (leaf) => new ObsiManView(leaf, this));
		this.registerView(
			OBSIMAN_MAIN_VIEW_TYPE,
			(leaf) => new ObsiManMainView(leaf, this)
		);

		// Ribbon icon opens the main (full-screen) view
		this.addRibbonIcon('settings-2', 'ObsiMan', () => {
			this.activateMainView();
		});

		// Commands
		this.addCommand({
			id: 'open-obsiman-main',
			name: 'Open ObsiMan (full view)',
			callback: () => this.activateMainView(),
		});

		this.addCommand({
			id: 'open-obsiman-sidebar',
			name: 'Open ObsiMan sidebar',
			callback: () => this.activateSidebarView(),
		});

		this.addCommand({
			id: 'apply-queue',
			name: 'Apply pending operations',
			checkCallback: (checking) => {
				if (this.queueService.isEmpty) return false;
				if (!checking) {
					this.queueService.execute();
				}
				return true;
			},
		});

		// Settings tab
		this.addSettingTab(new ObsiManSettingsTab(this.app, this));

		console.log('ObsiMan loaded');
	}

	onunload(): void {
		console.log('ObsiMan unloaded');
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/** Open the main (full-screen) view in the center workspace */
	private async activateMainView(): Promise<void> {
		const { workspace } = this.app;

		const leaves = workspace.getLeavesOfType(OBSIMAN_MAIN_VIEW_TYPE);
		if (leaves.length > 0) {
			workspace.revealLeaf(leaves[0]);
			return;
		}

		const leaf = workspace.getLeaf('tab');
		await leaf.setViewState({
			type: OBSIMAN_MAIN_VIEW_TYPE,
			active: true,
		});
		workspace.revealLeaf(leaf);
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
			workspace.revealLeaf(leaf);
		}
	}
}

export default ObsiManPlugin;
