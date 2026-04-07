<script lang="ts">
	import { onMount } from 'svelte';
	import { setIcon } from 'obsidian';
	import type { ObsiManPlugin } from '../../main';
	import { FileListComponent } from '../components/FileListComponent';
	import { FilterTreeComponent } from '../components/FilterTreeComponent';
	import { QueueListComponent } from '../components/QueueListComponent';
	import { AddFilterModal } from '../modals/AddFilterModal';
	import { QueueDetailsModal } from '../modals/QueueDetailsModal';
	import { LinterModal } from '../modals/LinterModal';
	import { FileRenameModal } from '../modals/FileRenameModal';
	import { SaveTemplateModal } from '../modals/SaveTemplateModal';
	import { PropertyManagerModal } from '../modals/PropertyManagerModal';
	import { t } from '../i18n/index';
	import { OBSIMAN_EXPLORER_VIEW_TYPE } from './ObsiManExplorerView';

	type PopupType = 'active-filters' | 'scope' | 'view-mode' | 'search';
	type OpsTab = 'fileops' | 'linter' | 'template' | 'content';

	// ─── Props ────────────────────────────────────────────────────────────────

	let { plugin }: { plugin: ObsiManPlugin } = $props();

	// ─── Page navigation ──────────────────────────────────────────────────────

	function resolvedPageOrder(): string[] {
		const order = plugin.settings.pageOrder as string[] | undefined;
		const valid = ['files', 'filters', 'ops'];
		if (Array.isArray(order) && order.length === 3 && valid.every((p) => order.includes(p))) {
			return order;
		}
		return ['files', 'filters', 'ops'];
	}

	const pageOrder = resolvedPageOrder();
	const pageLabels: Record<string, string> = {
		files: t('nav.files'),
		filters: t('nav.filters'),
		ops: t('nav.ops'),
	};

	const pageIcons: Record<string, string> = {
		files: 'lucide-files',
		filters: 'lucide-filter',
		ops: 'lucide-settings-2',
	};

	// ─── Per-page FAB definitions ────────────────────────────────────────────────
	// Files always gets BOTH FABs. Other pages get ONE FAB on their outer edge:
	// leftmost page (index 0) → LEFT FAB; rightmost page (last index) → RIGHT FAB.

	type FabDef = { icon: string; label: string; action: () => void };

	const pageFabDef: Record<string, FabDef> = {
		ops: {
			icon: 'lucide-list-checks',
			label: t('ops.queue'),
			action: () => { new QueueDetailsModal(plugin.app, plugin.queueService).open(); },
		},
		filters: {
			icon: 'lucide-filter',
			label: t('filters.active'),
			action: () => showPopup('active-filters'),
		},
	};

	const leftFab = $derived.by<FabDef | null>(() => {
		if (activePage === 'files') return { icon: 'lucide-layout-grid', label: t('nav.view_mode'), action: () => showPopup('view-mode') };
		if (pageIndex === 0) return pageFabDef[activePage] ?? null;
		return null;
	});

	const rightFab = $derived.by<FabDef | null>(() => {
		if (activePage === 'files') return { icon: 'lucide-search', label: t('nav.search_files'), action: () => showPopup('search') };
		if (pageIndex === pageOrder.length - 1) return pageFabDef[activePage] ?? null;
		return null;
	});

	let activePage = $state(pageOrder[0]);
	let isAnimating = $state(false);
	// Use DOM insertion order (pageOrder at mount time) — avoids stale settings mismatch
	let pageIndex = $derived(pageOrder.indexOf(activePage));

	function navigateTo(page: string) {
		isAnimating = true;
		activePage = page;
	}

	function onContainerTransitionEnd(e: TransitionEvent) {
		// Guard against child element transitions bubbling up
		if (e.target === e.currentTarget && e.propertyName === 'transform') {
			isAnimating = false;
		}
	}

	// ─── Popup ────────────────────────────────────────────────────────────────

	let activePopup = $state<PopupType | null>(null);
	let popupOpen = $state(false);

	function showPopup(type: PopupType) {
		activePopup = type;
		// Next frame so CSS transition fires after is-hidden is removed
		requestAnimationFrame(() => { popupOpen = true; });
	}

	function closePopup() {
		popupOpen = false;
		// Wait for the 0.3s spring transition before clearing content
		setTimeout(() => { activePopup = null; }, 320);
	}

	// ─── Ops sub-tabs ─────────────────────────────────────────────────────────

	let opsTab = $state<OpsTab>('fileops');

	const opsTabs: Array<{ id: OpsTab; label: string }> = [
		{ id: 'fileops', label: t('ops.tab.fileops') },
		{ id: 'linter', label: t('ops.tab.linter_short') },
		{ id: 'template', label: t('ops.tab.template_short') },
		{ id: 'content', label: t('ops.tab.content_short') },
	];

	// ─── Stats ────────────────────────────────────────────────────────────────

	let totalFiles = $state(0);
	let filteredCount = $state(0);
	let selectedCount = $state(0);
	let queuedCount = $state(0);
	let filterRuleCount = $state(0);

	let statsText = $derived.by(() => {
		let s = `${totalFiles} files · ${filteredCount} filtered`;
		if (selectedCount > 0) s += ` · ${selectedCount} selected`;
		if (queuedCount > 0) s += ` · ${queuedCount} pending`;
		return s;
	});

	function updateStats() {
		totalFiles = plugin.propertyIndex.fileCount;
		filteredCount = plugin.filterService.filteredFiles.length;
		selectedCount = plugin.basesInjector?.selectedPaths?.size ?? 0;
		queuedCount = plugin.queueService.queue.length;
		filterRuleCount = plugin.filterService.activeFilter?.children?.length ?? 0;
	}

	// ─── Native component refs ────────────────────────────────────────────────

	let fileListEl: HTMLElement;
	let filterTreeEl: HTMLElement;
	let queueListEl: HTMLElement;
	let popupFilterTreeEl: HTMLElement;

	let fileList: FileListComponent;
	let filterTree: FilterTreeComponent;
	let queueList: QueueListComponent;
	let popupFilterTree: FilterTreeComponent;

	// ─── Refresh ─────────────────────────────────────────────────────────────

	function refreshFiles() {
		fileList?.render(plugin.filterService.filteredFiles, plugin.propertyIndex.fileCount);
		updateStats();
	}

	function refreshFilterTree() {
		filterTree?.render(plugin.filterService.activeFilter);
	}

	function refreshQueue() {
		queueList?.render(plugin.queueService.queue);
		updateStats();
	}

	// ─── Modals ───────────────────────────────────────────────────────────────

	function openAddFilterModal() {
		new AddFilterModal(
			plugin.app,
			plugin.propertyIndex.getPropertyNames(),
			(prop: string) => plugin.propertyIndex.getPropertyValues(prop),
			(node: unknown) => {
				plugin.filterService.addNode(node);
				refreshFilterTree();
				updateStats();
			}
		).open();
	}

	function openFileRename() {
		const selected = fileList?.getSelectedFiles() ?? [];
		const targets = selected.length > 0 ? selected : plugin.filterService.filteredFiles;
		new FileRenameModal(plugin.app, plugin.propertyIndex, targets, (change: unknown) =>
			plugin.queueService.add(change)
		).open();
	}

	function openPropertyManager() {
		const selected = fileList?.getSelectedFiles() ?? [];
		const targets = selected.length > 0 ? selected : plugin.filterService.filteredFiles;
		new PropertyManagerModal(
			plugin.app,
			plugin.propertyIndex,
			targets,
			(change: unknown) => plugin.queueService.add(change)
		).open();
	}

	function openLinter() {
		const selected = fileList?.getSelectedFiles() ?? [];
		const targets = selected.length > 0 ? selected : plugin.filterService.filteredFiles;
		new LinterModal(plugin.app, plugin.propertyIndex, targets).open();
	}

	async function openMainView() {
		const { workspace } = plugin.app;
		const leaves = workspace.getLeavesOfType(OBSIMAN_EXPLORER_VIEW_TYPE);
		if (leaves.length > 0) {
			await workspace.revealLeaf(leaves[0]);
			return;
		}
		const leaf = workspace.getLeaf('split');
		await leaf.setViewState({ type: OBSIMAN_EXPLORER_VIEW_TYPE, active: true });
		await workspace.revealLeaf(leaf);
	}

	// ─── Scope popup ──────────────────────────────────────────────────────────

	const scopeOptions = [
		{ value: 'all', label: t('scope.all'), icon: 'lucide-database' },
		{ value: 'filtered', label: t('scope.filtered'), icon: 'lucide-filter' },
		{ value: 'selected', label: t('scope.selected'), icon: 'lucide-check-square' },
	];

	function setScope(value: string) {
		plugin.settings.explorerOperationScope = value as 'auto' | 'selected' | 'filtered' | 'all';
		void plugin.saveSettings();
		closePopup();
	}

	// ─── View mode popup ──────────────────────────────────────────────────────

	function setViewMode(mode: 'list' | 'selected') {
		plugin.settings.viewMode = mode;
		void plugin.saveSettings();
		if (mode === 'selected') {
			fileList?.showSelectedOnly(true);
		} else {
			fileList?.showSelectedOnly(false);
		}
		closePopup();
	}

	// ─── Search popup ─────────────────────────────────────────────────────────

	let searchName = $state('');
	let searchFolder = $state('');

	$effect(() => {
		fileList?.setSearchFilter(searchName, searchFolder);
	});

	// ─── Icon action (Svelte action wrapping Obsidian setIcon) ────────────────

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(newName: string) { setIcon(el, newName); },
		};
	}

	// ─── Re-render popup filter tree when it becomes visible ──────────────────

	$effect(() => {
		if (activePopup === 'active-filters' && popupOpen) {
			popupFilterTree?.render(plugin.filterService.activeFilter);
		}
	});

	// ─── Lifecycle ────────────────────────────────────────────────────────────

	onMount(() => {
		fileList = new FileListComponent(fileListEl, plugin.app, () => {});

		filterTree = new FilterTreeComponent(filterTreeEl, (node: unknown, parentNode: unknown) => {
			plugin.filterService.removeNode(node, parentNode);
			refreshFilterTree();
			updateStats();
		});

		queueList = new QueueListComponent(queueListEl, {
			onRemove: (index: number) => { plugin.queueService.remove(index); },
		});

		popupFilterTree = new FilterTreeComponent(popupFilterTreeEl, (node: unknown, parentNode: unknown) => {
			plugin.filterService.removeNode(node, parentNode);
			popupFilterTree.render(plugin.filterService.activeFilter);
			updateStats();
		});

		const onFilterChanged = () => {
			refreshFiles();
			refreshFilterTree();
			updateStats();
			if (activePopup === 'active-filters') {
				popupFilterTree.render(plugin.filterService.activeFilter);
			}
		};
		const onQueueChanged = () => { refreshQueue(); };

		plugin.filterService.on('changed', onFilterChanged);
		plugin.queueService.on('changed', onQueueChanged);

		refreshFiles();
		refreshQueue();

		return () => {
			plugin.filterService.off('changed', onFilterChanged);
			plugin.queueService.off('changed', onQueueChanged);
		};
	});
