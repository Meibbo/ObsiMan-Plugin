import type { TFile } from 'obsidian';

export type FnRSyntax =
	| 'plain'
	| 'regex'
	| 'obsidian-search'
	| 'obsidian-bases'
	| 'dataview-dql'
	| 'ant-renamer';

export type FnRScope = 'filtered' | 'selected' | 'all';

export interface FnRState {
	expanded: boolean;
	replace: string;
	syntax: FnRSyntax;
	caseSensitive: boolean;
	wholeWord: boolean;
	scope: FnRScope;
}

export interface FnRPattern {
	pattern: string;
	isRegex: boolean;
}

export interface FnRSyntaxOption {
	id: FnRSyntax;
	label: string;
	description: string;
	canReplaceContent: boolean;
}

export interface BuildContentReplaceChangeInput {
	find: string;
	files: readonly TFile[];
	state: FnRState;
}
