import type { TreeNode } from "../types/typeTree";

export interface FlatNode<TMeta = unknown> {
  node: TreeNode<TMeta>;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
}

export interface VirtualWindow {
  startIndex: number;
  endIndex: number;
}

export abstract class Virtualizer<TMeta = unknown> {
  abstract flatten(
    nodes: readonly TreeNode<TMeta>[],
    expandedIds: ReadonlySet<string>,
  ): FlatNode<TMeta>[];

  computeWindow(
    scrollTop: number,
    viewportH: number,
    rowH: number,
    total: number,
    overscan = 5,
  ): VirtualWindow {
    if (rowH <= 0 || total === 0) return { startIndex: 0, endIndex: 0 };
    const rawStart = Math.floor(scrollTop / rowH);
    const visible = Math.ceil(viewportH / rowH);
    const startIndex = Math.max(0, rawStart - overscan);
    const endIndex = Math.min(total, rawStart + visible + overscan);
    return { startIndex, endIndex };
  }
}

export class TreeVirtualizer<TMeta = unknown> extends Virtualizer<TMeta> {
  flatten(
    nodes: readonly TreeNode<TMeta>[],
    expandedIds: ReadonlySet<string>,
  ): FlatNode<TMeta>[] {
    const out: FlatNode<TMeta>[] = [];
    const walk = (list: readonly TreeNode<TMeta>[], depth: number): void => {
      for (const n of list) {
        const hasChildren = !!n.children && n.children.length > 0;
        const isExpanded = hasChildren && expandedIds.has(n.id);
        out.push({ node: n, depth, isExpanded, hasChildren });
        if (isExpanded) walk(n.children!, depth + 1);
      }
    };
    walk(nodes, 0);
    return out;
  }
}
