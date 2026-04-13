<script lang="ts">
  import { PropsExplorerPanel } from "../containers/PropsExplorerPanel";
  import type { ObsiManPlugin } from "../../../main";

  let {
    plugin,
    searchTerm = "",
    propExplorer = $bindable<PropsExplorerPanel | undefined>(undefined),
  }: {
    plugin: ObsiManPlugin;
    searchTerm?: string;
    propExplorer?: PropsExplorerPanel | undefined;
  } = $props();

  $effect(() => {
    if (propExplorer) {
      propExplorer.setSearchTerm(searchTerm);
    }
  });

  function initPropsPanel(node: HTMLElement) {
    propExplorer = new PropsExplorerPanel(node, plugin);
    propExplorer.load();
    return {
      destroy() {
        propExplorer?.unload();
        propExplorer = undefined;
      },
    };
  }
</script>

<div class="obsiman-props-tab-content" use:initPropsPanel></div>

<style>
  .obsiman-props-tab-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
</style>
