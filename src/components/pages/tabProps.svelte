<script lang="ts">
  import { onMount } from "svelte";
  import { explorerProps } from "../containers/explorerProps";
  import PanelExplorer from "../containers/panelExplorer.svelte";
  import type { VaultmanPlugin } from "../../../main";
  import { setIcon } from "obsidian";

  let {
    plugin,
    searchTerm = $bindable(""),
    searchMode = 0,
    sortBy = $bindable("name"),
    sortDirection = $bindable("asc"),
    propExplorer = $bindable(),
  }: {
    plugin: VaultmanPlugin;
    searchTerm?: string;
    searchMode?: number;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    propExplorer: explorerProps | undefined;
  } = $props();

  onMount(() => {
    propExplorer = new explorerProps(plugin);
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

<div class="vaultman-props-tab-content">
  {#if propExplorer}
    <PanelExplorer
      {plugin}
      provider={propExplorer}
      viewMode="tree"
      bind:searchTerm
      {searchMode}
      bind:sortBy
      bind:sortDirection
      {icon}
    />
  {/if}
</div>

<style>
  .vaultman-props-tab-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
</style>
