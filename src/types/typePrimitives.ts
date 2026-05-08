import type { TFile } from 'obsidian';
import type { FabBadgeKind } from '../badges/serviceBadge';

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
	 * Optional secondary mouse gesture handler. The FAB routes mouse
	 * gestures through serviceMouse so single, double, and tertiary
	 * bindings can be remapped from settings.
	 */
	onDoubleClick?: () => void;
	onTertiaryClick?: () => void;
	isPlaceholder?: boolean;
	badgeKind?: FabBadgeKind;
}

export interface BtnSelectionItem {
	icon: string; // Lucide icon name (e.g. "lucide-trash")
	label: string; // i18n-resolved aria-label + tooltip
	onClick: () => void; // fire-and-forget; async callers wrap with `void`
	isActive?: boolean; // visual active state
	isToggle?: boolean; // toggleable button
	disabled?: boolean; // grayed out, non-clickable
}
