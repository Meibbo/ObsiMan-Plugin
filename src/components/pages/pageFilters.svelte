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
	// TODO: por qué setIcon?
	import { setIcon } from 'obsidian';

	let {
		plugin,
		filtersActiveTab = $bindable('props'),
		filtersSearch = $bindable(''),
		filtersSearchCategory = $bindable({ tags: 0, props: 0, files: 0 }),
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
		filtersActiveTab: FilTab;
		filtersSearch: string;
		filtersSearchCategory: Record<'tags' | 'props' | 'files', number>;
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
</script>

<NavbarTabs
	tabs={FTabs}
	bind:active={filtersActiveTab as string}
	showLabels={plugin.settings.filtersShowTabLabels}
/>

{#if filtersActiveTab !== 'content'}
	<NavbarExplorer
		activeTab={filtersActiveTab as 'props' | 'files' | 'tags'}
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
{/if}

<div class="vm-tab-area">
	<div class="vm-tab-content" class:is-active={filtersActiveTab === 'props'}>
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
	<div class="vm-tab-content" class:is-active={filtersActiveTab === 'files'}>
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
	<div class="vm-tab-content" class:is-active={filtersActiveTab === 'tags'}>
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
	<div class="vm-tab-content" class:is-active={filtersActiveTab === 'content'}>
		<ContentTab {plugin} />
	</div>
</div>