<script lang="ts">
  import { PropertyExplorerComponent } from "../../components/PropertyExplorerComponent";
  import type { ObsiManPlugin } from "../../../main";

  let {
    plugin,
    searchTerm = "",
    propExplorer = $bindable<PropertyExplorerComponent | undefined>(undefined),
  }: {
    plugin: ObsiManPlugin;
    searchTerm?: string;
    propExplorer?: PropertyExplorerComponent | undefined;
  } = $props();

  $effect(() => {
    if (propExplorer) {
      propExplorer.setSearchTerm(searchTerm);
    }
  });

  function initPropertyExplorer(node: HTMLElement) {
    propExplorer = new PropertyExplorerComponent(node, plugin, {
      defaultScope: "filtered",
      hideSearch: true,
      onPropertyFilter: (_prop: string, _val: string) => {
        /* handled by FilterService events */
      },
    });
    propExplorer.render();
    return {
      destroy() {
        propExplorer?.destroy();
        propExplorer = undefined;
      },
    };
  }
</script>

<div class="obsiman-props-tab-content" use:initPropertyExplorer></div>

<style>
  .obsiman-props-tab-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
</style>
