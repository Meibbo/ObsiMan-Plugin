import { addIcon, Plugin, SuggestModal, TFile, type WorkspaceLeaf } from 'obsidian';
import type { ObsiManSettings } from './src/types/settings';
import { DEFAULT_SETTINGS } from './src/types/settings';
import { PropertyIndexService } from './src/services/PropertyIndexService';
import { FilterService } from './src/services/FilterService';
import { OperationQueueService } from './src/services/OperationQueueService';
import { SessionFileService } from './src/services/SessionFileService';
import { ObsiManView, OBSIMAN_VIEW_TYPE } from './src/views/ObsiManView';
import { ObsiManMainView, OBSIMAN_MAIN_VIEW_TYPE } from './src/views/ObsiManMainView';
import { ObsiManOpsView, OBSIMAN_OPS_VIEW_TYPE } from './src/views/ObsiManOpsView';
import { ObsiManExplorerView, OBSIMAN_EXPLORER_VIEW_TYPE } from './src/views/ObsiManExplorerView';
import { IconicService } from './src/services/IconicService';
import { PropertyTypeService } from './src/services/PropertyTypeService';
import { BasesCheckboxInjector } from './src/services/BasesCheckboxInjector';
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
	basesInjector!: BasesCheckboxInjector;

	// Native status bar element
	private statusBarEl!: HTMLElement;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.updateGlassBlur();

		setLanguage(this.settings.language);
		addIcon('obsiman-icon', OBSIMAN_ICON_SVG);

		this.propertyIndex = new PropertyIndexService(this.app);
		this.filterService = new FilterService(this.app);
		this.queueService = new OperationQueueService(this.app);
		this.sessionService = new SessionFileService(this.app);
		this.iconicService = new IconicService(this.app);
		this.propertyTypeService = new PropertyTypeService(this.app);
		this.basesInjector = new BasesCheckboxInjector();

		this.addChild(this.propertyIndex);
		this.addChild(this.filterService);
		this.addChild(this.queueService);
		this.addChild(this.sessionService);
		this.addChild(this.iconicService);
		this.addChild(this.propertyTypeService);
		this.addChild(this.basesInjector);

		this.registerEvent(
			this.app.metadataCache.on('resolved', () => {
				this.filterService.applyFilters();
			})
		);

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass('obsiman-native-statusbar');

		this.registerView(OBSIMAN_VIEW_TYPE, (leaf) => new ObsiManView(leaf, this));
		this.registerView(OBSIMAN_MAIN_VIEW_TYPE, (leaf) => new ObsiManMainView(leaf, this));
		this.registerView(OBSIMAN_OPS_VIEW_TYPE, (leaf) => new ObsiManOpsView(leaf, this));
		this.registerView(OBSIMAN_EXPLORER_VIEW_TYPE, (leaf) => new ObsiManExplorerView(leaf, this));

		this.addRibbonIcon('obsiman-icon', 'Open ObsiMan', () => {
			void this.activateSidebarView();
		});

		this.addCommand({
			id: 'attach-to-bases',
			name: 'Attach to .base file',
			callback: () => void this.runAttachCommand(),
		});

		this.addCommand({
			id: 'open-sidebar',
			name: 'Open sidebar',
			callback: () => void this.activateSidebarView(),
		});

		this.addCommand({
			id: 'open-main-view',
			name: 'Open main view (full screen)',
			callback: () => void this.activateMainView(),
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

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (!this.settings.basesAutoAttach || !leaf) return;
				const viewFile = (leaf.view as { file?: TFile }).file;
				if (viewFile?.extension === 'base') {
					void this.attachToBases(leaf);
				}
			})
		);

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

	updateGlassBlur(): void {
		const intensity: number = this.settings.glassBlurIntensity ?? 60;
		const px = (intensity / 100) * 20;
		document.body.style.setProperty('--obsiman-glass-blur', `${px}px`);
	}

	refreshStatusBar(): void {
		if (!this.statusBarEl) return;

		const filteredFiles = this.filterService.filteredFiles;
		const filtered = filteredFiles.length;
		const total = this.propertyIndex.fileCount;
		const queued = this.queueService.queue.length;

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

	private async runAttachCommand(): Promise<void> {
		const activeLeaf = this.app.workspace.getMostRecentLeaf();
		const activeFile = (activeLeaf?.view as { file?: TFile } | undefined)?.file;

		if (activeFile?.extension === 'base' && activeLeaf) {
			this.settings.basesLastUsedPath = activeFile.path;
			await this.saveSettings();
			await this.attachToBases(activeLeaf);
			return;
		}

		if (this.settings.basesOpenMode === 'last-used' && this.settings.basesLastUsedPath) {
			const file = this.app.vault.getFileByPath(this.settings.basesLastUsedPath);
			if (file) {
				const leaf = this.app.workspace.getLeaf('tab');
				await leaf.openFile(file);
				await this.attachToBases(leaf);
				return;
			}
		}

		new BasesFilePicker(this.app, (file) => {
			void (async () => {
				this.settings.basesLastUsedPath = file.path;
				await this.saveSettings();
				const leaf = this.app.workspace.getLeaf('tab');
				await leaf.openFile(file);
				await this.attachToBases(leaf);
			})();
		}).open();
	}

	async attachToBases(baseLeaf: WorkspaceLeaf): Promise<void> {
		const opsLeaf = this.app.workspace.createLeafBySplit(
			baseLeaf,
			'vertical',
			this.settings.basesOpsPanelSide === 'left'
		);
		await opsLeaf.setViewState({ type: OBSIMAN_OPS_VIEW_TYPE, active: false });

		const explorerLeaf = this.app.workspace.createLeafBySplit(
			baseLeaf,
			'vertical',
			this.settings.basesExplorerSide === 'left'
		);
		await explorerLeaf.setViewState({ type: OBSIMAN_EXPLORER_VIEW_TYPE, active: false });

		if (this.settings.basesInjectCheckboxes) {
			this.basesInjector.attach(baseLeaf);
		}

		document.body.toggleClass(
			'obsiman-bases-column-separators',
			this.settings.basesShowColumnSeparators
		);

		this.app.workspace.setActiveLeaf(baseLeaf, { focus: true });
	}

	async activateSidebarView(): Promise<void> {
		await this.openSidebarLeaf();
	}

	async activateMainView(): Promise<void> {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(OBSIMAN_MAIN_VIEW_TYPE);
		if (leaves.length > 0) {
			await workspace.revealLeaf(leaves[0]);
			return;
		}
		const leaf = workspace.getLeaf('tab');
		await leaf.setViewState({ type: OBSIMAN_MAIN_VIEW_TYPE, active: true });
		await workspace.revealLeaf(leaf);
	}

	private async openSidebarLeaf(): Promise<void> {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(OBSIMAN_VIEW_TYPE);

		let leaf: WorkspaceLeaf;

		if (leaves.length > 0) {
			leaf = leaves[0];
			// Always rebuild so page order syncs with current settings
			await leaf.setViewState({ type: OBSIMAN_VIEW_TYPE, active: true });
		} else {
			// getRightLeaf(false) may return null if no right panel; fall back to creating one
			const leftLeaf = workspace.getLeftLeaf(false) ?? workspace.getLeftLeaf(true);
			if (!leftLeaf) return;
			leaf = leftLeaf;
			await leaf.setViewState({ type: OBSIMAN_VIEW_TYPE, active: true });
		}

		await workspace.revealLeaf(leaf);
	}

}

class BasesFilePicker extends SuggestModal<TFile> {
	private onChoose: (file: TFile) => void;

	constructor(app: BasesFilePicker['app'], onChoose: (file: TFile) => void) {
		super(app);
		this.onChoose = onChoose;
		this.setPlaceholder('Select a .base file…');
	}

	getSuggestions(query: string): TFile[] {
		const q = query.toLowerCase();
		return this.app.vault.getAllLoadedFiles().filter(
			(f): f is TFile => f instanceof TFile && f.extension === 'base' && f.path.toLowerCase().includes(q)
		);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.createDiv({ text: file.basename, cls: 'suggestion-title' });
		el.createDiv({ text: file.path, cls: 'suggestion-note' });
	}

	onChooseSuggestion(file: TFile): void {
		this.onChoose(file);
	}
}

export default ObsiManPlugin;
