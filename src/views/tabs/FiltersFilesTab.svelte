<script lang="ts">
  import { FileListComponent } from '../../components/FileListComponent';
  import type { ObsiManPlugin } from '../../main';

  let {
    plugin,
    fileList = $bindable<FileListComponent | undefined>(undefined),
  }: {
    plugin: ObsiManPlugin;
    fileList?: FileListComponent | undefined;
  } = $props();

  function initFileList(el: HTMLElement) {
    fileList = new FileListComponent(el, plugin.app, () => {});
    return {
      destroy() {
        fileList = undefined;
      },
    };
  }
</script>

<div class="obsiman-files-tab-content" use:initFileList></div>

<style>
  .obsiman-files-tab-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
</style>
