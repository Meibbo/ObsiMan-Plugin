<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { TagsExplorerComponent } from '../../components/TagsExplorerComponent';
  import type { ObsiManPlugin } from '../../main';

  let { plugin }: { plugin: ObsiManPlugin } = $props();

  let containerEl: HTMLElement;
  let explorer: TagsExplorerComponent | null = null;

  onMount(() => {
    explorer = new TagsExplorerComponent(containerEl, plugin);
    plugin.addChild(explorer);
  });

  onDestroy(() => {
    if (explorer) {
      plugin.removeChild(explorer);
      explorer = null;
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
