import type { TFile } from 'obsidian';

export type PopupType = 'active-filters' | 'scope' | 'search' | 'move';

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
	/**
	 * Optional double-click handler. When defined the FAB uses the
	 * `useDoubleClick` helper to distinguish single from double clicks
	 * (250 ms debounce). Used by the navbar pill / queue badge double
	 * click clear gestures.
	 */
	onDoubleClick?: () => void;
	isPlaceholder?: boolean;
	badgeKind?: 'queue' | 'filters';
}

export interface BtnSelectionItem {
	icon: string; // Lucide icon name (e.g. "lucide-trash")
	label: string; // i18n-resolved aria-label + tooltip
	onClick: () => void; // fire-and-forget; async callers wrap with `void`
	isActive?: boolean; // visual active state
	isToggle?: boolean; // toggleable button
	disabled?: boolean; // grayed out, non-clickable
}
