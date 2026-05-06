<script lang="ts">
  import { onMount } from "svelte";
  import { explorerProps } from "../containers/explorerProps";
  import PanelExplorer from "../containers/panelExplorer.svelte";
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
    explorer: explorerProps | undefined;
  } = $props();

  onMount(() => {
    explorer = new explorerProps(plugin);
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

<div class="vm-props-tab-content">
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
