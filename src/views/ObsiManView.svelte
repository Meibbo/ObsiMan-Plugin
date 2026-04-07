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
		return ['ops', 'files', 'filters'];
	}

	let pageOrder = $state(resolvedPageOrder());
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

	// ─── Navbar long-press reorder ────────────────────────────────────────────

	let isReordering = $state(false);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let dragSourceIdx = -1;

	function startLongPress() {
		longPressTimer = setTimeout(() => { isReordering = true; }, 2000);
	}

	function cancelLongPress() {
		if (longPressTimer !== null) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function onNavDragStart(e: DragEvent, idx: number) {
		e.stopPropagation();
		dragSourceIdx = idx;
		e.dataTransfer?.setData('text/plain', String(idx));
	}

	function onNavDrop(targetIdx: number) {
		if (dragSourceIdx < 0 || dragSourceIdx === targetIdx) {
			isReordering = false;
			dragSourceIdx = -1;
			return;
		}
		const order = [...pageOrder];
		const [moved] = order.splice(dragSourceIdx, 1);
		order.splice(targetIdx, 0, moved);
		pageOrder = order;
		plugin.settings.pageOrder = order;
		void plugin.saveSettings();
		dragSourceIdx = -1;
		isReordering = false;
	}

	function exitReorder() {
		isReordering = false;
		dragSourceIdx = -1;
		cancelLongPress();
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

	let fileList: FileListComponent | undefined;
	let filterTree: FilterTreeComponent | undefined;
	let queueList: QueueListComponent | undefined;
	let popupFilterTree: FilterTreeComponent | undefined;

	// ─── Actions for native components ────────────────────────────────────────

	function initFileList(node: HTMLElement) {
		fileList = new FileListComponent(node, plugin.app, () => {});
		refreshFiles();
		return {
			destroy() { fileList = undefined; }
		};
	}

	function initFilterTree(node: HTMLElement) {
		filterTree = new FilterTreeComponent(node, (n: unknown, parentNode: unknown) => {
			plugin.filterService.removeNode(n, parentNode);
			refreshFilterTree();
			updateStats();
		});
		refreshFilterTree();
		return {
			destroy() { filterTree = undefined; }
		};
	}

	function initQueueList(node: HTMLElement) {
		queueList = new QueueListComponent(node, {
			onRemove: (index: number) => { plugin.queueService.remove(index); },
		});
		refreshQueue();
		return {
			destroy() { queueList = undefined; }
		};
	}

	function initPopupFilterTree(node: HTMLElement) {
		popupFilterTree = new FilterTreeComponent(node, (n: unknown, parentNode: unknown) => {
			plugin.filterService.removeNode(n, parentNode);
			popupFilterTree?.render(plugin.filterService.activeFilter);
			updateStats();
		});
		if (activePopup === 'active-filters') {
			popupFilterTree.render(plugin.filterService.activeFilter);
		}
		return {
			destroy() { popupFilterTree = undefined; }
		};
	}

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

		const onFilterChanged = () => {
			refreshFiles();
			refreshFilterTree();
			updateStats();
			if (activePopup === 'active-filters') {
				popupFilterTree?.render(plugin.filterService.activeFilter);
			}
		};
		const onQueueChanged = () => { refreshQueue(); };

		plugin.filterService.on('changed', onFilterChanged);
		plugin.queueService.on('changed', onQueueChanged);

		refreshFiles();
		refreshFilterTree();
		refreshQueue();

		// Re-render file list when vault finishes indexing (PropertyIndexService has no events)
		const onResolved = () => { refreshFiles(); };
		plugin.app.metadataCache.on('resolved', onResolved);

		return () => {
			plugin.filterService.off('changed', onFilterChanged);
			plugin.queueService.off('changed', onQueueChanged);
			plugin.app.metadataCache.off('resolved', onResolved);
		};
	});
</script>

<!-- ─── Header ─────────────────────────────────────────────────────────────── -->
<div class="obsiman-view-header">
	<span class="obsiman-view-title">{t('plugin.name')}</span>
</div>

<!-- ─── Page container (horizontal slide strip) ────────────────────────────── -->
<div
	class="obsiman-page-container"
	class:is-animating={isAnimating}
	style:--page-index={pageIndex}
	ontransitionend={onContainerTransitionEnd}
>
	{#each pageOrder as pageId (pageId)}
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
				<div class="obsiman-file-list-container" use:initFileList></div>

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
				<div class="obsiman-filter-tree" use:initFilterTree></div>

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
						<div class="obsiman-queue-container" use:initQueueList></div>
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
	<!-- Long-press 2s any icon to enter reorder mode, then drag to reorder -->
	<div
		class="obsiman-nav-pill"
		class:is-reordering={isReordering}
		onpointerleave={exitReorder}
	>
		{#each pageOrder as pageId, i}
			<div
				class="obsiman-nav-icon"
				class:is-active={activePage === pageId && !isReordering}
				aria-label={isReordering ? pageLabels[pageId] : (pageLabels[pageId] ?? pageId)}
				draggable={isReordering}
				use:icon={pageIcons[pageId] ?? 'lucide-circle'}
				onpointerdown={startLongPress}
				onpointermove={cancelLongPress}
				onpointerup={cancelLongPress}
				onpointercancel={cancelLongPress}
				ondragstart={(e) => onNavDragStart(e, i)}
				ondragover={(e) => { e.preventDefault(); e.stopPropagation(); }}
				ondrop={(e) => { e.preventDefault(); e.stopPropagation(); onNavDrop(i); }}
				ondragend={exitReorder}
				onclick={() => { if (!isReordering) navigateTo(pageId); }}
				role="tab"
				tabindex="0"
			>
				{#if !isReordering && pageId === 'filters' && filterRuleCount > 0}
					<div class="obsiman-nav-dot-badge">{filterRuleCount}</div>
				{/if}
				{#if !isReordering && pageId === 'ops' && queuedCount > 0}
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
			<div class="obsiman-filter-tree obsiman-popup-filter-tree" use:initPopupFilterTree></div>
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
