<script lang="ts">
	import type { ObsiManPlugin } from "../../../main";
	import { translate } from "../../i18n/index";
	import { setIcon } from "obsidian";
	import FiltersTagsTab from "../tabs/FiltersTagsTab.svelte";
	import FiltersPropsTab from "../tabs/FiltersPropsTab.svelte";
	import FiltersFilesTab from "../tabs/FiltersFilesTab.svelte";
	import type { FileListComponent } from "../../components/FileListComponent";
	import type { PropertyExplorerComponent } from "../../components/PropertyExplorerComponent";
	import type { TagsExplorerComponent } from "../../components/TagsExplorerComponent";

	type FiltersTab = "props" | "files" | "tags";

	let {
		plugin,
		filtersActiveTab = $bindable("props"),
		filtersSearch = $bindable(""),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
		tagsExplorer = $bindable(),
		propExplorer = $bindable(),
		fileList = $bindable(),
	}: {
		plugin: ObsiManPlugin;
		filtersActiveTab: FiltersTab;
		filtersSearch: string;
		filtersSearchCategory: Record<FiltersTab, number>;
		tagsExplorer: TagsExplorerComponent | null;
		propExplorer: PropertyExplorerComponent | undefined;
		fileList: FileListComponent | undefined;
	} = $props();

	const TAB_ICONS: Record<FiltersTab, string> = {
		tags: "lucide-hash",
		props: "lucide-tag",
		files: "lucide-files",
	};

	const CATEGORY_ICONS: Record<FiltersTab, [string, string]> = {
		props: ["lucide-tag", "lucide-text-cursor-input"],
		tags: ["lucide-hash", "lucide-git-branch"],
		files: ["lucide-file", "lucide-folder"],
	};

	const CATEGORY_LABELS: Record<FiltersTab, [string, string]> = {
		props: [translate("filter.category.props"), translate("filter.category.values")],
		tags: [translate("filter.category.all_tags"), translate("filter.category.leaf_tags")],
		files: [translate("filter.category.files"), translate("filter.category.folders")],
	};

	const currentCategoryIcon = $derived(
		CATEGORY_ICONS[filtersActiveTab]?.[
			filtersSearchCategory[filtersActiveTab] ?? 0
		] ?? "lucide-search",
	);

	function switchFiltersTab(tab: FiltersTab) {
		if (filtersActiveTab === tab) return;
		filtersActiveTab = tab;
	}

	function cycleSearchCategory() {
		const tab = filtersActiveTab;
		filtersSearchCategory[tab] = filtersSearchCategory[tab] === 0 ? 1 : 0;
		filtersSearchCategory = { ...filtersSearchCategory };
	}

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(newName: string) {
				setIcon(el, newName);
			},
		};
	}
</script>

<!-- 3-tab bar: Tags · Props · Files -->
<div
	class="obsiman-tab-bar"
	class:has-labels={plugin.settings.filtersShowTabLabels}
>
	{#each (["props", "files", "tags"] as FiltersTab[]) as tab}
		<div
			class="obsiman-tab nav-action-button"
			class:is-active={filtersActiveTab === tab}
			onclick={() => switchFiltersTab(tab)}
			onkeydown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					switchFiltersTab(tab);
				}
			}}
			aria-label={translate("filter.tab." + tab)}
			role="tab"
			tabindex="0"
		>
			<span
				class="obsiman-tab-icon"
				use:icon={TAB_ICONS[tab]}
			></span>
			{#if plugin.settings.filtersShowTabLabels}
				<span class="obsiman-tab-label">{translate("filter.tab." + tab)}</span>
			{/if}
		</div>
	{/each}
</div>

<!-- Persistent header: [view-mode] [search pill] [sort] -->
<div class="obsiman-filters-header">
	<button
		class="obsiman-filters-header-btn"
		aria-label="View mode (WIP)"
		use:icon={"lucide-layout-list"}
	></button>
	<div class="obsiman-filters-header-search-pill">
		<input
			class="obsiman-filters-search-input"
			type="text"
			autocomplete="off"
			autocorrect="off"
			autocapitalize="off"
			spellcheck="false"
			placeholder={translate("filter.search_placeholder")}
			bind:value={filtersSearch}
		/>
		{#if filtersSearch}
			<button
				class="obsiman-filters-search-clear"
				aria-label="Clear search"
				use:icon={"lucide-x"}
				onclick={() => {
					filtersSearch = "";
				}}
			></button>
		{/if}
		<button
			class="obsiman-filters-search-mode"
			aria-label={CATEGORY_LABELS[filtersActiveTab]?.[
				filtersSearchCategory[filtersActiveTab] ?? 0
			] ?? "Search mode"}
			use:icon={currentCategoryIcon}
			onclick={cycleSearchCategory}
		></button>
	</div>
	<button
		class="obsiman-filters-header-btn"
		aria-label="Sort (WIP)"
		use:icon={"lucide-arrow-up-down"}
	></button>
</div>

<!-- Tab content via sub-components -->
{#if filtersActiveTab === "tags"}
	<FiltersTagsTab {plugin} searchTerm={filtersSearch} bind:tagsExplorer />
{:else if filtersActiveTab === "props"}
	<FiltersPropsTab {plugin} searchTerm={filtersSearch} bind:propExplorer />
{:else if filtersActiveTab === "files"}
	<FiltersFilesTab {plugin} bind:fileList />
{/if}
