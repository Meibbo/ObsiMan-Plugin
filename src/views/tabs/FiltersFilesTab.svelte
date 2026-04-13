<script lang="ts">
  import { FilesExplorerPanel } from "../containers/FilesExplorerPanel";
  import type { ObsiManPlugin } from "../../../main";

  let {
    plugin,
    fileList = $bindable<FilesExplorerPanel | undefined>(undefined),
    onSelectionChange,
  }: {
    plugin: ObsiManPlugin;
    fileList?: FilesExplorerPanel | undefined;
    onSelectionChange?: (count: number) => void;
  } = $props();

  function initFilesPanel(el: HTMLElement) {
    fileList = new FilesExplorerPanel(el, plugin, onSelectionChange);
    fileList.load();
    fileList.render(
      plugin.filterService.filteredFiles,
      plugin.propertyIndex.fileCount,
    );
    return {
      destroy() {
        fileList?.unload();
        fileList = undefined;
      },
    };
  }
</script>

<div class="obsiman-files-tab-content" use:initFilesPanel></div>

<style>
  .obsiman-files-tab-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
</style>
