<script lang="ts">
	import type { VaultmanPlugin } from '../../main';
	// TODO: por qué importo los tabs y los explorer?
	import FiltersPropsTab from './tabProps.svelte';
	import FiltersFilesTab from './tabFiles.svelte';
	import FiltersTagsTab from './tabTags.svelte';
	import ContentTab from './tabContent.svelte';
	// TODO: por qué importa navbartabs??
	import NavbarTabs from '../layout/navbarTabs.svelte';
	import NavbarExplorer from '../layout/navbarExplorer.svelte';
	import { FTabs, type FilTab } from '../../types/typeTab';
	import { explorerProps } from '../containers/explorerProps';
	import { explorerFiles } from '../containers/explorerFiles';
	import { explorerTags } from '../containers/explorerTags';
	import { createFnRState } from '../../services/serviceFnR.svelte';
	import type { FnRState } from '../../types/typeFnR';
	import {
		addFiltersSearchHistory,
		createFiltersSearchState,
		getFiltersSearch,
		getFiltersSearchHistory,
		setFiltersSearch,
		type FiltersSearchTab,
		type FiltersSearchState,
	} from '../frame/frameFiltersSearch';
	// TODO: por qué setIcon?
	import { setIcon } from 'obsidian';

	let {
		plugin,
		filtersActiveTab = $bindable('props'),
		filtersSearchByTab = $bindable(createFiltersSearchState()),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0, content: 0 }),
		filtersFnRState = $bindable(createFnRState()),
		filtersOperationScope = $bindable('auto'),
		onOperationScopeChange,
		filtersSortBy = $bindable('name'),
		filtersSortDir = $bindable('asc'),
		filtersViewMode = $bindable('tree'),
		addMode = $bindable(false),
		tagsExplorer = $bindable(),
		propExplorer = $bindable(),
		fileList = $bindable(),
		selectedCount = $bindable(0),
		selectedFilePaths = $bindable(new Set<string>()),
		addOpCount = 0,
	}: {
		plugin: VaultmanPlugin;
		filtersActiveTab: FiltersSearchTab;
		filtersSearchByTab: FiltersSearchState;
		filtersSearchCategory: Record<FilTab, number>;
		filtersFnRState: FnRState;
		filtersOperationScope?: 'auto' | 'selected' | 'filtered' | 'all';
		onOperationScopeChange?: (value: 'auto' | 'selected' | 'filtered' | 'all') => void;
		filtersSortBy?: string;
		filtersSortDir?: 'asc' | 'desc';
		filtersViewMode?: any;
		addMode?: boolean;
		tagsExplorer?: explorerTags | undefined;
		propExplorer?: explorerProps | undefined;
		fileList?: explorerFiles | undefined;
		selectedCount?: number;
		selectedFilePaths?: Set<string>;
		addOpCount?: number;
	} = $props();

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(n: string) {
				setIcon(el, n);
			},
		};
	}

	const activeFiltersSearch = $derived(getFiltersSearch(filtersSearchByTab, filtersActiveTab));
	const activeFiltersSearchHistory = $derived(
		getFiltersSearchHistory(filtersSearchByTab, filtersActiveTab),
	);
	function setActiveFiltersSearch(term: string): void {
		filtersSearchByTab = setFiltersSearch(filtersSearchByTab, filtersActiveTab, term);
	}

	function commitActiveFiltersSearch(term: string): void {
		filtersSearchByTab = addFiltersSearchHistory(filtersSearchByTab, filtersActiveTab, term);
	}

	function setContentSearch(term: string): void {
		filtersSearchByTab = setFiltersSearch(filtersSearchByTab, 'content', term);
	}
</script>

<NavbarTabs
	tabs={FTabs}
	bind:active={filtersActiveTab as string}
	showLabels={plugin.settings.filtersShowTabLabels}
/>

<NavbarExplorer
	activeTab={filtersActiveTab}
	filtersSearch={activeFiltersSearch}
	onSearchChange={setActiveFiltersSearch}
	searchHistory={activeFiltersSearchHistory}
	onSearchHistoryCommit={commitActiveFiltersSearch}
	bind:filtersSearchCategory
	bind:sortBy={filtersSortBy}
	bind:sortDirection={filtersSortDir}
	bind:viewMode={filtersViewMode}
	bind:addMode
	bind:operationScope={filtersOperationScope}
	{onOperationScopeChange}
	{tagsExplorer}
	{propExplorer}
	{fileList}
	{addOpCount}
	{icon}
/>

<div class="vm-tab-area">
	<div class="vm-tab-content" class:is-active={filtersActiveTab === 'props'}>
		<FiltersPropsTab
			{plugin}
			searchTerm={filtersSearchByTab.props}
			searchMode={filtersSearchCategory.props}
			bind:sortBy={filtersSortBy}
			bind:sortDirection={filtersSortDir}
			bind:viewMode={filtersViewMode}
			bind:explorer={propExplorer}
		/>
	</div>
	<div class="vm-tab-content" class:is-active={filtersActiveTab === 'files'}>
		<FiltersFilesTab
			{plugin}
			searchTerm={filtersSearchByTab.files}
			searchMode={filtersSearchCategory.files}
			bind:sortBy={filtersSortBy}
			bind:sortDirection={filtersSortDir}
			bind:viewMode={filtersViewMode}
			bind:fileList
			bind:selectedFilePaths
			onSelectionChange={(c) => (selectedCount = c)}
		/>
	</div>
	<div class="vm-tab-content" class:is-active={filtersActiveTab === 'tags'}>
		<FiltersTagsTab
			{plugin}
			searchTerm={filtersSearchByTab.tags}
			searchMode={filtersSearchCategory.tags}
			bind:sortBy={filtersSortBy}
			bind:sortDirection={filtersSortDir}
			bind:viewMode={filtersViewMode}
			bind:explorer={tagsExplorer}
		/>
	</div>
	<div class="vm-tab-content" class:is-active={filtersActiveTab === 'content'}>
		<ContentTab
			{plugin}
			query={filtersSearchByTab.content}
			onQueryChange={setContentSearch}
			bind:fnrState={filtersFnRState}
			{selectedFilePaths}
			bind:sortBy={filtersSortBy}
			bind:sortDirection={filtersSortDir}
			bind:viewMode={filtersViewMode}
			{icon}
		/>
	</div>
</div>
