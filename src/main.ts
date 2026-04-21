//********************************************************************\\
//*      ___|^___^|___        .-~*´¨¯¨`*~-.        ___|^___^|___     *\\
//*     |  Vaultman  |       |   Meibbo   |       | April 2026 |     *\\
//*     \___/`*´\___/        `-~*´¨¯¨`*~-´        \___/`*´\___/      *\\
//*                                                                  *\\
//*           Made with love for tools that last and help.           *\\
//*                                                                  *\\
//*     (づ￣ 3￣)づ    ☆*: .｡. o(≧▽≦)o .｡.:*☆     ╰(*°▽°*)╯      *\\
//********************************************************************\\
//     This project is a gift for the community of Obsidian.md,       \\
//     a note-taking app that has helped me organize my thoughts.     \\
//                                                                    \\
//     Specially for those who invest their time and energy           \\
//     making tools and systems that multiply the extension and       \\
//     value of the work made in this app. For sharing it with        \\
//     others. And for those who use it, for letting me experience    \\
//     the joy of using tools that are made with passion and care.    \\
//********************************************************************\\

/*-----------------------------------------------------------------------
#########|||-------(                                 )------|||##########
#===°°===°°===°°===(      Main TypeScript File       )===°°===°°===°°===#
#########|||-------(                                 )------|||##########
-----------------------------------------------------------------------*/
import { Plugin, WorkspaceLeaf } from 'obsidian';
import type { VaultmanSettings } from './types/typeSettings';
import { DEFAULT_SETTINGS } from './types/typeSettings';
import { PropertyIndexService } from './utils/utilPropIndex';
import { FilterService } from './services/serviceFilter';
import { OperationQueueService } from './services/serviceQueue';
import { VaultmanFrame, TYPE_FRAME_VM } from './types/typeFrame';
import { IconicService } from './services/serviceIcons';
import { PropertyTypeService } from './utils/utilPropType';
import { ContextMenuService } from './services/serviceCMenu';
import { VaultmanSettingsTab } from './settingsVaultman';
import { translate } from './i18n/index';

export class VaultmanPlugin extends Plugin {
	settings!: VaultmanSettings;

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
		this.statusBarEl.addClass('vaultman-native-statusbar');

		this.addRibbonIcon('lucide-dessert', translate('plugin.open'), () => {
			void this.activateView();
		});

		this.registerView(TYPE_FRAME_VM, (leaf) => new VaultmanFrame(leaf, this));

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

		this.addSettingTab(new VaultmanSettingsTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		const saved = ((await this.loadData()) ?? {}) as Partial<VaultmanSettings>;
		const hasSavedTabLabelPref = Object.prototype.hasOwnProperty.call(saved, 'filtersShowTabLabels');
		const needsTabLabelMigration = saved.filtersTabLabelsMigrated !== true;

		this.settings = {
			...(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as VaultmanSettings),
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
		document.body.style.setProperty('--vaultman-glass-blur', `${px}px`);
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
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(TYPE_FRAME_VM)[0];

		if (!leaf) {
			if (mode === 'sidebar') {
				leaf = workspace.getLeftLeaf(false) || workspace.getRightLeaf(false);
			} else {
				leaf = workspace.getLeaf('tab');
			}

			if (leaf) {
				await leaf.setViewState({
					type: TYPE_FRAME_VM,
					active: true,
				});
			}
		}

		if (leaf) {
			void workspace.revealLeaf(leaf);
		}
	}
}

export default VaultmanPlugin;

