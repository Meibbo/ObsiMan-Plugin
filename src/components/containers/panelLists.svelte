<script lang="ts">
  import type { TFile } from "obsidian";
  import type { VaultmanPlugin } from "../../main";
  import type {
    ExplorerProvider,
    ExplorerViewMode,
  } from "../../types/typeExplorer";
  import ViewTree from "../views/viewTree.svelte";
  import ViewGrid from "../views/viewGrid.svelte";
  import type { TreeNode } from "../../types/typeTree";

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
    provider: ExplorerProvider<any>;
    viewMode?: ExplorerViewMode;
    searchTerm?: string;
    searchMode?: number;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    addMode?: boolean;
    selectedFiles?: Set<string>;
    icon: (node: HTMLElement, name: string) => any;
  } = $props();

  let nodes = $state<TreeNode<any>[]>([]);
  let flatFiles = $state<any[]>([]);
  let expandedIds = $state(new Set<string>());

  $effect(() => {
    // React directly to prop changes
    const mode: "leaf" | "all" = searchMode === 1 ? "leaf" : "all";
    provider.setSearchTerm?.(searchTerm, mode);
    provider.setSortBy?.(sortBy, sortDirection);
    provider.setViewMode?.(viewMode);
    provider.setAddMode?.(addMode);
    refreshData();
  });

  function refreshData() {
    if (viewMode === "tree") {
      nodes = provider.getTree();
    } else {
      flatFiles = provider.getFiles?.() || [];
    }
  }

  function handleNodeClick(id: string) {
    const node = findNodeById(nodes, id);
    if (node) provider.handleNodeClick(node);
  }

  function handleContextMenu(id: string, e: MouseEvent) {
    const node = findNodeById(nodes, id);
    if (node) provider.handleContextMenu(node, e);
  }

  function findNodeById(
    nodes: TreeNode<any>[],
    id: string,
  ): TreeNode<any> | undefined {
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
</script>

<div class="vm-panel-explorer">
  {#if viewMode === "tree"}
    <div class="vm-tree-container">
      <ViewTree
        {nodes}
        {expandedIds}
        onToggle={toggleExpand}
        onRowClick={handleNodeClick}
        onContextMenu={handleContextMenu}
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
          const node: TreeNode<{ file: TFile }> = {
            id: file.path,
            label: file.basename,
            meta: { file },
            icon: "",
            depth: 0,
          };
          provider.handleNodeClick(node);
        }}
        onContextMenu={(file: TFile, e: MouseEvent) => {
          const node: TreeNode<{ file: TFile }> = {
            id: file.path,
            label: file.basename,
            meta: { file },
            icon: "",
            depth: 0,
          };
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
    overflow-y: auto;
    min-height: 0;
    height: 100%;
  }
</style>
