<script lang="ts">
  import type { VaultmanPlugin } from "../../main";
  import { Virtualizer } from "../../services/serviceVirtualizer.svelte";
  import TextInput from "../primitives/TextInput.svelte";
  import HighlightText from "../primitives/HighlightText.svelte";
  import type { ContentMatch } from "../../types/typeContracts";
  import { translate } from "../../index/i18n/lang";

  let { plugin }: { plugin: VaultmanPlugin } = $props();

  let query = $state("");
  let outerEl: HTMLDivElement | undefined = $state();
  const v = new Virtualizer<ContentMatch>();

  const totalH = $derived(v.items.length * v.rowHeight);

  $effect(() => { plugin.contentIndex.setQuery(query); });

  $effect(() => {
    syncItems();
    return plugin.contentIndex.subscribe(syncItems);
  });

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

  function syncItems() {
    v.items = [...plugin.contentIndex.nodes];
  }
</script>

<div class="vm-tab-content">
  <TextInput bind:value={query} placeholder={translate("content.search.placeholder")} />

  {#if query.length > 0}
    <div bind:this={outerEl} class="vm-content-list" onscroll={onScroll}>
      <div class="vm-content-list-inner" style="height: {totalH}px">
        {#each v.visible as match, i (match.id)}
          {@const absIdx = v.window.startIndex + i}
          <div
            class="vm-content-row"
            style="transform: translateY({absIdx * v.rowHeight}px)"
          >
            <span class="vm-content-path">{match.filePath}:{match.line}</span>
            <span class="vm-content-preview">
              {match.before}<HighlightText
                text={match.match}
                ranges={[{ start: 0, end: match.match.length }]}
              />{match.after}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="vm-content-empty">{translate("content.search.hint")}</div>
  {/if}
</div>

<style>
  .vm-tab-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    gap: 8px;
  }

  .vm-content-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    position: relative;
  }

  .vm-content-list-inner {
    position: relative;
    width: 100%;
  }

  .vm-content-row {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 32px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 4px;
    font-size: 0.75em;
    will-change: transform;
    box-sizing: border-box;
  }

  .vm-content-path {
    color: var(--text-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.85em;
  }

  .vm-content-preview {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .vm-content-empty {
    color: var(--text-muted);
    font-size: 0.8em;
    padding: 8px 4px;
  }
</style>
