<script lang="ts">
  import type { VaultmanPlugin } from "../../main";
  import { Virtualizer } from "../../services/serviceVirtualizer.svelte";
  import type { QueueChange } from "../../types/contracts";
  import { translate } from "../../i18n/index";

  let {
    plugin,
    onClose,
  }: {
    plugin: VaultmanPlugin;
    onClose?: () => void;
  } = $props();

  let outerEl: HTMLDivElement | undefined = $state();
  const v = new Virtualizer<QueueChange>();

  const totalH = $derived(v.items.length * v.rowHeight);

  $effect(() => { v.items = [...plugin.operationsIndex.nodes]; });

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

  function removeItem(id: string) {
    plugin.queueService.remove(id);
  }

  function executeAll() {
    void plugin.queueService.execute();
    onClose?.();
  }
</script>

<div class="vm-explorer-popup">
  <header class="vm-explorer-popup-header">
    <span class="vm-subtitle">{v.items.length} {translate("ops.queue")}</span>
    <button class="vm-btn-icon" onclick={onClose} aria-label={translate("common.close")}>×</button>
  </header>

  {#if v.items.length === 0}
    <div class="vm-explorer-popup-empty">{translate("queue.empty")}</div>
  {:else}
    <div bind:this={outerEl} class="vm-explorer-popup-list" onscroll={onScroll}>
      <div class="vm-explorer-popup-inner" style="height: {totalH}px">
        {#each v.visible as item, i (item.id)}
          {@const absIdx = v.window.startIndex + i}
          <div
            class="vm-explorer-popup-row"
            style="transform: translateY({absIdx * v.rowHeight}px)"
          >
            <span class="vm-queue-item-type">{item.change.type}</span>
            <span class="vm-queue-item-detail">{item.change.details ?? ""}</span>
            <button
              class="vm-btn-icon vm-btn-danger"
              onclick={() => removeItem(item.id)}
              aria-label={translate("queue.remove")}
            >×</button>
          </div>
        {/each}
      </div>
    </div>
    <footer class="vm-explorer-popup-footer">
      <button class="vm-btn-primary" onclick={executeAll}>
        {translate("ops.execute")}
      </button>
    </footer>
  {/if}
</div>

<style>
  .vm-explorer-popup {
    display: flex;
    flex-direction: column;
    min-width: 280px;
    max-width: 420px;
    max-height: 60vh;
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
    min-height: 60px;
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

  .vm-queue-item-type {
    flex-shrink: 0;
    font-weight: 600;
    font-size: 0.85em;
    color: var(--text-accent);
    min-width: 60px;
  }

  .vm-queue-item-detail {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-muted);
    font-size: 0.9em;
  }

  .vm-explorer-popup-footer {
    padding: 8px 12px;
    border-top: 1px solid var(--background-modifier-border);
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .vm-explorer-popup-empty {
    padding: 16px 12px;
    color: var(--text-muted);
    font-size: 0.85em;
    text-align: center;
  }
</style>
