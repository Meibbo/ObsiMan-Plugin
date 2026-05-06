import { TFile } from 'obsidian';

/** Special return keys for logicFunc — signal non-standard operations */
export const DELETE_PROP = '_DELETE_PROP';
export const NATIVE_RENAME_PROP = '_NATIVE_RENAME_PROP';
export const RENAME_FILE = '_RENAME_FILE';
export const MOVE_FILE = '_MOVE_FILE';
export const DELETE_FILE = '_DELETE_FILE';
export const FIND_REPLACE_CONTENT = '_FIND_REPLACE_CONTENT';
export const REORDER_ALL = '_REORDER_ALL';
export const APPLY_TEMPLATE = '_APPLY_TEMPLATE';

export type PropertyAction = 'set' | 'rename' | 'delete' | 'clean_empty' | 'change_type' | 'add';

export type PropertyType = 'text' | 'number' | 'checkbox' | 'list' | 'date' | 'wikilink';

export type OpKind =
	| 'set_prop'
	| 'delete_prop'
	| 'rename_prop'
	| 'reorder_props'
	| 'rename_file'
	| 'move_file'
	| 'delete_file'
	| 'find_replace_content'
	| 'apply_template'
	| 'set_tag'
	| 'delete_tag'
	| 'add_tag';

export interface VirtualFileState {
	file: TFile;
	originalPath: string;
	newPath?: string;
	deleted?: boolean;
	fm: Record<string, unknown>;
	body: string;
	ops: StagedOp[];
	readonly fmInitial: Record<string, unknown>;
	readonly bodyInitial: string;
	bodyLoaded: boolean;
}

export interface StagedOp {
	id: string;
	changeId?: string;
	property?: string;
	tag?: string;
	kind: OpKind;
	action: string;
	details: string;
	apply: (vfs: VirtualFileState) => void;
}

/** Common fields for all queued operations */
export interface BaseChange {
	/** Stable identifier for this change entry (used by IOperationsIndex). */
	id?: string;
	files: TFile[];
	action: string;
	details: string;
	logicFunc: (file: TFile, metadata: Record<string, unknown>) => Record<string, unknown> | null;
	customLogic?: boolean;
}

/** Operation on frontmatter properties */
export interface PropertyChange extends BaseChange {
	type: 'property';
	property: string;
	value?: string;
	oldValue?: string;
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
	type: 'file_rename' | 'file_move' | 'file_delete';
	newName?: string;
	targetFolder?: string;
}

/** Template application operation */
export interface TemplateChange extends BaseChange {
	type: 'template';
	templateFileStr: string;
	templateContent: string; // pre-resolved (variables expanded by caller)
}

/** Operation on tags (bulk rename/delete) */
export interface TagChange extends BaseChange {
	type: 'tag';
	tag: string;
	action: 'rename' | 'delete' | 'add';
}

export type PendingChange =
	| PropertyChange
	| ContentChange
	| FileChange
	| TemplateChange
	| TagChange;

export interface OperationResult {
	success: number;
	errors: number;
	messages: string[];
}
