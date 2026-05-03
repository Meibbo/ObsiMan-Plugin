import type { TFile } from 'obsidian';
import type { TreeNode } from './typeNode';

export type ExplorerViewMode = 'tree' | 'grid' | 'cards' | 'masonry';

export interface ExplorerProvider<TMeta = unknown> {
    id: string;
    getTree(): TreeNode<TMeta>[];
    getFiles?(): TFile[];
    handleNodeClick(node: TreeNode<TMeta>): void;
    handleContextMenu(node: TreeNode<TMeta>, e: MouseEvent): void;
    handleBadgeDoubleClick?(queueIndex: number): void;
    onRename?(id: string, newLabel: string): void;
    onCancelRename?(): void;
    
    // Sort and Search hooks
    setSearchTerm?(term: string, mode?: "all" | "leaf"): void;
    setViewMode?(mode: ExplorerViewMode): void;
    setSortBy?(sortBy: string, direction: 'asc' | "desc"): void;
    setAddMode?(active: boolean): void;
}
