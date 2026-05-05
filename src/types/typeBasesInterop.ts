import type { FilterRule } from './typeFilter';

export type BasesImportSourceKind = 'base-file' | 'base-view' | 'markdown-fence';
export type BasesGroupLogic = 'and' | 'or' | 'not';

export interface BasesImportSource {
	sourcePath: string;
	kind: BasesImportSourceKind;
	blockIndex?: number;
	lineStart?: number;
	targetViewName?: string;
}

export interface BasesImportTarget extends BasesImportSource {
	label: string;
	compatible: boolean;
	reasons: string[];
}

export interface BasesUnsupportedExpression {
	expression: string;
	sourcePath: string;
	targetViewName?: string;
	blockIndex?: number;
	reason: string;
	preserved: boolean;
}

export interface BasesAppliedExpression {
	expression: string;
	sourcePath: string;
	targetViewName?: string;
	blockIndex?: number;
	filterType: FilterRule['filterType'];
	property: string;
	values: string[];
}

export interface BasesInteropReport {
	applied: BasesAppliedExpression[];
	unsupported: BasesUnsupportedExpression[];
	parseErrors: BasesParseError[];
}

export interface BasesParseError {
	sourcePath: string;
	targetViewName?: string;
	blockIndex?: number;
	lineStart?: number;
	reason: string;
	message: string;
}

export interface BasesImportedFilterGroup {
	type: 'group';
	logic: BasesGroupLogic;
	children: BasesImportedFilterNode[];
	id?: string;
	label?: string;
	kind?: string;
	enabled?: boolean;
}

export type BasesImportedFilterNode = BasesImportedFilterGroup | FilterRule;

export interface BasesImportPreview {
	source: BasesImportSource;
	rawConfig: Record<string, unknown>;
	filter?: BasesImportedFilterGroup;
	report: BasesInteropReport;
}

export interface PreviewBasesImportInput {
	sourcePath: string;
	content: string;
	targetViewName?: string;
	kind?: BasesImportSourceKind;
	blockIndex?: number;
	lineStart?: number;
}

export interface BasesFencedBlock {
	blockIndex: number;
	lineStart: number;
	rawContent: string;
}
