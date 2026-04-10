<script lang="ts">
  import { PropertyExplorerComponent } from '../../components/PropertyExplorerComponent';
  import type { ObsiManPlugin } from '../../main';

  let {
    plugin,
    propExplorer = $bindable<PropertyExplorerComponent | undefined>(undefined),
  }: {
    plugin: ObsiManPlugin;
    propExplorer?: PropertyExplorerComponent | undefined;
  } = $props();

  function initPropertyExplorer(node: HTMLElement) {
    propExplorer = new PropertyExplorerComponent(node, plugin, {
      defaultScope: 'filtered',
      onPropertyFilter: (_prop: string, _val: string) => { /* handled by FilterService events */ },
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
