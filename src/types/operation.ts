import { TFile } from 'obsidian';

/** Special return keys for logicFunc — signal non-standard operations */
export const DELETE_PROP = '_DELETE_PROP';
export const RENAME_FILE = '_RENAME_FILE';
export const REORDER_ALL = '_REORDER_ALL';

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

/**
 * A queued operation. logicFunc is called per-file at execution time
 * with the latest metadata (re-read from disk) to compute the update.
 */
export interface PendingChange {
	property: string;
	action: string;
	details: string;
	files: TFile[];
	logicFunc: (
		file: TFile,
		metadata: Record<string, unknown>
	) => Record<string, unknown> | null;
	customLogic: boolean;
}

export interface OperationResult {
	success: number;
	errors: number;
	messages: string[];
}
