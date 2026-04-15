<script lang="ts">
  import { translate } from "../../i18n/index";
  import SortPopup from "./popupSort.svelte";
  import ViewModePopup from "./popupView.svelte";
  import type { FilesExplorerPanel } from "../containers/explorerFiles";
  import type { PropsExplorerPanel } from "../containers/explorerProps";
  import type { TagsExplorerPanel } from "../containers/explorerTags";

  type FiltersTab = "props" | "files" | "tags";
  type HeaderMode = "header" | "sort" | "viewmode";

  let {
    activeTab,
    filtersSearch = $bindable(""),
    filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
    tagsExplorer,
    propExplorer,
    fileList,
    icon,
  }: {
    activeTab: FiltersTab;
    filtersSearch: string;
    filtersSearchCategory: Record<FiltersTab, number>;
    tagsExplorer: TagsExplorerPanel | null | undefined;
    propExplorer: PropsExplorerPanel | undefined;
    fileList: FilesExplorerPanel | undefined;
    icon: (node: HTMLElement, name: string) => { update(n: string): void };
  } = $props();

  const CATEGORY_ICONS: Record<FiltersTab, [string, string]> = {
    props: ["lucide-tag", "lucide-text-cursor-input"],
    tags: ["lucide-hash", "lucide-git-branch"],
    files: ["lucide-file", "lucide-folder"],
  };
  const CATEGORY_LABELS: Record<FiltersTab, [string, string]> = {
    props: [translate("filter.category.props"), translate("filter.category.values")],
    tags:  [translate("filter.category.all_tags"), translate("filter.category.leaf_tags")],
    files: [translate("filter.category.files"), translate("filter.category.folders")],
  };

  const currentCategoryIcon = $derived(
    CATEGORY_ICONS[activeTab]?.[filtersSearchCategory[activeTab] ?? 0] ?? "lucide-search",
  );

  let headerMode    = $state<HeaderMode>("header");
  let headerExitDir = $state<"left" | "right">("right");

  function openSortPopup()     { headerExitDir = "right"; headerMode = "sort";     }
  function openViewModePopup() { headerExitDir = "left";  headerMode = "viewmode"; }
  function closeHeaderPopup()  { headerMode = "header"; }

  function cycleSearchCategory() {
    const tab = activeTab;
    filtersSearchCategory[tab] = filtersSearchCategory[tab] === 0 ? 1 : 0;
    filtersSearchCategory = { ...filtersSearchCategory };
  }

  function handleSortChange(sortBy: string, direction: "asc" | "desc") {
    // @ts-ignore — setSortBy added in Task 7
    if (activeTab === "files")  fileList?.setSortBy(sortBy, direction);
    // @ts-ignore — setSortBy added in Task 7
    if (activeTab === "props")  propExplorer?.setSortBy(sortBy, direction);
    // @ts-ignore — setSortBy added in Task 7
    if (activeTab === "tags")   tagsExplorer?.setSortBy(sortBy, direction);
  }

  function handleViewModeChange(mode: "tree" | "dnd" | "grid" | "cards") {
    if (activeTab === "files") {
      // @ts-ignore — setViewMode added in Task 6
      fileList?.setViewMode(mode === "grid" ? "grid" : "tree");
    } else if (activeTab === "props") {
      // @ts-ignore — setViewMode added in Task 6
      propExplorer?.setViewMode(mode === "grid" ? "grid" : "tree");
    }
    // tags: tree-only, no-op
  }
</script>

<div class="vaultman-navbar-filters vaultman-glass vaultman-glass--top">
  <div class="vaultman-filters-header-wrap">
    {#if headerMode === "header"}
      <div class="vaultman-filters-header">
        <button
          class="vaultman-nav-fab"
          aria-label={translate("filter.viewmode_btn")}
          onclick={openViewModePopup}
          use:icon={"lucide-layout-list"}
        ></button>
        <div class="vaultman-filters-header-search-pill">
          <input
            class="vaultman-filters-search-input"
            type="text" autocomplete="off" autocorrect="off"
            autocapitalize="off" spellcheck="false"
            placeholder={translate("filter.search_placeholder")}
            bind:value={filtersSearch}
          />
          {#if filtersSearch}
            <button class="vaultman-filters-search-clear"
              aria-label={translate("filter.search_clear")}
              use:icon={"lucide-x"}
              onclick={() => { filtersSearch = ""; }}
            ></button>
          {/if}
          <button class="vaultman-filters-search-mode"
            aria-label={CATEGORY_LABELS[activeTab]?.[filtersSearchCategory[activeTab] ?? 0] ?? translate("filter.search_mode")}
            use:icon={currentCategoryIcon}
            onclick={cycleSearchCategory}
          ></button>
        </div>
        <button
          class="vaultman-nav-fab"
          aria-label={translate("filter.sort_btn")}
          onclick={openSortPopup}
          use:icon={"lucide-arrow-up-down"}
        ></button>
      </div>
    {:else if headerMode === "sort"}
      <div class="vaultman-filters-popup-slot"
        class:popup-enter-from-left={headerExitDir === "right"}
        class:popup-enter-from-right={headerExitDir === "left"}
      >
        <!-- @ts-ignore — onSortChange added to popupSort in Task 7 -->
        <SortPopup {activeTab} onClose={closeHeaderPopup}
          onSortChange={handleSortChange} {icon} />
      </div>
    {:else if headerMode === "viewmode"}
      <div class="vaultman-filters-popup-slot"
        class:popup-enter-from-left={headerExitDir === "right"}
        class:popup-enter-from-right={headerExitDir === "left"}
      >
        <!-- @ts-ignore — onViewModeChange added to popupView in Task 6 -->
        <ViewModePopup {activeTab} onClose={closeHeaderPopup}
          onViewModeChange={handleViewModeChange} {icon} />
      </div>
    {/if}
  </div>
</div>
