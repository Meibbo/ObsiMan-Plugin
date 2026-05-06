<script lang="ts">
  import { onMount } from "svelte";
  import { explorerFiles } from "../containers/explorerFiles";
  import PanelExplorer from "../containers/panelExplorer.svelte";
  import type { VaultmanPlugin } from "../../main";
  import { setIcon } from "obsidian";

  let {
    plugin,
    fileList = $bindable(),
    searchTerm = $bindable(""),
    searchMode = 0,
    sortBy = $bindable("name"),
    sortDirection = $bindable("asc"),
    viewMode = $bindable("grid"),
    selectedFilePaths = $bindable(new Set<string>()),
    onSelectionChange,
  }: {
    plugin: VaultmanPlugin;
    fileList: explorerFiles | undefined;
    searchTerm?: string;
    searchMode?: number;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    viewMode?: any;
    selectedFilePaths: Set<string>;
    onSelectionChange?: (count: number) => void;
  } = $props();

  $effect(() => {
    onSelectionChange?.(selectedFilePaths.size);
  });

  onMount(() => {
    fileList = new explorerFiles(plugin);
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

<div class="vm-files-tab-content">
  {#if fileList}
    <PanelExplorer
      {plugin}
      provider={fileList}
      bind:viewMode
      {searchTerm}
      {searchMode}
      bind:sortBy
      bind:sortDirection
      {icon}
      bind:selectedFiles={selectedFilePaths}
    />
  {/if}
</div>