</script>

<!-- ─── Header ─────────────────────────────────────────────────────────────── -->
<div class="obsiman-view-header">
	<span class="obsiman-view-title">{t('plugin.name')}</span>
	<div
		class="obsiman-view-expand clickable-icon"
		aria-label={t('nav.expand')}
		use:icon={'lucide-expand'}
		onclick={() => void openMainView()}
		role="button"
		tabindex="0"
	></div>
</div>

<!-- ─── Page container (horizontal slide strip) ────────────────────────────── -->
<div
	class="obsiman-page-container"
	class:is-animating={isAnimating}
	style:--page-index={pageIndex}
	ontransitionend={onContainerTransitionEnd}
>
	{#each pageOrder as pageId}
		<div class="obsiman-page" data-page={pageId}>

			<!-- FILES PAGE -->
			{#if pageId === 'files'}
				<div class="obsiman-files-topbar">
					<div class="obsiman-sidebar-stats">{statsText}</div>
				</div>
				<div class="obsiman-files-toggle-row">
					<input
						type="checkbox"
						id="obsiman-toggle-all"
						onchange={(e) => {
							const cb = e.target as HTMLInputElement;
							if (cb.checked) fileList?.selectAll();
							else fileList?.deselectAll();
						}}
					/>
					<label for="obsiman-toggle-all">{t('files.select_all')}</label>
				</div>
				<div class="obsiman-file-list-container" bind:this={fileListEl}></div>

			<!-- FILTERS PAGE -->
			{:else if pageId === 'filters'}
				<div class="obsiman-filter-buttons">
					<button class="obsiman-btn" onclick={openAddFilterModal}>{t('filter.add_rule')}</button>
					<button class="obsiman-btn" onclick={() => {
						plugin.filterService.clearFilters();
						refreshFilterTree();
						updateStats();
					}}>{t('filter.clear')}</button>
					<button class="obsiman-btn" onclick={() =>
						new SaveTemplateModal(plugin.app, plugin, plugin.filterService.activeFilter).open()
					}>{t('filter.template.save')}</button>
				</div>
				<div class="obsiman-filter-tree" bind:this={filterTreeEl}></div>

			<!-- OPS PAGE -->
			{:else if pageId === 'ops'}
				<div class="obsiman-subtab-bar">
					{#each opsTabs as tab}
						<div
							class="obsiman-subtab"
							class:is-active={opsTab === tab.id}
							data-tab={tab.id}
							onclick={() => { opsTab = tab.id; }}
							role="tab"
							tabindex="0"
						>
							<span>{tab.label}</span>
						</div>
					{/each}
				</div>

				<div class="obsiman-subtab-area">
					<!-- File Ops tab (always in DOM so QueueListComponent persists) -->
					<div class="obsiman-subtab-content" class:is-active={opsTab === 'fileops'}>
						<div class="obsiman-ops-buttons">
							<button class="obsiman-btn" onclick={openFileRename}>
								<span class="obsiman-btn-icon" use:icon={'lucide-pencil'}></span>
								{t('ops.rename')}
							</button>
							<button class="obsiman-btn" onclick={openPropertyManager}>
								<span class="obsiman-btn-icon" use:icon={'lucide-plus'}></span>
								{t('ops.add_property')}
							</button>
						</div>
						<div class="obsiman-queue-container" bind:this={queueListEl}></div>
						<div class="obsiman-queue-actions">
							<button class="obsiman-btn mod-cta" onclick={() => {
								if (!plugin.queueService.isEmpty)
									new QueueDetailsModal(plugin.app, plugin.queueService).open();
							}}>{t('ops.apply')}</button>
							<button class="obsiman-btn" onclick={() => plugin.queueService.clear()}>
								{t('ops.clear')}
							</button>
						</div>
					</div>

					<!-- Linter tab (always in DOM) -->
					<div class="obsiman-subtab-content" class:is-active={opsTab === 'linter'}>
						<div class="obsiman-linter-desc">{t('ops.linter.desc')}</div>
						<button class="obsiman-btn mod-cta" onclick={openLinter}>{t('ops.linter.run')}</button>
					</div>

					<!-- Template tab -->
					<div class="obsiman-subtab-content" class:is-active={opsTab === 'template'}>
						<div class="obsiman-coming-soon">{t('ops.coming_soon')}</div>
					</div>

					<!-- Content tab -->
					<div class="obsiman-subtab-content" class:is-active={opsTab === 'content'}>
						<div class="obsiman-coming-soon">{t('ops.coming_soon')}</div>
					</div>
				</div>
			{/if}

		</div>
	{/each}
</div>

<!-- ─── Bottom nav: [FAB?] [icon pill] [FAB?] ─────────────────────────────── -->
<!-- Files always gets both FABs. Other pages get ONE FAB on their outer edge. -->
<div class="obsiman-bottom-nav">
	{#if leftFab}
		<div
			class="obsiman-nav-fab"
			aria-label={leftFab.label}
			use:icon={leftFab.icon}
			onclick={leftFab.action}
			role="button"
			tabindex="0"
		></div>
	{:else}
		<div class="obsiman-nav-fab-placeholder"></div>
	{/if}

	<!-- Center: frosted glass pill with page icons -->
	<div class="obsiman-nav-pill">
		{#each pageOrder as pageId}
			<div
				class="obsiman-nav-icon"
				class:is-active={activePage === pageId}
				aria-label={pageLabels[pageId] ?? pageId}
				use:icon={pageIcons[pageId] ?? 'lucide-circle'}
				onclick={() => navigateTo(pageId)}
				role="tab"
				tabindex="0"
			>
				{#if pageId === 'filters' && filterRuleCount > 0}
					<div class="obsiman-nav-dot-badge">{filterRuleCount}</div>
				{/if}
				{#if pageId === 'ops' && queuedCount > 0}
					<div class="obsiman-nav-dot-badge">{queuedCount}</div>
				{/if}
			</div>
		{/each}
	</div>

	{#if rightFab}
		<div
			class="obsiman-nav-fab"
			aria-label={rightFab.label}
			use:icon={rightFab.icon}
			onclick={rightFab.action}
			role="button"
			tabindex="0"
		></div>
	{:else}
		<div class="obsiman-nav-fab-placeholder"></div>
	{/if}
</div>

<!-- ─── Popup overlay (always in DOM, shown/hidden via CSS) ────────────────── -->
<div
	class="obsiman-popup-overlay"
	class:is-hidden={activePopup === null}
	class:is-open={popupOpen}
	onclick={(e) => { if (e.target === e.currentTarget) closePopup(); }}
	role="dialog"
	aria-modal="true"
>
	<div class="obsiman-popup-content">

		<!-- Active Filters popup -->
		<div hidden={activePopup !== 'active-filters'}>
			<div class="obsiman-popup-header">
				<span class="obsiman-popup-title">{t('filters.active')}</span>
				<div class="clickable-icon" aria-label="Close" use:icon={'lucide-x'} onclick={closePopup} role="button" tabindex="0"></div>
			</div>
			<div class="obsiman-filter-tree obsiman-popup-filter-tree" bind:this={popupFilterTreeEl}></div>
			<div class="obsiman-popup-actions">
				<button class="obsiman-btn" onclick={() => {
					plugin.filterService.clearFilters();
					updateStats();
					closePopup();
				}}>{t('filter.clear')}</button>
				<button class="obsiman-btn mod-cta" onclick={() => { closePopup(); openAddFilterModal(); }}>
					{t('filter.add_rule')}
				</button>
			</div>
		</div>

		<!-- Scope popup -->
		<div hidden={activePopup !== 'scope'}>
			<div class="obsiman-popup-header">
				<span class="obsiman-popup-title">{t('scope.title')}</span>
				<div class="clickable-icon" aria-label="Close" use:icon={'lucide-x'} onclick={closePopup} role="button" tabindex="0"></div>
			</div>
			<div class="obsiman-scope-list">
				{#each scopeOptions as opt}
					<div
						class="obsiman-scope-item"
						class:is-active={plugin.settings.explorerOperationScope === opt.value}
						onclick={() => setScope(opt.value)}
						role="option"
						aria-selected={plugin.settings.explorerOperationScope === opt.value}
						tabindex="0"
					>
						<div class="obsiman-scope-icon" use:icon={opt.icon}></div>
						<span>{opt.label}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- View mode popup -->
		<div hidden={activePopup !== 'view-mode'}>
			<div class="obsiman-popup-header">
				<span class="obsiman-popup-title">{t('nav.view_mode')}</span>
				<div class="clickable-icon" aria-label="Close" use:icon={'lucide-x'} onclick={closePopup} role="button" tabindex="0"></div>
			</div>
			<div class="obsiman-view-mode-list">
				<div
					class="obsiman-scope-item"
					class:is-active={plugin.settings.viewMode !== 'selected'}
					onclick={() => setViewMode('list')}
					role="option"
					aria-selected={plugin.settings.viewMode !== 'selected'}
					tabindex="0"
				>
					<div class="obsiman-scope-icon" use:icon={'lucide-list'}></div>
					<span>{t('view.mode.list')}</span>
				</div>
				<div
					class="obsiman-scope-item"
					class:is-active={plugin.settings.viewMode === 'selected'}
					onclick={() => setViewMode('selected')}
					role="option"
					aria-selected={plugin.settings.viewMode === 'selected'}
					tabindex="0"
				>
					<div class="obsiman-scope-icon" use:icon={'lucide-check-square'}></div>
					<span>{t('view.mode.selected')}</span>
				</div>
				<div class="obsiman-scope-item is-disabled" aria-disabled="true">
					<div class="obsiman-scope-icon" use:icon={'lucide-table'}></div>
					<span>{t('view.mode.prop_columns')}</span>
					<span class="obsiman-coming-soon-badge">{t('ops.coming_soon')}</span>
				</div>
			</div>
		</div>

		<!-- Search popup -->
		<div hidden={activePopup !== 'search'}>
			<div class="obsiman-popup-header">
				<span class="obsiman-popup-title">{t('nav.search_files')}</span>
				<div class="clickable-icon" aria-label="Close" use:icon={'lucide-x'} onclick={closePopup} role="button" tabindex="0"></div>
			</div>
			<div class="obsiman-search-fields">
				<input
					class="obsiman-search-input"
					type="text"
					placeholder={t('search.name_placeholder')}
					bind:value={searchName}
				/>
				<input
					class="obsiman-search-input"
					type="text"
					placeholder={t('search.folder_placeholder')}
					bind:value={searchFolder}
				/>
			</div>
		</div>

	</div>
</div>
