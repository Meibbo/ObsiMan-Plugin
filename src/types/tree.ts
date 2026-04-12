// src/types/tree.ts
import type { TFile } from 'obsidian';

export interface TreeNode<TMeta = unknown> {
	id: string;
	label: string;
	icon?: string;
	count?: number;
	children?: TreeNode<TMeta>[];
	depth: number;
	meta: TMeta;
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
