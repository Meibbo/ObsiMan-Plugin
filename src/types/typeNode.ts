// src/types/tree.ts
import type { TFile } from 'obsidian';

export interface NodeBadge {
	text?: string;
	icon?: string;
	color?: 'accent' | 'warning' | 'error' | 'success' | 'info' | 'faint' | 'red' | 'blue' | 'purple' | 'orange' | 'green';
	solid?: boolean;
	isInherited?: boolean;
	/** Queue operation index for click-to-remove. Undefined = visual-only badge. */
	queueIndex?: number;
}

export interface TreeNode<TMeta = unknown> {
	id: string;
	label: string;
	icon?: string;
	count?: number;
	badges?: NodeBadge[];
	children?: TreeNode<TMeta>[];
	depth: number;
	meta: TMeta;
	cls?: string;
	highlights?: { start: number; end: number }[];
}

export interface TagMeta {
	tagPath: string;
}

export interface PropMeta {
	propName: string;
	propType: string;
	isValueNode: boolean;
	rawValue?: string;
	isTypeIncompatible?: boolean;
}

export interface FileMeta {
	file: TFile | null;  // null = folder node
	isFolder: boolean;
	folderPath: string;
}

export interface ContentMeta {
	kind: 'file' | 'match';
	filePath: string;
	file: TFile | null;
	line?: number;
	before?: string;
	match?: string;
	after?: string;
}
