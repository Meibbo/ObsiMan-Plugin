<script lang="ts">
  import type { VaultmanPlugin } from "../../main";
  import type { defOpsTab } from "../../types/typePrimitives";
  import { MenuCuratorPanel } from "../containers/panelCurator";
  import { translate } from "../../i18n/index";

  // ─── Props ───────────────────────────────────────────────────────────────
  let {
    plugin,
    icon,
  }: {
    plugin: VaultmanPlugin;
    icon: (el: HTMLElement, name: string) => any;
  } = $props();

  // ─── State ───────────────────────────────────────────────────────────────
  let opsTab = $state<string>("layout");

  // ─── Tabs definition ─────────────────────────────────────────────────────
  const Tabs: defOpsTab[] = [
    {
      id: "linter",
      label: translate("ops.tabs.linter"),
      icon: "lucide-sparkles",
    },
    {
      id: "template",
      label: translate("ops.tabs.template"),
      icon: "lucide-layout-template",
    },
    {
      id: "layout",
      label: translate("ops.tabs.layout"),
      icon: "lucide-layout",
    },
  ];

  // function openLinter() {
  // 	const selected = getSelectedFiles();
  // 	const targets =
  // 		selected.length > 0 ? selected : plugin.filterService.filteredFiles;
  // 	new LinterModal(plugin.app, plugin.propertyIndex, targets).open();
  // }

  const mountCurator = (node: HTMLElement) => {
    const panel = new MenuCuratorPanel(node, plugin);
    plugin.addChild(panel);
    return {
      destroy() {
        plugin.removeChild(panel);
      },
    };
  };
</script>

<div class="vm-tab-bar">
  {#each Tabs as tab}
    <div
      class="vm-tab nav-action-button"
      class:is-active={opsTab === tab.id}
      data-tab={tab.id}
      onclick={() => {
        opsTab = tab.id;
      }}
      role="tab"
      tabindex="0"
      aria-label={tab.label}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          opsTab = tab.id;
        }
      }}
    >
      <span class="vm-tab-icon" use:icon={tab.icon}></span>
      <span class="vm-tab-label">{tab.label}</span>
    </div>
  {/each}
</div>

<div class="vm-tab-area">
  <!-- File Ops tab (always in DOM so QueueListComponent persists) -->

  <!-- Linter tab (always in DOM) -->
  <!-- <div class="vm-tab-content" class:is-active={Tabs === "linter"}>
		<LinterTab {openLinter} />
	</div> -->

  <!-- Template tab -->
  <div class="vm-tab-content" class:is-active={opsTab === "template"}>
    <div class="vm-coming-soon">
      {translate("ops.coming_soon")}
    </div>
  </div>

  <!-- Layout tab -->
  <div class="vm-tab-content" class:is-active={opsTab === "layout"}>
    <div class="vm-layout-curator" use:mountCurator></div>
  </div>
</div>
