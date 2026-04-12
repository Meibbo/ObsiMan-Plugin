<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { TagsExplorerComponent } from "../../components/TagsExplorerComponent";
  import type { ObsiManPlugin } from "../../../main";

  let {
    plugin,
    searchTerm = "",
    tagsExplorer = $bindable<TagsExplorerComponent | null>(null),
  }: {
    plugin: ObsiManPlugin;
    searchTerm?: string;
    tagsExplorer?: TagsExplorerComponent | null;
  } = $props();

  $effect(() => {
    if (tagsExplorer) {
      tagsExplorer.setSearchTerm(searchTerm);
    }
  });

  let containerEl: HTMLElement;

  onMount(() => {
    tagsExplorer = new TagsExplorerComponent(containerEl, plugin, { hideSearch: true });
    plugin.addChild(tagsExplorer);
  });

  onDestroy(() => {
    if (tagsExplorer) {
      plugin.removeChild(tagsExplorer);
      tagsExplorer = null;
    }
  });
</script>

<div class="obsiman-tags-tab-content" bind:this={containerEl}></div>

<style>
  .obsiman-tags-tab-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
</style>
