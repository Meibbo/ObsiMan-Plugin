import type { FilterTemplate } from './filter';

export type Language = 'auto' | 'en' | 'es';

export interface ObsiManSettings {
	language: Language;
	defaultPropertyType: string;
	filterTemplates: FilterTemplate[];
	/** Path to the active session .md file (empty = no session) */
	sessionFilePath: string;
	/** Default property columns for the grid view */
	gridColumns: string[];
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
}

export const DEFAULT_SETTINGS: ObsiManSettings = {
	language: 'auto',
	defaultPropertyType: 'text',
	filterTemplates: [],
	sessionFilePath: '',
	gridColumns: ['type', 'tags', 'in', 'up'],
	explorerCtrlClickSearch: true,
	explorerShowQueuePreview: true,
	explorerContentSearch: true,
	explorerOperationScope: 'auto',
	operationsPanelPosition: 'right',
};
