<!--******************************************************************\\
//*      ___|^___^|___        .-~*´¨¯¨`*~-.        ___|^___^|___     *\\
//*     |  Vaultman  |       |   Meibbo   |       | April 2026 |     *\\
//*     \___/`*´\___/        `-~*´¨¯¨`*~-´        \___/`*´\___/      *\\
//*                                                                  *\\
//*           Made with love for tools that last and help.           *\\
//*                                                                  *\\
//*     (づ￣ 3￣)づ    ☆*: .｡. o(≧▽≦)o .｡.:*☆     ╰(*°▽°*)╯      *\\
//*******************************************************************-->

<!--...---------—————————————(   IMPORTS   )————————————----------...-->
<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { setIcon } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import { explorerFiles } from '../containers/explorerFiles';
	import { explorerProps } from '../containers/explorerProps';
	import { explorerTags } from '../containers/explorerTags';
	import StatisticsPage from '../pages/pageStats.svelte';
	import FiltersPage from '../pages/pageFilters.svelte';
	import OperationsPage from '../pages/pageTools.svelte';
	import BottomNav from '../layout/navbarPillFab.svelte';
	import PopupOverlay from '../layout/overlays/layoutOverlay.svelte';
	import PopupIsland from '../layout/overlays/overlayIsland.svelte';
	import ExplorerQueueComp from '../explorers/explorerQueue.svelte';
	import ExplorerActiveFiltersComp from '../explorers/explorerActiveFilters.svelte';

	import { FolderSuggest } from '../../utils/autocomplete';
	import { translate } from '../../index/i18n/lang';
	import type { FabDef } from '../../types/typePrimitives';
	import {
		collectActiveFilterRules,
		countFilterLeaves,
		type ActiveFilterRule,
	} from './frameActiveFilters';
	import {
		createFramePageFabs,
		createFramePageIcons,
		createFramePageLabels,
		resolveFramePageOrder,
	} from './framePages';
	import { FrameViewportController } from './frameViewport';
	import { FrameNavReorderController } from './frameNavReorder.svelte';
	import { FrameOverlayController } from './frameOverlays.svelte';
	import { createMoveChanges, createMovePreviews } from './frameMoves';

	// ─── Props ─────────────------------------...........

	let { plugin }: { plugin: VaultmanPlugin } = $props();

	// ─── Page navigation ──────────────────────────────────────────────────────

	function initFrameState() {
		return {
			pageOrder: resolveFramePageOrder(plugin.settings.pageOrder),
			overlays: new FrameOverlayController(plugin, ExplorerQueueComp, ExplorerActiveFiltersComp),
		};
	}

	const initialFrameState = initFrameState();
	let pageOrder = $state<string[]>(initialFrameState.pageOrder);
	let pageRenderKey = $state(0); // incremented on each reorder to force page content remount
	const pageLabels: Record<string, string> = createFramePageLabels();
	const pageIcons: Record<string, string> = createFramePageIcons();
	const overlays = initialFrameState.overlays;

	// ─── Per-page FAB definitions ────────────────────────────────────────────────

	const pageFabs = $derived.by<Record<string, { left: FabDef | null; right: FabDef | null }>>(() =>
		createFramePageFabs(
			plugin,
			() => overlays.toggleQueueIsland(),
			() => overlays.toggleFiltersIsland(),
		),
	);

	const leftFab = $derived.by<FabDef | null>(() => pageFabs[activePage]?.left ?? null);
	const rightFab = $derived.by<FabDef | null>(() => pageFabs[activePage]?.right ?? null);

	let activePage = $state<string>(initialFrameState.pageOrder[0] ?? 'ops');

	// Use DOM insertion order (pageOrder at mount time) — avoids stale settings mismatch
	let pageIndex = $derived(pageOrder.indexOf(activePage));
	const viewport = new FrameViewportController(() => pageIndex);
	const navReorder = new FrameNavReorderController({
		getPageOrder: () => pageOrder,
		setPageOrder: (order) => {
			pageOrder = order;
		},
		incrementRenderKey: () => {
			pageRenderKey++;
		},
		saveOrder: (order) => {
			plugin.settings.pageOrder = order;
			void plugin.saveSettings();
		},
	});
	function navigateTo(page: string) {
		if (activePage !== page) {
			overlays.closeQueueIsland();
			overlays.closeFiltersIsland();
			if (overlays.activePopup === 'active-filters') overlays.closePopup();
		}
		activePage = page;
		viewport.applyPageTransform(true);
	}

	$effect(() => {
		void pageIndex; // declare dependency
		viewport.applyPageTransform(true);
	});

	$effect(() => {
		if (!pageOrder.includes(activePage)) {
			activePage = pageOrder[0] ?? 'ops';
		}
	});

	// ─── Stats ────────────────────────────────────────────────────────────────

	let selectedCount = $state(0);
	let queuedCount = $state(0);
	let filterRuleCount = $state(0);
	const addOpCount = $derived.by(() => {
		const ids = new Set<string>();
		for (const vfs of plugin.queueService.listTransactions()) {
			for (const op of vfs.ops) {
				if (op.action === 'add') ids.add(op.changeId ?? op.id);
			}
		}
		return ids.size;
	});

	function updateStats() {
		queuedCount = plugin.queueService.logicalOpCount;
		filterRuleCount = countFilterLeaves(plugin.filterService.activeFilter);
	}

	let fileList = $state<explorerFiles | undefined>(undefined);
	let propExplorer = $state<explorerProps | undefined>(undefined);
	let tagsExplorer = $state<explorerTags>();
	let selectedFilePaths = $state(new Set<string>());

	// ─── Filters page state ──────────────────────────────────────────────────
	type FiltersTab = 'tags' | 'props' | 'files' | 'content';
	let filtersActiveTab = $state<FiltersTab>('props');
	$effect(() => {
		void filtersActiveTab;
		untrack(() => {
			overlays.closeQueueIsland();
			overlays.closeFiltersIsland();
		});
	});
	let filtersSearch = $state('');
	let filtersSearchCategory = $state<Record<'tags' | 'props' | 'files', number>>({
		tags: 0,
		props: 0,
		files: 0,
	});
	let filtersSortBy = $state('name');
	let filtersSortDir = $state<'asc' | 'desc'>('asc');
	let filtersViewMode = $state<any>('tree');
	let addMode = $state(false);

	$effect(() => {
		const term = filtersSearch;
		const tab = filtersActiveTab;
		const catMode = filtersSearchCategory[tab as 'tags' | 'props' | 'files'] ?? 0;

		// Route search with per-tab category scoping
		switch (tab) {
			case 'props':
				propExplorer?.setSearchTerm(term);
				break;
			case 'tags':
				tagsExplorer?.setSearchTerm(term, catMode === 0 ? 'all' : 'leaf');
				break;
			case 'files':
				if (catMode === 0) {
					fileList?.setSearchFilter(term, '');
				} else {
					fileList?.setSearchFilter('', term);
				}
				break;
		}
	});

	// ─── Refresh ─────────────────────────────────────────────────────────────

	function refreshFiles() {
		updateStats();
	}

	function refreshActiveFilterHighlights(): void {
		const props = new Set<string>();
		const vals = new Map<string, Set<string>>();
		function walk(node: import('../../types/typeFilter').FilterNode): void {
			if (node.type === 'rule') {
				if (node.property) {
					props.add(node.property);
					if (node.values && node.values.length > 0) {
						if (!vals.has(node.property)) vals.set(node.property, new Set());
						node.values.forEach((v) => vals.get(node.property!)!.add(v));
					}
				}
			} else if (node.type === 'group') {
				node.children.forEach(walk);
			}
		}
		walk(plugin.filterService.activeFilter);
		// PropsExplorerPanel computes active filter highlights internally on render
		void props;
		void vals;
	}

	function refreshQueue() {
		updateStats();
	}

	// ─── Scope popup ──────────────────────────────────────────────────────────
	// TODO: where this icons are showed?
	const scopeOptions = [
		{
			value: 'all',
			label: translate('scope.all'),
			icon: 'lucide-database',
		},
		{
			value: 'filtered',
			label: translate('scope.filtered'),
			icon: 'lucide-filter',
		},
		{
			value: 'selected',
			label: translate('scope.selected'),
			icon: 'lucide-check-square',
		},
	];

	function setScope(value: string) {
		plugin.settings.explorerOperationScope = value as 'auto' | 'selected' | 'filtered' | 'all';
		void plugin.saveSettings();
		overlays.closePopup();
	}

	// ─── Search popup ─────────────────────────────────────────────────────────

	let searchName = $state('');
	let searchFolder = $state('');

	$effect(() => {
		fileList?.setSearchFilter(searchName, searchFolder);
		plugin.filterService.setSearchFilter(searchName, searchFolder);
	});

	// ─── Filters page state (bound to FiltersPage component) ─────────────────

	// ─── Active Filters popup state ───────────────────────────────────────────

	let activeFilterRules = $state<ActiveFilterRule[]>([]);

	function refreshActiveFiltersPopup(): void {
		activeFilterRules = collectActiveFilterRules(plugin.filterService.activeFilter);
	}

	function toggleFilterRule(rule: ActiveFilterRule): void {
		if (rule.node.id) {
			plugin.filterService.toggleFilterRule(rule.node.id);
		}
		refreshActiveFiltersPopup();
	}

	function deleteFilterRule(rule: ActiveFilterRule): void {
		plugin.filterService.removeNode(rule.node, rule.parent);
		refreshActiveFiltersPopup();
		updateStats();
	}

	// ─── Scope popup ──────────────────────────────────────────────────────────

	// ─── Move popup ───────────────────────────────────────────────────────────

	let moveTargetFiles = $state<import('obsidian').TFile[]>([]);
	let moveTargetFolder = $state('');

	const movePreviews = $derived.by(() => createMovePreviews(moveTargetFiles, moveTargetFolder));

	function queueMoves() {
		const changes = createMoveChanges(moveTargetFiles, moveTargetFolder);
		void plugin.queueService.addBatch(changes);
		overlays.closePopup();
	}

	function attachFolderSuggest(el: HTMLElement) {
		const suggest = new FolderSuggest(plugin.app, el as HTMLInputElement, (path: string) => {
			moveTargetFolder = path;
			(el as HTMLInputElement).value = path;
		});
		return {
			destroy() {
				suggest.close();
			},
		};
	}

	// ─── Icon action (Svelte action wrapping Obsidian setIcon) ────────────────

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(newName: string) {
				setIcon(el, newName);
			},
		};
	}

	// ─── Refresh active filters popup when it becomes visible ────────────────

	$effect(() => {
		if (overlays.activePopup === 'active-filters' && overlays.popupOpen) {
			refreshActiveFiltersPopup();
		}
	});

	// ─── Lifecycle ────────────────────────────────────────────────────────────

	onMount(() => {
		const onFilterChanged = () => {
			refreshFiles();
			refreshActiveFilterHighlights();
			updateStats();
		};
		const onVaultResolved = () => {
			refreshFiles();
		};
		const onQueueChanged = () => {
			refreshQueue();
			if (plugin.queueService.isEmpty && plugin.overlayState.isOpen('queue')) {
				overlays.closeQueueIsland();
			}
		};

		const unsubFilter = plugin.filterService.subscribe(onFilterChanged);
		plugin.queueService.on('changed', onQueueChanged);

		refreshFiles();
		refreshQueue();

		// Re-render file list + prop browser when vault finishes indexing
		plugin.app.metadataCache.on('resolved', onVaultResolved);

		return () => {
			unsubFilter();
			plugin.queueService.off('changed', onQueueChanged);
			plugin.app.metadataCache.off('resolved', onVaultResolved);
		};
	});
