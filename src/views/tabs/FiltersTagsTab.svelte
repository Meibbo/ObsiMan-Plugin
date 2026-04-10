<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { TagsExplorerComponent } from '../../components/TagsExplorerComponent';
  import type { ObsiManPlugin } from '../../main';

  let {
    plugin,
    tagsExplorer = $bindable<TagsExplorerComponent | null>(null),
  }: {
    plugin: ObsiManPlugin;
    tagsExplorer?: TagsExplorerComponent | null;
  } = $props();

  let containerEl: HTMLElement;

  onMount(() => {
    tagsExplorer = new TagsExplorerComponent(containerEl, plugin);
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
