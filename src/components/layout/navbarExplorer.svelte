<script lang="ts">
  import { translate } from "../../index/i18n/lang";
  import SortPopup from "./overlays/overlaySortMenu.svelte";
  import ViewModePopup from "./overlays/overlayViewMenu.svelte";
  import { explorerFiles } from "../containers/explorerFiles";
  import { explorerProps } from "../containers/explorerProps";
  import { explorerTags } from "../containers/explorerTags";
  import { SEARCH_SEMANTICS_SOURCES } from "../frame/frameSearchSources";

  type FiltersTab = "props" | "files" | "tags" | "content";
  type HeaderMode = "header" | "sort" | "viewmode";

  let {
    activeTab,
    filtersSearch = $bindable(""),
    filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0, content: 0 }),
    onSearchChange,
    searchHistory = [],
    onSearchHistoryCommit,
    sortBy = $bindable("name"),
    sortDirection = $bindable("asc"),
    viewMode = $bindable("tree"),
    addMode = $bindable(false),
    operationScope = $bindable("auto"),
    onOperationScopeChange,
    icon,
    addOpCount = 0,
  }: {
    activeTab: FiltersTab;
    filtersSearch: string;
    filtersSearchCategory: Record<FiltersTab, number>;
    onSearchChange?: (term: string) => void;
    searchHistory?: string[];
    onSearchHistoryCommit?: (term: string) => void;
    sortBy: string;
    sortDirection: "asc" | "desc";
    viewMode: any;
    addMode: boolean;
    operationScope: "auto" | "selected" | "filtered" | "all";
    onOperationScopeChange?: (
      value: "auto" | "selected" | "filtered" | "all",
    ) => void;
    tagsExplorer: explorerTags | null | undefined;
    propExplorer: explorerProps | undefined;
    fileList: explorerFiles | undefined;
    icon: (node: HTMLElement, name: string) => { update(n: string): void };
    addOpCount?: number;
  } = $props();

  const CATEGORY_LABELS: Record<FiltersTab, [string, string]> = {
    props: [
      translate("filter.category.props"),
      translate("filter.category.values"),
    ],
    tags: [
      translate("filter.category.all_tags"),
      translate("filter.category.leaf_tags"),
    ],
    files: [
      translate("filter.category.files"),
      translate("filter.category.folders"),
    ],
    content: [
      translate("filter.tab.content"),
      translate("content.search.placeholder"),
    ],
  };

  const currentCategoryLabel = $derived(
    CATEGORY_LABELS[activeTab]?.[filtersSearchCategory[activeTab] ?? 0] ??
      translate("filter.search_mode"),
  );

  let headerMode = $state<HeaderMode>("header");
  let headerExitDir = $state<"left" | "right">("right");
  let searchFocused = $state(false);
  let helpOpen = $state(false);
  const historyItems = $derived(searchHistory.slice(0, 3));

  function openSortPopup() {
    headerExitDir = "right";
    headerMode = "sort";
  }
  function openViewModePopup() {
    headerExitDir = "left";
    headerMode = "viewmode";
  }
  function closeHeaderPopup() {
    headerMode = "header";
  }

  function cycleSearchCategory() {
    if (activeTab === "content") return;
    const tab = activeTab;
    filtersSearchCategory[tab] = filtersSearchCategory[tab] === 0 ? 1 : 0;
    filtersSearchCategory = { ...filtersSearchCategory };
  }

  function updateFiltersSearch(term: string) {
    filtersSearch = term;
    onSearchChange?.(term);
  }

  function commitSearchHistory(term = filtersSearch) {
    onSearchHistoryCommit?.(term);
  }

  function chooseHistory(term: string) {
    updateFiltersSearch(term);
    commitSearchHistory(term);
    searchFocused = false;
  }
</script>

<div class="vm-navbar-filters vm-glass vm-glass--top">
  <div class="vm-filters-header-wrap">
    {#if headerMode === "header"}
      <div class="vm-filters-header">
        <div
          class="vm-nav-icon is-active"
          role="button"
          tabindex="0"
          aria-label={translate("filter.viewmode_btn")}
          onclick={openViewModePopup}
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") openViewModePopup();
          }}
          use:icon={"lucide-layout-list"}
        ></div>
        <div class="vm-filters-header-search-wrap">
          <div class="vm-filters-header-search-pill">
            <input
              class="vm-filters-search-input"
              type="text"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              placeholder={translate("filter.search_placeholder")}
              value={filtersSearch}
              onfocus={() => {
                searchFocused = true;
                helpOpen = false;
              }}
              onblur={() => {
                commitSearchHistory();
                window.setTimeout(() => {
                  searchFocused = false;
                }, 120);
              }}
              onkeydown={(e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  commitSearchHistory();
                  (e.currentTarget as HTMLInputElement).blur();
                }
              }}
              oninput={(e) => {
                updateFiltersSearch((e.currentTarget as HTMLInputElement).value);
              }}
            />
            {#if filtersSearch}
              <button
                class="vm-filters-search-clear"
                aria-label={translate("filter.search_clear")}
                use:icon={"lucide-x"}
                onclick={() => {
                  updateFiltersSearch("");
                }}
              ></button>
            {/if}
            <button
              class="vm-filters-search-mode has-label"
              aria-label={currentCategoryLabel}
              title={currentCategoryLabel}
              onclick={cycleSearchCategory}
            >
              <span>{currentCategoryLabel}</span>
            </button>
          </div>
          {#if searchFocused && historyItems.length > 0}
            <div
              class="vm-filters-search-history"
              role="listbox"
              aria-label={translate("filter.search_history")}
            >
              {#each historyItems as term (term)}
                <button
                  class="vm-filters-search-history-item"
                  type="button"
                  onmousedown={(e) => e.preventDefault()}
                  onclick={() => chooseHistory(term)}
                >
                  <span class="vm-filters-search-history-icon" use:icon={"lucide-clock"}></span>
                  <span class="vm-filters-search-history-label">{term}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
        <div class="vm-filters-help-wrap">
          <button
            class="vm-filters-search-help"
            aria-label={translate("filter.search_help")}
            title={translate("filter.search_help")}
            use:icon={"lucide-circle-help"}
            onclick={() => {
              helpOpen = !helpOpen;
              searchFocused = false;
            }}
          ></button>
          {#if helpOpen}
            <div
              class="vm-filters-help-popover"
              aria-label={translate("filter.search_read_more")}
            >
              {#each SEARCH_SEMANTICS_SOURCES as source (source.id)}
                <a
                  class="vm-filters-help-link"
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.label}
                </a>
              {/each}
            </div>
          {/if}
        </div>
        <div
          class="vm-nav-icon is-active"
          role="button"
          tabindex="0"
          aria-label={translate("filter.sort_btn")}
          onclick={openSortPopup}
          onkeydown={(e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") openSortPopup();
          }}
          use:icon={"lucide-arrow-up-down"}
        ></div>
      </div>
    {:else if headerMode === "sort"}
      <div
        class="vm-filters-popup-slot"
        class:popup-enter-from-left={headerExitDir === "right"}
        class:popup-enter-from-right={headerExitDir === "left"}
      >
        <SortPopup
          {activeTab}
          onClose={closeHeaderPopup}
          bind:sortBy
          bind:sortDir={sortDirection}
          bind:operationScope
          {onOperationScopeChange}
          {icon}
        />
      </div>
    {:else if headerMode === "viewmode"}
      <div
        class="vm-filters-popup-slot"
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
