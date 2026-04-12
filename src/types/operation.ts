import { TFile } from 'obsidian';

/** Special return keys for logicFunc — signal non-standard operations */
export const DELETE_PROP = '_DELETE_PROP';
export const RENAME_FILE = '_RENAME_FILE';
export const REORDER_ALL = '_REORDER_ALL';
export const MOVE_FILE = '_MOVE_FILE';
export const FIND_REPLACE_CONTENT = '_FIND_REPLACE_CONTENT';
export const NATIVE_RENAME_PROP = '_NATIVE_RENAME_PROP';

export type PropertyAction =
	| 'set'
	| 'rename'
	| 'delete'
	| 'clean_empty'
	| 'change_type';

export type PropertyType =
	| 'text'
	| 'number'
	| 'checkbox'
	| 'list'
	| 'date'
	| 'wikilink';

/** Common fields for all queued operations */
export interface BaseChange {
	files: TFile[];
	action: string;
	details: string;
	logicFunc: (
		file: TFile,
		metadata: Record<string, unknown>
	) => Record<string, unknown> | null;
	customLogic?: boolean;
}

/** Operation on frontmatter properties */
export interface PropertyChange extends BaseChange {
	type: 'property';
	property: string;
	customLogic: boolean;
}

/** Operation on file content (find & replace) */
export interface ContentChange extends BaseChange {
	type: 'content_replace';
	find: string;
	replace: string;
	isRegex: boolean;
	caseSensitive: boolean;
}

/** File system operation (rename/move) */
export interface FileChange extends BaseChange {
	type: 'file_rename' | 'file_move';
	newName?: string;
	targetFolder?: string;
}

export type PendingChange = PropertyChange | ContentChange | FileChange;

export interface OperationResult {
	success: number;
	errors: number;
	messages: string[];
}
