import type { Plugin } from 'obsidian';
import type { FilterTemplate } from './typeFilter';
import type { MenuHideRule } from './typeCtxMenu';

export type Language = 'auto' | 'en' | 'es';
export type LayoutTheme = 'native' | 'polish' | 'glass';

export interface VaultmanSettings {
	/** Visual treatment for Vaultman chrome. Native follows Obsidian core classes/tokens. */
	layoutTheme: LayoutTheme;
	/** Whether popup islands close when clicking the transparent outside area/backdrop. */
	islandDismissOnOutsideClick: boolean;
	/** Whether opening popup islands blurs/dims the content behind them. */
	islandBackdropBlur: boolean;
	/** Glassmorphism blur intensity for bottom bar and popups (0–100, maps to 0–20px) */
	glassBlurIntensity: number;
	// after this line these settings are not used
	//
	// -----------------------------------------------------------------
	defaultPropertyType: string;
	filterTemplates: FilterTemplate[];
	/** Path to the active session .md file (empty = no session) */
	sessionFilePath: string;
	/** Ctrl+click on property/value opens Obsidian core search */
	explorerCtrlClickSearch: boolean;
	/** Show pending queue changes in the explorer tree */
	explorerShowQueuePreview: boolean;
	/** Enable content search in file tree */
	explorerContentSearch: boolean;
	/** Default scope for explorer operations: auto = selected > filtered > all */
	explorerOperationScope: 'auto' | 'selected' | 'filtered' | 'all';
	/** Position of the operations panel */
	operationsPanelPosition: 'right' | 'bottom' | 'replace';
	/** Path to last .base file used with Vaultman */
	basesLastUsedPath: string;
	/** Fallback when no .base file is open */
	basesOpenMode: 'last-used' | 'picker';
	/** Side for operations panel */
	basesOpsPanelSide: 'left' | 'right';
	/** Side for explorer panel */
	basesExplorerSide: 'left' | 'right';
	/** Auto-open panels when active leaf becomes .base */
	basesAutoAttach: boolean;
	/** Inject checkbox column into .base table */
	basesInjectCheckboxes: boolean;
	/** Show column separators in .base table */
	basesShowColumnSeparators: boolean;
	/** What to open when the ribbon icon is clicked: sidebar only, main view only, or both */
	openMode: 'sidebar' | 'main' | 'both';
	/** Order of pages in the sidebar bottom nav (page IDs: 'ops', 'statistics', 'filters') */
	pageOrder: string[];
	/** When true, each page opens as its own Obsidian sidebar pane */
	separatePanes: boolean;
	/** File list view mode in the sidebar Files page */
	viewMode: 'list' | 'selected';
	/** Show labels on the tab bar in the Filters page */
	filtersShowTabLabels: boolean;
	/** Internal one-shot migration marker for the Iter.12 tab label default */
	filtersTabLabelsMigrated?: boolean;
	/** Property grid render mode */
	gridRenderMode?: 'plain' | 'chunk' | 'all';
	/** Columns that allow inline editing in the grid */
	gridEditableColumns?: string[];
	/** Columns that use live preview in the grid */
	gridLivePreviewColumns?: string[];
	/** Chunk size for live-preview rendering */
	gridRenderChunkSize?: number;
	/** Columns shown in the property grid */
	gridColumns?: string[];
	/** Show Vaultman items in Obsidian's file-menu (right-click in explorer) */
	contextMenuShowInFileMenu: boolean;
	/** Show Vaultman items in Obsidian's editor-menu (right-click in editor) */
	contextMenuShowInEditorMenu: boolean;
	/** Show Vaultman items in Obsidian's more-options menu (··· button) */
	contextMenuShowInMoreOptions: boolean;
	/** Rules for hiding native/third-party items from workspace context menus */
	contextMenuHideRules: MenuHideRule[];
}

/** Minimal interface used by VaultmanSettingsTab — breaks the main.ts circular import. */
export interface iVaultmanPlugin extends Plugin {
	settings: VaultmanSettings;
	saveSettings(): Promise<void>;
	updateGlassBlur(): void;
}

export const DEFAULT_SETTINGS: VaultmanSettings = {
	layoutTheme: 'native',
	islandDismissOnOutsideClick: false,
	islandBackdropBlur: false,
	glassBlurIntensity: 15,
	// after this line these settings are not used
	//
	// -----------------------------------------------------------------
	defaultPropertyType: 'text',
	filterTemplates: [],
	sessionFilePath: '',
	explorerCtrlClickSearch: true,
	explorerShowQueuePreview: true,
	explorerContentSearch: true,
	explorerOperationScope: 'auto',
	operationsPanelPosition: 'right',
	basesLastUsedPath: '',
	basesOpenMode: 'last-used',
	basesOpsPanelSide: 'left',
	basesExplorerSide: 'right',
	basesAutoAttach: false,
	basesInjectCheckboxes: true,
	basesShowColumnSeparators: false,
	openMode: 'sidebar',
	pageOrder: ['ops', 'statistics', 'filters'],
	separatePanes: false,
	viewMode: 'list',
	filtersShowTabLabels: true,
	filtersTabLabelsMigrated: true,
	contextMenuShowInFileMenu: true,
	contextMenuShowInEditorMenu: true,
	contextMenuShowInMoreOptions: true,
	contextMenuHideRules: [],
};
