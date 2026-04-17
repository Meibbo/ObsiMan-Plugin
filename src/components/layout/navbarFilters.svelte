<script lang="ts">
  import { translate } from "../../i18n/index";
  import SortPopup from "./popupSort.svelte";
  import ViewModePopup from "./popupView.svelte";
  import { explorerFiles } from "../containers/explorerFiles";
  import { explorerProps } from "../containers/explorerProps";
  import { explorerTags } from "../containers/explorerTags";

  type FiltersTab = "props" | "files" | "tags";
  type HeaderMode = "header" | "sort" | "viewmode";

  let {
    activeTab,
    filtersSearch = $bindable(""),
    filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
    sortBy = $bindable("name"),
    sortDirection = $bindable("asc"),
    viewMode = $bindable("tree"),
    addMode = $bindable(false),
    tagsExplorer,
    propExplorer,
    fileList,
    icon,
    addOpCount = 0,
  }: {
    activeTab: FiltersTab;
    filtersSearch: string;
    filtersSearchCategory: Record<FiltersTab, number>;
    sortBy: string;
    sortDirection: "asc" | "desc";
    viewMode: any;
    addMode: boolean;
    tagsExplorer: explorerTags | null | undefined;
    propExplorer: explorerProps | undefined;
    fileList: explorerFiles | undefined;
    icon: (node: HTMLElement, name: string) => { update(n: string): void };
    addOpCount?: number;
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

  let headerMode      = $state<HeaderMode>("header");
  let headerExitDir   = $state<"left" | "right">("right");
  let currentViewMode = $state<"tree" | "dnd" | "grid" | "cards">("grid"); // Files default is grid

  function openSortPopup()     { headerExitDir = "right"; headerMode = "sort";     }
  function openViewModePopup() { headerExitDir = "left";  headerMode = "viewmode"; }
  function closeHeaderPopup()  { headerMode = "header"; }

  function cycleSearchCategory() {
    const tab = activeTab;
    filtersSearchCategory[tab] = filtersSearchCategory[tab] === 0 ? 1 : 0;
    filtersSearchCategory = { ...filtersSearchCategory };
  }
</script>

<div class="vaultman-navbar-filters vaultman-glass vaultman-glass--top">
  <div class="vaultman-filters-header-wrap">
    {#if headerMode === "header"}
      <div class="vaultman-filters-header">
        <div
          class="vaultman-nav-fab"
          role="button"
          tabindex="0"
          aria-label={translate("filter.viewmode_btn")}
          onclick={openViewModePopup}
          onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') openViewModePopup(); }}
          use:icon={"lucide-layout-list"}
        ></div>
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
        <div
          class="vaultman-nav-fab"
          role="button"
          tabindex="0"
          aria-label={translate("filter.sort_btn")}
          onclick={openSortPopup}
          onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') openSortPopup(); }}
          use:icon={"lucide-arrow-up-down"}
        ></div>
      </div>
    {:else if headerMode === "sort"}
      <div class="vaultman-filters-popup-slot"
        class:popup-enter-from-left={headerExitDir === "right"}
        class:popup-enter-from-right={headerExitDir === "left"}
      >
        <SortPopup 
          {activeTab} 
          onClose={closeHeaderPopup}
          bind:sortBy
          bind:sortDir={sortDirection}
          {icon} 
        />
      </div>
    {:else if headerMode === "viewmode"}
      <div class="vaultman-filters-popup-slot"
        class:popup-enter-from-left={headerExitDir === "right"}
        class:popup-enter-from-right={headerExitDir === "left"}
      >
        <ViewModePopup 
          {activeTab} 
          onClose={closeHeaderPopup}
          bind:viewMode
          bind:addMode
          initialViewMode={viewMode}
          {addOpCount}
          {icon} 
        />
      </div>
    {/if}
  </div>
</div>
