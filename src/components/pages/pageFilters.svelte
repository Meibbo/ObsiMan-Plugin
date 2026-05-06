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
	import PanelExplorer from '../containers/panelExplorer.svelte';
	import { FTabs, type FilTab } from '../../types/typeTab';
	import { explorerProps } from '../containers/explorerProps';
	import { explorerFiles } from '../containers/explorerFiles';
	import { explorerTags } from '../containers/explorerTags';
	import { explorerBasesImport } from '../containers/explorerBasesImport';
	import { createBasesImportTargetsIndex } from '../../index/indexBasesImportTargets';
	import {
		extractBasesFencedBlocks,
		previewBasesImport,
	} from '../../services/serviceBasesInterop';
	import {
		buildRenameHandoffChange,
		cancelRenameHandoff,
		createFnRState,
		markRenameHandoffQueued,
		updateRenameHandoffReplacement,
	} from '../../services/serviceFnR.svelte';
	import type { ActiveFnRRenameHandoff, FnRRenameHandoff, FnRState } from '../../types/typeFnR';
	import type { FilterGroup } from '../../types/typeFilter';
	import type { BasesImportTarget } from '../../types/typeBasesInterop';
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
		filtersBaseChooseMode = $bindable(false),
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
		filtersBaseChooseMode?: boolean;
		addMode?: boolean;
		tagsExplorer?: explorerTags | undefined;
		propExplorer?: explorerProps | undefined;
		fileList?: explorerFiles | undefined;
		selectedCount?: number;
		selectedFilePaths?: Set<string>;
		addOpCount?: number;
	} = $props();

	const basesImportTargetsIndex = $derived(createBasesImportTargetsIndex(plugin.app));
	const basesImportProvider = $derived(new explorerBasesImport({
		index: basesImportTargetsIndex,
		onImportTarget: (target) => {
			void handleBasesImportTarget(target);
		},
	}));
	let basesImportVersion = $state(0);
	let lastBasesImportPreview = $state<ReturnType<typeof previewBasesImport> | null>(null);

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
	const disabledChooseTabs = $derived(
		filtersBaseChooseMode ? FTabs.filter((tab) => tab.id !== 'files').map((tab) => tab.id) : [],
	);

	$effect(() => {
		if (!filtersBaseChooseMode) return;
		filtersActiveTab = 'files';
		filtersViewMode = 'tree';
		void refreshBasesImportTargets();
	});

	function setActiveFiltersSearch(term: string): void {
		filtersSearchByTab = setFiltersSearch(filtersSearchByTab, filtersActiveTab, term);
	}

	function commitActiveFiltersSearch(term: string): void {
		filtersSearchByTab = addFiltersSearchHistory(filtersSearchByTab, filtersActiveTab, term);
	}

	function setContentSearch(term: string): void {
		filtersSearchByTab = setFiltersSearch(filtersSearchByTab, 'content', term);
	}

	async function refreshBasesImportTargets(): Promise<void> {
		await basesImportTargetsIndex.refresh();
		basesImportVersion++;
	}

	async function handleBasesImportTarget(target: BasesImportTarget): Promise<void> {
		const file = plugin.app.vault.getFileByPath(target.sourcePath);
		if (!file) return;

		const sourceContent = await plugin.app.vault.read(file);
		const block = target.kind === 'markdown-fence'
			? extractBasesFencedBlocks(sourceContent).find((candidate) => candidate.blockIndex === target.blockIndex)
			: undefined;
		const preview = previewBasesImport({
			sourcePath: target.sourcePath,
			content: block?.rawContent ?? sourceContent,
			kind: target.kind,
			blockIndex: target.blockIndex,
			lineStart: block?.lineStart ?? target.lineStart,
			targetViewName: target.targetViewName,
		});
		lastBasesImportPreview = preview;

		if (preview.filter) {
			plugin.filterService.setFilter(preview.filter as FilterGroup);
			void plugin.activeFiltersIndex.refresh();
		}
		filtersBaseChooseMode = false;
		filtersActiveTab = 'files';
	}

	function startRenameHandoff(handoff: FnRRenameHandoff): void {
		if (isActiveRenameHandoff(handoff)) {
			filtersFnRState = {
				...filtersFnRState,
				expanded: true,
				replace: handoff.replacement,
				scope: handoff.scope,
				rename: handoff,
			};
			return;
		}
		filtersFnRState = { ...filtersFnRState, rename: handoff };
	}

	function updateRenameReplacement(replacement: string): void {
		filtersFnRState = updateRenameHandoffReplacement(filtersFnRState, replacement);
	}

	function cancelRename(): void {
		filtersFnRState = cancelRenameHandoff(filtersFnRState);
	}

	function queueRename(): void {
		const change = buildRenameHandoffChange(filtersFnRState.rename);
		if (!change) return;
		void plugin.queueService.add(change);
		filtersFnRState = markRenameHandoffQueued(filtersFnRState);
	}

	function isActiveRenameHandoff(handoff: FnRRenameHandoff): handoff is ActiveFnRRenameHandoff {
		return handoff.status === 'editing' || handoff.status === 'ready';
	}
</script>

<NavbarTabs
	tabs={FTabs}
	bind:active={filtersActiveTab as string}
	showLabels={plugin.settings.filtersShowTabLabels}
	disabledTabIds={disabledChooseTabs}
	faintTabIds={disabledChooseTabs}
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
	fnrState={filtersFnRState}
	onRenameReplacementChange={updateRenameReplacement}
	onRenameConfirm={queueRename}
	onRenameCancel={cancelRename}
	{addOpCount}
	{icon}
/>

<div
	class="vm-tab-area"
	data-bases-import-applied={lastBasesImportPreview?.report.applied.length}
	data-bases-import-unsupported={lastBasesImportPreview?.report.unsupported.length}
>
	{#if filtersBaseChooseMode}
		<div class="vm-tab-content is-active">
			{#key basesImportVersion}
				<PanelExplorer
					{plugin}
					provider={basesImportProvider}
					bind:viewMode={filtersViewMode}
					searchTerm={filtersSearchByTab.files}
					searchMode={filtersSearchCategory.files}
					bind:sortBy={filtersSortBy}
					bind:sortDirection={filtersSortDir}
					{icon}
				/>
			{/key}
		</div>
	{:else}
		<div class="vm-tab-content" class:is-active={filtersActiveTab === 'props'}>
			<FiltersPropsTab
				{plugin}
				searchTerm={filtersSearchByTab.props}
				searchMode={filtersSearchCategory.props}
				bind:sortBy={filtersSortBy}
				bind:sortDirection={filtersSortDir}
				bind:viewMode={filtersViewMode}
				bind:explorer={propExplorer}
				{startRenameHandoff}
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
	{/if}
</div>
