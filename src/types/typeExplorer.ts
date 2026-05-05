import type { TFile } from 'obsidian';
import type { TreeNode } from './typeNode';
import type { MenuCtx } from './typeCtxMenu';
import type { ExplorerViewMode } from './typeViews';
export type { ExplorerViewMode } from './typeViews';

export interface ExplorerProvider<TMeta = unknown> {
    id: string;
    getTree(): TreeNode<TMeta>[];
    getFiles?(): TFile[];
    handleNodeClick(node: TreeNode<TMeta>): void;
    handleNodeSelection?(nodes: TreeNode<TMeta>[]): void;
    handleContextMenu(node: TreeNode<TMeta>, e: MouseEvent, selectedNodes?: TreeNode<TMeta>[]): void;
    getNodeType?(node: TreeNode<TMeta>): MenuCtx['nodeType'];
    handleBadgeDoubleClick?(queueIndex: number): void;
    onRename?(id: string, newLabel: string): void;
    onCancelRename?(): void;
    
    // Sort and Search hooks
    setSearchTerm?(term: string, mode?: "all" | "leaf"): void;
    setViewMode?(mode: ExplorerViewMode): void;
    setSortBy?(sortBy: string, direction: 'asc' | "desc"): void;
    setAddMode?(active: boolean): void;
}
