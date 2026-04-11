import { Plugin } from 'obsidian';
import type { ObsiManSettings } from './src/types/settings';
import { DEFAULT_SETTINGS } from './src/types/settings';
import { PropertyIndexService } from './src/services/PropertyIndexService';
import { FilterService } from './src/services/FilterService';
import { OperationQueueService } from './src/services/OperationQueueService';
import { ObsiManView, OBSIMAN_VIEW_TYPE } from './src/views/ObsiManView';
import { IconicService } from './src/services/IconicService';
import { PropertyTypeService } from './src/services/PropertyTypeService';
import { ObsiManSettingsTab } from './src/settings/ObsiManSettingsTab';
import { setLanguage, translate } from './src/i18n/index';

export class ObsiManPlugin extends Plugin {
	settings!: ObsiManSettings;

	// Core services — public so views/modals can access them
	propertyIndex!: PropertyIndexService;
	filterService!: FilterService;
	queueService!: OperationQueueService;
	iconicService!: IconicService;
	propertyTypeService!: PropertyTypeService;

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

		this.addChild(this.propertyIndex);
		this.addChild(this.filterService);
		this.addChild(this.queueService);
		this.addChild(this.iconicService);
		this.addChild(this.propertyTypeService);

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

		this.registerView(OBSIMAN_VIEW_TYPE, (leaf) => new ObsiManView(leaf, this));

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
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(OBSIMAN_VIEW_TYPE)[0];

		if (!leaf) {
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
			void workspace.revealLeaf(leaf);
		}
	}

}

export default ObsiManPlugin;
