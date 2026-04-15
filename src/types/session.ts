import type { FilterGroup } from './filter';

/** Parsed state of a session .md file */
export interface VaultmanSession {
	/** Filter tree stored in frontmatter */
	filters: FilterGroup;
	/** Property columns to display in the grid */
	columns: string[];
	/** Paths of files marked [x] (selected) */
	selectedPaths: Set<string>;
	/** All file paths listed in the task body, in order */
	allPaths: string[];
}

/** Frontmatter keys used by session files */
export const SESSION_FM_KEY = 'vaultman-session';
export const SESSION_FILTERS_KEY = 'vaultman-filters';
export const SESSION_COLUMNS_KEY = 'vaultman-columns';
