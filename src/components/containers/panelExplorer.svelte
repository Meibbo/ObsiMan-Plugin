<script lang="ts" generics="TMeta = unknown">
  import type { TFile } from "obsidian";
  import type { VaultmanPlugin } from "../../main";
  import type {
    ExplorerProvider,
    ExplorerViewMode,
  } from "../../types/typeExplorer";
  import ViewTree from "../views/viewTree.svelte";
  import ViewGrid from "../views/viewGrid.svelte";
  import { applyKeyboardMove, applyPointerSelection } from "../../logic/logicKeyboard";
  import type { TreeNode } from "../../types/typeNode";

  let {
    plugin,
    provider,
    viewMode = $bindable("tree"),
    searchTerm = $bindable(""),
    searchMode = 0,
    sortBy = $bindable("name"),
    sortDirection = $bindable("asc"),
    addMode = false,
    selectedFiles = $bindable(new Set<string>()),
    icon,
  }: {
    plugin: VaultmanPlugin;
    provider: ExplorerProvider<TMeta>;
    viewMode?: ExplorerViewMode;
    searchTerm?: string;
    searchMode?: number;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    addMode?: boolean;
    selectedFiles?: Set<string>;
    icon: (node: HTMLElement, name: string) => { update(n: string): void };
  } = $props();

  let nodes = $state<TreeNode<TMeta>[]>([]);
  let flatFiles = $state<TFile[]>([]);
  let expandedIds = $state(new Set<string>());
  let selectedNodeIds = $state(new Set<string>());
  let selectionAnchorId = $state<string | null>(null);
  let focusedNodeId = $state<string | null>(null);

  $effect(() => {
    // React directly to prop changes
    const mode: "leaf" | "all" = searchMode === 1 ? "leaf" : "all";
    provider.setSearchTerm?.(searchTerm, mode);
    provider.setSortBy?.(sortBy, sortDirection);
    provider.setViewMode?.(viewMode);
    provider.setAddMode?.(addMode);
    refreshData();
  });

  $effect(() => {
    const refresh = () => refreshData();
    const unsubscribeOperations = plugin.operationsIndex.subscribe(refresh);
    const unsubscribeActiveFilters = plugin.activeFiltersIndex.subscribe(refresh);
    return () => {
      unsubscribeOperations();
      unsubscribeActiveFilters();
    };
  });

  function refreshData() {
    if (viewMode === "tree") {
      nodes = provider.getTree();
    } else {
      flatFiles = provider.getFiles?.() || [];
    }
  }

  function handleNodeClick(id: string, e: MouseEvent) {
    const node = findNodeById(nodes, id);
    if (!node) return;

    const additive = e.ctrlKey || e.metaKey;
    const range = e.shiftKey;
    applySelection(id, { additive, range });
    if (!additive && !range) provider.handleNodeClick(node);
  }

  function handleContextMenu(id: string, e: MouseEvent) {
    e.preventDefault();
    const node = findNodeById(nodes, id);
    if (!node) return;
    if (!selectedNodeIds.has(id)) applySelection(id, {});
    provider.handleContextMenu(node, e, selectedNodesForContext(node));
  }

  function handleRowKeydown(id: string, e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = applyKeyboardMove({
        orderedIds: visibleNodeIds(),
        selectedIds: selectedNodeIds,
        anchorId: selectionAnchorId,
        focusedId: focusedNodeId ?? id,
        direction: e.key === "ArrowDown" ? 1 : -1,
        range: e.shiftKey,
      });
      commitSelection(next.ids, next.anchorId, next.focusedId);
    } else if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      applySelection(id, { additive: true });
    } else if (e.key === "Enter") {
      const node = findNodeById(nodes, id);
      if (node) provider.handleNodeClick(node);
    }
  }

  function findNodeById(
    nodes: TreeNode<TMeta>[],
    id: string,
  ): TreeNode<TMeta> | undefined {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) {
        const found = findNodeById(n.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  function toggleExpand(id: string) {
    if (expandedIds.has(id)) {
      expandedIds.delete(id);
    } else {
      expandedIds.add(id);
    }
    expandedIds = new Set(expandedIds);
  }

  function applySelection(id: string, opts: { additive?: boolean; range?: boolean }) {
    const next = applyPointerSelection({
      orderedIds: visibleNodeIds(),
      selectedIds: selectedNodeIds,
      anchorId: selectionAnchorId,
      targetId: id,
      additive: opts.additive,
      range: opts.range,
    });
    commitSelection(next.ids, next.anchorId, next.focusedId);
  }

  function commitSelection(ids: Set<string>, anchorId: string | null, focusedId: string | null) {
    selectedNodeIds = new Set(ids);
    selectionAnchorId = anchorId;
    focusedNodeId = focusedId;
    plugin.viewService.clearSelection(provider.id);
    for (const id of selectedNodeIds) plugin.viewService.select(provider.id, id, "add");
    plugin.viewService.setFocused(provider.id, focusedId);
  }

  function visibleNodeIds(): string[] {
    const ids: string[] = [];
    const walk = (items: TreeNode<TMeta>[]) => {
      for (const node of items) {
        ids.push(node.id);
        if (node.children && expandedIds.has(node.id)) walk(node.children);
      }
    };
    walk(nodes);
    return ids;
  }

  function selectedNodesForContext(node: TreeNode<TMeta>): TreeNode<TMeta>[] {
    const clickedType = provider.getNodeType?.(node);
    const selected = [...selectedNodeIds]
      .map((id) => findNodeById(nodes, id))
      .filter((candidate): candidate is TreeNode<TMeta> => Boolean(candidate));
    if (!clickedType) return selected.length > 0 ? selected : [node];
    const sameType = selected.filter((candidate) => provider.getNodeType?.(candidate) === clickedType);
    return sameType.length > 0 ? sameType : [node];
  }
</script>

<div class="vm-panel-explorer">
  {#if viewMode === "tree"}
    <div class="vm-tree-container">
      <ViewTree
        {nodes}
        {expandedIds}
        selectedIds={selectedNodeIds}
        focusedId={focusedNodeId}
        onToggle={toggleExpand}
        onRowClick={handleNodeClick}
        onContextMenu={handleContextMenu}
        onRowKeydown={handleRowKeydown}
        {icon}
      />
    </div>
  {:else if viewMode === "grid"}
    <div class="vm-grid-container">
      <ViewGrid
        files={flatFiles}
        totalCount={plugin.propertyIndex.fileCount}
        bind:selectedFiles
        onSelectionChange={() => {}}
        onFileClick={(file: TFile) => {
          const node = {
            id: file.path,
            label: file.basename,
            meta: { file } as TMeta,
            icon: "",
            depth: 0,
          } as TreeNode<TMeta>;
          provider.handleNodeClick(node);
        }}
        onContextMenu={(file: TFile, e: MouseEvent) => {
          const node = {
            id: file.path,
            label: file.basename,
            meta: { file } as TMeta,
            icon: "",
            depth: 0,
          } as TreeNode<TMeta>;
          provider.handleContextMenu(node, e);
        }}
        sortColumn={sortBy as "name" | "props" | "path" | "date"}
        {sortDirection}
        onSortChange={(col: "name" | "props" | "path" | "date", dir: "asc" | "desc") => {
          sortBy = col;
          sortDirection = dir;
        }}
        app={plugin.app}
      />
    </div>
  {/if}
</div>

<style>
  .vm-panel-explorer {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
    flex: 1;
    min-height: 0;
  }
  .vm-tree-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    overflow: hidden;
  }
  .vm-grid-container {
    flex: 1;
    overflow: hidden;
    min-height: 0;
    height: 100%;
  }
</style>
