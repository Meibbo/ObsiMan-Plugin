import { Plugin, WorkspaceLeaf } from 'obsidian';
import type { ObsiManSettings } from './src/types/settings';
import { DEFAULT_SETTINGS } from './src/types/settings';
import { PropertyIndexService } from './src/services/PropertyIndexService';
import { FilterService } from './src/services/FilterService';
import { OperationQueueService } from './src/services/OperationQueueService';
import { ObsiManFrame, OBSIMAN_FRAME_TYPE } from './src/components/ObsiManFrame';
import { IconicService } from './src/services/IconicService';
import { PropertyTypeService } from './src/services/PropertyTypeService';
import { ContextMenuService } from './src/services/ContextMenuService';
import { ObsiManSettingsTab } from './src/settings/ObsiManSettingsTab';
import { setLanguage, translate } from './src/i18n/index';

export class ObsiManPlugin extends Plugin {
	settings!: ObsiManSettings;

	// Core services — public so components/modals can access them
	propertyIndex!: PropertyIndexService;
	filterService!: FilterService;
	queueService!: OperationQueueService;
	iconicService!: IconicService;
	propertyTypeService!: PropertyTypeService;
	contextMenuService!: ContextMenuService;

	// Native status bar element
	private statusBarEl!: HTMLElement;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.updateGlassBlur();

		setLanguage(this.settings.language);

		this.propertyIndex = new PropertyIndexService(this.app);
		this.filterService = new FilterService(this.app);
		this.queueService = new OperationQueueService(this.app);
		this.iconicService = new IconicService(this.app);
		this.propertyTypeService = new PropertyTypeService(this.app);
		this.contextMenuService = new ContextMenuService(this);

		this.addChild(this.propertyIndex);
		this.addChild(this.filterService);
		this.addChild(this.queueService);
		this.addChild(this.iconicService);
		this.addChild(this.propertyTypeService);
		this.addChild(this.contextMenuService);

		this.registerEvent(
			this.app.metadataCache.on('resolved', () => {
				this.filterService.applyFilters();
			})
		);

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass('obsiman-native-statusbar');

		this.addRibbonIcon('lucide-dessert', translate('plugin.open'), () => {
			void this.activateView();
		});

		this.registerView(OBSIMAN_FRAME_TYPE, (leaf) => new ObsiManFrame(leaf, this));

		this.addCommand({
			id: 'apply-queue',
			name: translate('command.apply_queue'),
			checkCallback: (checking) => {
				if (this.queueService.isEmpty) return false;
				if (!checking) {
					void this.queueService.execute();
				}
				return true;
			},
		});

		this.addCommand({
			id: 'open',
			name: translate('plugin.open'),
			callback: () => {
				void this.activateView();
			},
		});

		this.addSettingTab(new ObsiManSettingsTab(this.app, this));
	}

	async onExternalSettingsChange(): Promise<void> {
		await this.loadSettings();
		setLanguage(this.settings.language);
	}

	async loadSettings(): Promise<void> {
		const saved = ((await this.loadData()) ?? {}) as Partial<ObsiManSettings>;
		const hasSavedTabLabelPref = Object.prototype.hasOwnProperty.call(saved, 'filtersShowTabLabels');
		const needsTabLabelMigration = saved.filtersTabLabelsMigrated !== true;

		this.settings = {
			...(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as ObsiManSettings),
			...saved,
		};

		if (needsTabLabelMigration) {
			if (hasSavedTabLabelPref && saved.filtersShowTabLabels === false) {
				this.settings.filtersShowTabLabels = true;
			}
			this.settings.filtersTabLabelsMigrated = true;
			await this.saveData(this.settings);
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	updateGlassBlur(): void {
		const intensity: number = this.settings.glassBlurIntensity ?? 60;
		const px = (intensity / 100) * 20;
		document.body.style.setProperty('--obsiman-glass-blur', `${px}px`);
	}

	async activateView(): Promise<void> {
		const { openMode } = this.settings;

		if (openMode === 'sidebar' || openMode === 'both') {
			await this.openView('sidebar');
		}
		if (openMode === 'main' || openMode === 'both') {
			await this.openView('main');
		}
	}

	async openView(mode: 'sidebar' | 'main'): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(OBSIMAN_FRAME_TYPE)[0];

		if (!leaf) {
			if (mode === 'sidebar') {
				leaf = workspace.getLeftLeaf(false) || workspace.getRightLeaf(false);
			} else {
				leaf = workspace.getLeaf('tab');
			}

			if (leaf) {
				await leaf.setViewState({
					type: OBSIMAN_FRAME_TYPE,
					active: true,
				});
			}
		}

		if (leaf) {
			void workspace.revealLeaf(leaf);
		}
	}
}

export default ObsiManPlugin;
