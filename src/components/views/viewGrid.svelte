<script lang="ts">
  import type { TFile } from "obsidian";
  import { translate } from "../../i18n/index";

  type SortColumn = "name" | "props" | "path" | "date";
  type SortDirection = "asc" | "desc";

  interface Props {
    files: TFile[];
    totalCount: number;
    selectedFiles: Set<string>;
    onSelectionChange: (selected: Set<string>) => void;
    onFileClick: (file: TFile) => void;
    onContextMenu: (file: TFile, e: MouseEvent) => void;
    sortColumn: SortColumn;
    sortDirection: SortDirection;
    onSortChange: (col: SortColumn, dir: SortDirection) => void;
    app: import("obsidian").App;
  }

  let {
    files,
    totalCount,
    selectedFiles = $bindable(new Set()),
    onSelectionChange,
    onFileClick,
    onContextMenu,
    sortColumn,
    sortDirection,
    onSortChange,
    app
  }: Props = $props();

  let renderLimit = $state(200);

  // Derived state for header checkbox
  let allSelected = $derived(files.length > 0 && files.every(f => selectedFiles.has(f.path)));
  let someSelected = $derived(files.some(f => selectedFiles.has(f.path)) && !allSelected);

  function toggleAll() {
    const newSelection = new Set(selectedFiles);
    if (allSelected) {
      files.forEach(f => newSelection.delete(f.path));
    } else {
      files.forEach(f => newSelection.add(f.path));
    }
    selectedFiles = newSelection;
    onSelectionChange(selectedFiles);
  }

  function toggleFile(path: string) {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(path)) {
      newSelection.delete(path);
    } else {
      newSelection.add(path);
    }
    selectedFiles = newSelection;
    onSelectionChange(selectedFiles);
  }

  function handleSort(col: SortColumn) {
    if (sortColumn === col) {
      onSortChange(col, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSortChange(col, "asc");
    }
  }

  function getPropCount(file: TFile) {
    const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    return Object.keys(fm).filter(k => k !== 'position').length;
  }
  function indeterminate(el: HTMLInputElement, value: boolean) {
    el.indeterminate = value;
    return {
      update(v: boolean) { el.indeterminate = v; }
    };
  }
</script>

<div class="vaultman-files-header">
  <span class="vaultman-files-count">
    {translate('files.count', { filtered: files.length, total: totalCount })}
  </span>
</div>

<div class="vaultman-files-col-header">
  <input
    type="checkbox"
    class="vaultman-file-checkbox"
    checked={allSelected}
    indeterminate={someSelected}
    onchange={toggleAll}
    use:indeterminate={someSelected}
  />
  
  <button 
    class="vaultman-col-header" 
    class:active={sortColumn === "name"} 
    onclick={() => handleSort("name")}
  >
    {translate('files.col.name')}
    {sortColumn === "name" ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
  </button>

  <button 
    class="vaultman-col-header" 
    class:active={sortColumn === "props"} 
    onclick={() => handleSort("props")}
  >
    {translate('files.col.props')}
    {sortColumn === "props" ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
  </button>

  <button 
    class="vaultman-col-header" 
    class:active={sortColumn === "path"} 
    onclick={() => handleSort("path")}
  >
    {translate('files.col.path')}
    {sortColumn === "path" ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
  </button>
</div>

<div class="vaultman-files-list">
  {#each files.slice(0, renderLimit) as file (file.path)}
    <div 
      class="vaultman-file-row" 
      onclick={() => onFileClick(file)}
      oncontextmenu={(e) => onContextMenu(file, e)}
      onkeydown={() => {}}
      role="row"
      tabindex="0"
    >
      <input
        type="checkbox"
        class="vaultman-file-checkbox"
        checked={selectedFiles.has(file.path)}
        onclick={(e) => e.stopPropagation()}
        onchange={() => toggleFile(file.path)}
      />
      
      <span class="vaultman-file-name">{file.basename}</span>
      <span class="vaultman-file-props">{getPropCount(file)}</span>
      <span class="vaultman-file-path">{file.parent?.path ?? ''}</span>
    </div>
  {/each}

  {#if files.length > renderLimit}
    <button 
      class="vaultman-btn-small vaultman-show-more" 
      onclick={() => renderLimit = Infinity}
    >
      {translate("common.showAllFiles", { count: files.length })}
    </button>
  {/if}
</div>
