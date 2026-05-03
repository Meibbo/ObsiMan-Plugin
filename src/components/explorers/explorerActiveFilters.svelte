<script lang="ts">
  import type { VaultmanPlugin } from "../../main";
  import { Virtualizer } from "../../services/serviceVirtualizer.svelte";
  import type { ActiveFilterEntry } from "../../types/contracts";
  import { translate } from "../../i18n/index";

  let {
    plugin,
    onClose,
  }: {
    plugin: VaultmanPlugin;
    onClose?: () => void;
  } = $props();

  let outerEl: HTMLDivElement | undefined = $state();
  const v = new Virtualizer<ActiveFilterEntry>();

  const totalH = $derived(v.items.length * v.rowHeight);

  const fileCount = $derived(plugin.filterService.filteredFiles.length);

  $effect(() => { v.items = [...plugin.activeFiltersIndex.nodes]; });

  $effect(() => {
    if (!outerEl) return;
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

  function describeRule(entry: ActiveFilterEntry): string {
    const rule = entry.rule;
    const prop = rule.property ?? "";
    const vals = rule.values ?? [];
    switch (rule.filterType) {
      case "has_property": return `has: ${prop}`;
      case "missing_property": return `missing: ${prop}`;
      case "specific_value": return `${prop}: ${vals[0] ?? ""}`;
      case "multiple_values": return `${prop}: ${vals.join(", ")}`;
      case "has_tag": return `tag: ${vals[0] ?? ""}`;
      case "folder": return `folder: ${vals[0] ?? ""}`;
      case "folder_exclude": return `excl. folder: ${vals[0] ?? ""}`;
      case "file_name": return `name: ${vals[0] ?? ""}`;
      case "file_name_exclude": return `excl. name: ${vals[0] ?? ""}`;
      default: return prop || "filter";
    }
  }

  function removeFilter(entry: ActiveFilterEntry) {
    plugin.filterService.removeNode(entry.rule);
  }
</script>

<div class="vm-explorer-popup">
  <header class="vm-explorer-popup-header">
    <span class="vm-subtitle">
      {v.items.length} {translate("filters.active")} · {fileCount} {translate("files.count.short")}
    </span>
    <button class="vm-btn-icon" onclick={onClose} aria-label={translate("common.close")}>×</button>
  </header>

  {#if v.items.length === 0}
    <div class="vm-explorer-popup-empty">{translate("filters.active.empty")}</div>
  {:else}
    <div bind:this={outerEl} class="vm-explorer-popup-list" onscroll={onScroll}>
      <div class="vm-explorer-popup-inner" style="height: {totalH}px">
        {#each v.visible as entry, i (entry.id)}
          {@const absIdx = v.window.startIndex + i}
          <div
            class="vm-explorer-popup-row"
            style="transform: translateY({absIdx * v.rowHeight}px)"
          >
            <span class="vm-filter-entry-desc">{describeRule(entry)}</span>
            <button
              class="vm-btn-icon vm-btn-danger"
              onclick={() => removeFilter(entry)}
              aria-label={translate("filters.remove")}
            >×</button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .vm-explorer-popup {
    display: flex;
    flex-direction: column;
    min-width: 260px;
    max-width: 380px;
    max-height: 50vh;
    background: var(--background-primary);
    border-radius: var(--radius-m);
    border: 1px solid var(--background-modifier-border);
    overflow: hidden;
  }

  .vm-explorer-popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--background-modifier-border);
    flex-shrink: 0;
  }

  .vm-explorer-popup-list {
    flex: 1;
    overflow-y: auto;
    position: relative;
    min-height: 50px;
  }

  .vm-explorer-popup-inner {
    position: relative;
    width: 100%;
  }

  .vm-explorer-popup-row {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 32px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 8px;
    font-size: 0.8em;
    box-sizing: border-box;
    will-change: transform;
  }

  .vm-filter-entry-desc {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-normal);
  }

  .vm-explorer-popup-empty {
    padding: 16px 12px;
    color: var(--text-muted);
    font-size: 0.85em;
    text-align: center;
  }
</style>
