<script lang="ts">
  import type { TFile } from "obsidian";
  import { translate } from "../../i18n/index";
  import { Virtualizer } from "../../services/serviceVirtualizer.svelte";

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

  const v = new Virtualizer<TFile>();
  let outerEl: HTMLDivElement | undefined = $state();

  const totalH = $derived(files.length * v.rowHeight);

  $effect(() => { v.items = files; });

  $effect(() => {
    if (!outerEl) return;
    const cs = getComputedStyle(outerEl);
    const rh = parseFloat(cs.getPropertyValue("--vm-file-row-h"));
    if (rh > 0) v.rowHeight = rh;
    v.viewportHeight = outerEl.clientHeight;
    const ro = new ResizeObserver(() => {
      if (outerEl) v.viewportHeight = outerEl.clientHeight;
    });
    ro.observe(outerEl);
    return () => ro.disconnect();
  });

  function onScroll(e: Event) {
    v.scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
  }

  let allSelected = $derived(files.length > 0 && files.every(f => selectedFiles.has(f.path)));
  let someSelected = $derived(files.some(f => selectedFiles.has(f.path)) && !allSelected);

  function toggleAll() {
    const next = new Set(selectedFiles);
    if (allSelected) {
      files.forEach(f => next.delete(f.path));
    } else {
      files.forEach(f => next.add(f.path));
    }
    selectedFiles = next;
    onSelectionChange(selectedFiles);
  }

  function toggleFile(path: string) {
    const next = new Set(selectedFiles);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    selectedFiles = next;
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
    return { update(v: boolean) { el.indeterminate = v; } };
  }
</script>

<div class="vm-files-container">
  <div class="vm-files-header">
    <span class="vm-files-count">
      {translate('files.count', { filtered: files.length, total: totalCount })}
    </span>
  </div>

  <div class="vm-files-col-header">
    <input
      type="checkbox"
      class="vm-file-checkbox"
      checked={allSelected}
      indeterminate={someSelected}
      onchange={toggleAll}
      use:indeterminate={someSelected}
    />

    <button
      class="vm-col-header"
      class:active={sortColumn === "name"}
      onclick={() => handleSort("name")}
    >
      {translate('files.col.name')}
      {sortColumn === "name" ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
    </button>

    <button
      class="vm-col-header"
      class:active={sortColumn === "props"}
      onclick={() => handleSort("props")}
    >
      {translate('files.col.props')}
      {sortColumn === "props" ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
    </button>

    <button
      class="vm-col-header"
      class:active={sortColumn === "path"}
      onclick={() => handleSort("path")}
    >
      {translate('files.col.path')}
      {sortColumn === "path" ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
    </button>
  </div>

  <div bind:this={outerEl} class="vm-files-virtual-outer" onscroll={onScroll}>
    <div class="vm-files-virtual-inner" style="height: {totalH}px">
      {#each v.visible as file, i (file.path)}
        {@const absIdx = v.window.startIndex + i}
        <div
          class="vm-file-row"
          style="--vm-file-y: {absIdx * v.rowHeight}px"
          onclick={() => onFileClick(file)}
          oncontextmenu={(e) => onContextMenu(file, e)}
          onkeydown={() => {}}
          role="row"
          tabindex="0"
        >
          <input
            type="checkbox"
            class="vm-file-checkbox"
            checked={selectedFiles.has(file.path)}
            onclick={(e) => e.stopPropagation()}
            onchange={() => toggleFile(file.path)}
          />
          <span class="vm-file-name">{file.basename}</span>
          <span class="vm-file-props">{getPropCount(file)}</span>
          <span class="vm-file-path">{file.parent?.path ?? ''}</span>
        </div>
      {/each}
    </div>
  </div>
</div>
