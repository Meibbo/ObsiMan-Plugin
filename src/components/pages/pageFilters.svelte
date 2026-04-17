<script lang="ts">
	import type { VaultmanPlugin } from "../../../main";
	import { setIcon } from "obsidian";
	import FiltersTagsTab from "./tabTags.svelte";
	import FiltersPropsTab from "./tabProps.svelte";
	import FiltersFilesTab from "./tabFiles.svelte";
	import NavbarTabs from "../layout/navbarTabs.svelte";
	import NavbarFilters from "../layout/navbarFilters.svelte";
	import { explorerFiles } from "../containers/explorerFiles";
	import { explorerProps } from "../containers/explorerProps";
	import { explorerTags } from "../containers/explorerTags";

	type FiltersTab = "props" | "files" | "tags";

	let {
		plugin,
		filtersActiveTab = $bindable("props"),
		filtersSearch = $bindable(""),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
		filtersSortBy = $bindable("name"),
		filtersSortDir = $bindable("asc"),
		filtersViewMode = $bindable("tree"),
		addMode = $bindable(false),
		tagsExplorer = $bindable(),
		propExplorer = $bindable(),
		fileList = $bindable(),
		selectedCount = $bindable(0),
		selectedFilePaths = $bindable(new Set<string>()),
		addOpCount = 0,
	}: {
		plugin: VaultmanPlugin;
		filtersActiveTab: FiltersTab;
		filtersSearch: string;
		filtersSearchCategory: Record<FiltersTab, number>;
		filtersSortBy?: string;
		filtersSortDir?: "asc" | "desc";
		filtersViewMode?: any;
		addMode?: boolean;
		tagsExplorer?: explorerTags | undefined;
		propExplorer?: explorerProps | undefined;
		fileList?: explorerFiles | undefined;
		selectedCount?: number;
		selectedFilePaths?: Set<string>;
		addOpCount?: number;
	} = $props();

	function switchFiltersTab(tab: FiltersTab) {
		if (filtersActiveTab === tab) return;
		filtersActiveTab = tab;
	}

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(n: string) {
				setIcon(el, n);
			},
		};
	}
</script>

<NavbarTabs
	activeTab={filtersActiveTab}
	showLabels={plugin.settings.filtersShowTabLabels}
	onTabChange={switchFiltersTab}
	{icon}
/>

<NavbarFilters
	activeTab={filtersActiveTab}
	bind:filtersSearch
	bind:filtersSearchCategory
	bind:sortBy={filtersSortBy}
	bind:sortDirection={filtersSortDir}
	bind:viewMode={filtersViewMode}
	bind:addMode
	{tagsExplorer}
	{propExplorer}
	{fileList}
	{addOpCount}
	{icon}
/>

<div class="vaultman-filters-tabs-container">
	<div class="vaultman-tab-wrapper" class:is-hidden={filtersActiveTab !== "tags"}>
		<FiltersTagsTab
			{plugin}
			bind:searchTerm={filtersSearch}
			searchMode={filtersSearchCategory.tags}
			bind:sortBy={filtersSortBy}
			bind:sortDirection={filtersSortDir}
			bind:viewMode={filtersViewMode}
			bind:explorer={tagsExplorer}
		/>
	</div>
	<div class="vaultman-tab-wrapper" class:is-hidden={filtersActiveTab !== "props"}>
		<FiltersPropsTab
			{plugin}
			bind:searchTerm={filtersSearch}
			searchMode={filtersSearchCategory.props}
			bind:sortBy={filtersSortBy}
			bind:sortDirection={filtersSortDir}
			bind:viewMode={filtersViewMode}
			bind:explorer={propExplorer}
		/>
	</div>
	<div class="vaultman-tab-wrapper" class:is-hidden={filtersActiveTab !== "files"}>
		<FiltersFilesTab
			{plugin}
			bind:searchTerm={filtersSearch}
			searchMode={filtersSearchCategory.files}
			bind:sortBy={filtersSortBy}
			bind:sortDirection={filtersSortDir}
			bind:viewMode={filtersViewMode}
			bind:fileList
			bind:selectedFilePaths
			onSelectionChange={(c) => (selectedCount = c)}
		/>
	</div>
</div>

<style>
	.vaultman-filters-tabs-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
	}
	.vaultman-tab-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
		position: absolute;
		top: 0;
		left: 0;
	}
	.is-hidden {
		display: none !important;
	}
</style>
