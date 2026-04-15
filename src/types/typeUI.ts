import type { TFile } from 'obsidian';

export type PopupType =
	| "active-filters"
	| "scope"
	| "search"
	| "move";

export type OpsTab = "linter" | "template" | "layout";

export interface defOpsTab {
	id: OpsTab;
	label: string;
	icon: string;
}

export interface ContentSnippet {
	before: string;
	match: string;
	after: string;
}

export interface ContentPreviewResult {
	totalMatches: number;
	files: Array<{
		file: TFile;
		matchCount: number;
		snippets: ContentSnippet[];
	}>;
	moreFiles: number;
}

export interface FabDef {
	icon: string;
	label: string;
	action: () => void;
	isPlaceholder?: boolean;
}