</script>

<!-- ─── Page container (horizontal slide strip) ────────────────────────────── -->
<!-- vm-pages-viewport clips via overflow:hidden; the container slides inside it -->
<div class="vm-view" use:navReorder.bindViewRoot>
	<div class="vm-pages-viewport" use:viewport.bindViewport>
		<div
			class="vm-page-container"
			use:viewport.bindContainer
			ontransitionend={viewport.onContainerTransitionEnd}
		>
			{#each pageOrder as pageId (pageId)}
				<div class="vm-page" data-page={pageId}>
					{#key pageRenderKey}
						{#if pageId === 'ops'}
							<OperationsPage {plugin} {icon} />
						{:else if pageId === 'statistics'}
							<StatisticsPage {plugin} />
						{:else if pageId === 'filters'}
							<FiltersPage
								{plugin}
								bind:filtersActiveTab
								bind:filtersSearch
								bind:filtersSearchCategory
								bind:tagsExplorer
								bind:propExplorer
								bind:fileList
								bind:selectedCount
								bind:selectedFilePaths
								bind:filtersSortBy
								bind:filtersSortDir
								bind:filtersViewMode
								bind:addMode
								{addOpCount}
							/>
						{/if}
					{/key}
				</div>
			{/each}
		</div>

		<!-- ─── Island Backdrop (Rising Glass) ─────────────────────────────────── -->
		<div
			class="vm-island-backdrop vm-glass"
			class:is-open={overlays.isIslandOpen}
			class:has-blur={plugin.settings.islandBackdropBlur}
			class:is-dismissable={plugin.settings.islandDismissOnOutsideClick}
			onclick={() => {
				if (plugin.settings.islandDismissOnOutsideClick) {
					overlays.closeQueueIsland();
					overlays.closeFiltersIsland();
				}
			}}
			onkeydown={(e) => {
				if (
					plugin.settings.islandDismissOnOutsideClick &&
					(e.key === 'Escape' || e.key === 'Enter')
				) {
					overlays.closeQueueIsland();
					overlays.closeFiltersIsland();
				}
			}}
			role="button"
			tabindex="-1"
			aria-label="Close island"
		></div>

		<PopupIsland overlayState={plugin.overlayState} />

		<BottomNav
			{pageOrder}
			{activePage}
			{pageLabels}
			{pageIcons}
			{leftFab}
			{rightFab}
			navCollapsed={navReorder.navCollapsed}
			isIslandOpen={overlays.isIslandOpen}
			bind:isReordering={navReorder.isReordering}
			reorderTargetIdx={navReorder.reorderTargetIdx}
			bind:pillEl={navReorder.pillEl}
			{selectedCount}
			{filterRuleCount}
			{queuedCount}
			bindNav={navReorder.bindNav}
			onCollapsedNavClick={navReorder.onCollapsedNavClick}
			onNavIconPointerDown={navReorder.onNavIconPointerDown}
			onPillPointerMove={navReorder.onPillPointerMove}
			onPillPointerUp={navReorder.onPillPointerUp}
			exitReorder={navReorder.exitReorder}
			{navigateTo}
			{icon}
		/>
	</div>
</div>

<PopupOverlay
	{plugin}
	activePopup={overlays.activePopup}
	popupOpen={overlays.popupOpen}
	closePopup={() => overlays.closePopup()}
	{activeFilterRules}
	{refreshActiveFiltersPopup}
	{updateStats}
	{toggleFilterRule}
	{deleteFilterRule}
	{scopeOptions}
	{setScope}
	bind:searchName
	bind:searchFolder
	{moveTargetFiles}
	bind:moveTargetFolder
	{movePreviews}
	{attachFolderSuggest}
	{queueMoves}
	{icon}
/>
