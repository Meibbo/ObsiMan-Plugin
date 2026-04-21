<script lang="ts">
  import { onMount } from "svelte";
  import { explorerTags } from "../containers/explorerTags";
  import PanelExplorer from "../containers/panelLists.svelte";
  import type { VaultmanPlugin } from "../../main";
  import { setIcon } from "obsidian";

  let {
    plugin,
    searchTerm = $bindable(""),
    searchMode = 0,
    sortBy = $bindable("name"),
    sortDirection = $bindable("asc"),
    viewMode = $bindable("tree"),
    explorer = $bindable(),
  }: {
    plugin: VaultmanPlugin;
    searchTerm?: string;
    searchMode?: number;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    viewMode?: any;
    explorer: explorerTags | undefined;
  } = $props();

  onMount(() => {
    explorer = new explorerTags(plugin);
  });

  function icon(el: HTMLElement, name: string) {
    setIcon(el, name);
    return {
      update(n: string) {
        setIcon(el, n);
      },
    };
  }
</script>

<div class="vaultman-tags-tab-content">
  {#if explorer}
    <PanelExplorer
      {plugin}
      provider={explorer}
      bind:viewMode
      bind:searchTerm
      {searchMode}
      bind:sortBy
      bind:sortDirection
      {icon}
    />
  {/if}
</div>

<style>
  .vaultman-tags-tab-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
</style>
