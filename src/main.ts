//********************************************************************\\
//*      ___|^___^|___      .-~*´¨¯¨¯¯¨¯¨`*~-.     ___|^___^|___     *\\
//*     |   Meibbo   |     | Vaultman v1.0.0 |    | April 2026 |     *\\
//*     \___/`*´\___/      `-~*´¨¯¨¯¯¨¯¨`*~-´     \___/`*´\___/      *\\
//*                                                                  *\\
//*           Made with love for tools that last and help.           *\\
//*                                                                  *\\
//*     (づ￣ 3￣)づ    ☆*: .｡. o(≧▽≦)o .｡.:*☆     ╰(*°▽°*)╯      *\\
//********************************************************************\\

/*------------------————————————————————————————————-------------------/
/########|||-------|                                |------|||#########/
/#===°°===°°===°°==|      Main TypeScript File      |==°°===°°===°°===#/
/########|||-------|                                |------|||#########/
/-------------------————————————————————————————————------------------*/
//        Here is defined the connection between the different        \\
//    services that Obsidian offers to the plugin and the main        \\
//    classes of the plugin.
//--------------------------------------------------------------------//

//...----------—————————————(   IMPORTS   )————————————------------...\\
import { Plugin, WorkspaceLeaf } from 'obsidian';
import type { VaultmanSettings } from './types/typeSettings';
import { DEFAULT_SETTINGS } from './types/typeSettings';
import { PropertyIndexService } from './utils/utilPropIndex';
import { FilterService } from './services/serviceFilter.svelte';
import { OperationQueueService } from './services/serviceQueue.svelte';
import { VaultmanFrame, TYPE_FRAME_VM } from './types/typeFrame';
import { IconicService } from './services/serviceIcons';
import { PropertyTypeService } from './utils/utilPropType';
import { ContextMenuService } from './services/serviceCMenu';
import { VaultmanSettingsTab } from './settingsVM';
import { translate } from './i18n/index';
import { createFilesIndex } from './services/serviceFilesIndex';
import { createTagsIndex } from './services/serviceTagsIndex';
import { createPropsIndex } from './services/servicePropsIndex';
import { createContentIndex } from './services/serviceContentIndex';
import { createOperationsIndex } from './services/serviceOperationsIndex';
import { createActiveFiltersIndex } from './services/serviceActiveFiltersIndex';
import { createCSSSnippetsIndex } from './services/serviceCSSSnippetsIndex';
import { createTemplatesIndex } from './services/serviceTemplatesIndex';
import { OverlayStateService } from './services/serviceOverlayState.svelte';
import type {
	IFilesIndex,
	ITagsIndex,
	IPropsIndex,
	IContentIndex,
	IOperationsIndex,
	IActiveFiltersIndex,
	ICSSSnippetsIndex,
	ITemplatesIndex,
	IOverlayState,
} from './types/contracts';

export class VaultmanPlugin extends Plugin {
	settings!: VaultmanSettings;

	// Core services — public so components/modals can access them
	propertyIndex!: PropertyIndexService;
	filterService!: FilterService;
	queueService!: OperationQueueService;
	iconicService!: IconicService;
	propertyTypeService!: PropertyTypeService;
	contextMenuService!: ContextMenuService;

	// New index interfaces (Sub-A hardening)
	filesIndex!: IFilesIndex;
	tagsIndex!: ITagsIndex;
	propsIndex!: IPropsIndex;
	contentIndex!: IContentIndex;
	operationsIndex!: IOperationsIndex;
	activeFiltersIndex!: IActiveFiltersIndex;
	cssSnippetsIndex!: ICSSSnippetsIndex;
	templatesIndex!: ITemplatesIndex;
	overlayState!: IOverlayState;

	// Native status bar element
	private statusBarEl!: HTMLElement;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.updateGlassBlur();

		this.filesIndex = createFilesIndex(this.app);
		this.tagsIndex = createTagsIndex(this.app);
		this.propsIndex = createPropsIndex(this.app);
		await Promise.all([this.filesIndex.refresh(), this.tagsIndex.refresh(), this.propsIndex.refresh()]);

		this.registerEvent(this.app.metadataCache.on('changed', () => {
			void this.propsIndex.refresh();
			void this.tagsIndex.refresh();
		}));
		this.registerEvent(this.app.vault.on('create', () => void this.filesIndex.refresh()));
		this.registerEvent(this.app.vault.on('delete', () => void this.filesIndex.refresh()));
		this.registerEvent(this.app.vault.on('rename', () => void this.filesIndex.refresh()));

		this.propertyIndex = new PropertyIndexService(this.app);
		this.filterService = new FilterService(this.app, this.filesIndex);
		this.queueService = new OperationQueueService(this.app);

		this.contentIndex = createContentIndex(this.app);
		this.operationsIndex = createOperationsIndex(this.queueService);
		this.activeFiltersIndex = createActiveFiltersIndex(this.filterService);
		this.cssSnippetsIndex = createCSSSnippetsIndex();
		this.templatesIndex = createTemplatesIndex();
		await Promise.all([
			this.contentIndex.refresh(),
			this.operationsIndex.refresh(),
			this.activeFiltersIndex.refresh(),
			this.cssSnippetsIndex.refresh(),
			this.templatesIndex.refresh(),
		]);
		this.overlayState = new OverlayStateService();
		this.iconicService = new IconicService(this.app);
		this.propertyTypeService = new PropertyTypeService(this.app);
		this.contextMenuService = new ContextMenuService(this);

		this.addChild(this.propertyIndex);
		this.addChild(this.queueService);
		this.addChild(this.iconicService);
		this.addChild(this.propertyTypeService);
		this.addChild(this.contextMenuService);

		this.registerEvent(
			this.app.metadataCache.on('resolved', () => {
				void this.filesIndex.refresh();
			})
		);

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass('vm-native-statusbar');

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

	onunload(): void {
		this.filterService.destroy();
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
		activeDocument.body.style.setProperty('--vm-glass-blur', `${px}px`);
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

