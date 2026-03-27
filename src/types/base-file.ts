import type { FilterGroup, FilterRule } from './filter';

/** Raw expression from .base files that can't be mapped to a FilterRule */
export interface BaseRawExpression {
	type: 'raw';
	expression: string;
}

/** Extended filter node for .base files — includes raw expressions for round-trip */
export type BaseFilterNode = FilterGroup | FilterRule | BaseRawExpression;

/** Parsed representation of a .base YAML file */
export interface BaseFileConfig {
	globalFilters: BaseFilterNode[] | null;
	views: BaseFileView[];
}

/** A single view inside a .base file */
export interface BaseFileView {
	name: string;
	type: string;
	filters: BaseFilterNode[] | null;
	columns: string[];
	sort: BaseFileSort[];
	columnWidths: Record<string, number>;
}

export interface BaseFileSort {
	property: string;
	direction: 'asc' | 'desc';
}

/** Raw parsed YAML structure of a .base file (before conversion) */
export interface RawBaseFile {
	filters?: RawFilterBlock;
	formulas?: Record<string, string>;
	views?: RawBaseView[];
}

export interface RawBaseView {
	type: string;
	name: string;
	filters?: RawFilterBlock;
	order?: string[];
	sort?: { property: string; direction: string }[];
	columnSize?: Record<string, number>;
	[key: string]: unknown;
}

export interface RawFilterBlock {
	and?: (string | RawFilterBlock)[];
	or?: (string | RawFilterBlock)[];
}
