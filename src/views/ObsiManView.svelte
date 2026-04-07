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
	import { FolderSuggest } from '../utils/autocomplete';
	import { MOVE_FILE, FIND_REPLACE_CONTENT } from '../types/operation';
	import type { PendingChange } from '../types/operation';
	import { FileRenameModal } from '../modals/FileRenameModal';
	import { SaveTemplateModal } from '../modals/SaveTemplateModal';
	import { PropertyManagerModal } from '../modals/PropertyManagerModal';
	import { t } from '../i18n/index';
type PopupType = 'active-filters' | 'scope' | 'view-mode' | 'search' | 'move';
	type OpsTab = 'fileops' | 'linter' | 'template' | 'content';
	type ContentSnippet = { before: string; match: string; after: string };
	type ContentPreviewResult = {
		totalMatches: number;
		files: Array<{ file: import('obsidian').TFile; matchCount: number; snippets: ContentSnippet[] }>;
		moreFiles: number;
	};

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

	// ─── Navbar long-press + pointer-based reorder ───────────────────────────
	// Uses pointer events only — HTML5 DnD is avoided because Obsidian's
	// workspace intercepts it and creates tab groups.

	let isReordering = $state(false);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let reorderSourceIdx = -1;
	let reorderTargetIdx = $state(-1);
	let pillEl: HTMLElement | null = null;
	let pendingPointerId = -1;

	function startLongPress(idx: number, pointerId: number) {
		pendingPointerId = pointerId;
		longPressTimer = setTimeout(() => {
			isReordering = true;
			reorderSourceIdx = idx;
			// Capture only now so normal clicks are not blocked
			if (pillEl) pillEl.setPointerCapture(pendingPointerId);
		}, 2000);
	}

	function cancelLongPress() {
		if (longPressTimer !== null) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		pendingPointerId = -1;
	}

	function onNavIconPointerDown(e: PointerEvent, idx: number) {
		startLongPress(idx, e.pointerId);
	}

	function onPillPointerMove(e: PointerEvent) {
		if (!isReordering || reorderSourceIdx < 0 || !pillEl) return;
		// Find which icon the pointer is currently over
		const el = document.elementFromPoint(e.clientX, e.clientY);
		const iconEl = el?.closest?.('.obsiman-nav-icon') as HTMLElement | null;
		if (iconEl && pillEl.contains(iconEl)) {
			const icons = pillEl.querySelectorAll('.obsiman-nav-icon');
			const idx = Array.from(icons).indexOf(iconEl);
			if (idx >= 0 && idx !== reorderSourceIdx) {
				reorderTargetIdx = idx;
			}
		}
	}

	function onPillPointerUp() {
		cancelLongPress();
		if (isReordering && reorderSourceIdx >= 0 && reorderTargetIdx >= 0 && reorderSourceIdx !== reorderTargetIdx) {
			const order = [...pageOrder];
			const [moved] = order.splice(reorderSourceIdx, 1);
			order.splice(reorderTargetIdx, 0, moved);
			pageOrder = order;
			plugin.settings.pageOrder = order;
			void plugin.saveSettings();
		}
		isReordering = false;
		reorderSourceIdx = -1;
		reorderTargetIdx = -1;
	}

	function exitReorder() {
		cancelLongPress();
		isReordering = false;
		reorderSourceIdx = -1;
		reorderTargetIdx = -1;
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

	// ─── Filters sub-tabs ────────────────────────────────────────────────────

	type FiltersTab = 'rules' | 'scope';
	let filtersTab = $state<FiltersTab>('rules');

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

	// ─── Property browser (Filters page Rules tab) ───────────────────────────
	type PropBrowserItem = { name: string; values: string[]; expanded: boolean };
	let propBrowserItems = $state<PropBrowserItem[]>([]);

	function refreshPropBrowser(): void {
		const names = plugin.propertyIndex.getPropertyNames();
		const expandedSet = new Set(propBrowserItems.filter((i) => i.expanded).map((i) => i.name));
		propBrowserItems = names.map((name) => ({
			name,
			values: plugin.propertyIndex.getPropertyValues(name),
			expanded: expandedSet.has(name),
		}));
	}

	function addPropFilter(propName: string): void {
		plugin.filterService.addNode({
			type: 'rule',
			filterType: 'has_property',
			property: propName,
			values: [],
		});
		refreshFilterTree();
		updateStats();
	}

	function addValueFilter(propName: string, value: string): void {
		plugin.filterService.addNode({
			type: 'rule',
			filterType: 'specific_value',
			property: propName,
			values: [value],
		});
		refreshFilterTree();
		updateStats();
	}

	function togglePropExpanded(propName: string): void {
		const item = propBrowserItems.find((i) => i.name === propName);
		if (item) item.expanded = !item.expanded;
	}

	// ─── Content tab — Find & Replace ────────────────────────────────────────

	let contentFind = $state('');
	let contentReplace = $state('');
	let contentCaseSensitive = $state(false);
	let contentIsRegex = $state(false);
	let contentPreviewResult = $state<ContentPreviewResult | null>(null);
	let contentPreviewOpen = $state(false);
	let contentPreviewing = $state(false);
	let contentRegexError = $state('');

	const contentScopeHint = $derived.by(() => {
		if (selectedCount > 0)
			return t('content.scope_hint_selected').replace('{count}', String(selectedCount));
		return t('content.scope_hint_filtered').replace('{count}', String(filteredCount));
	});

	$effect(() => {
		// Reset preview when search params change
		void contentFind; void contentIsRegex; void contentCaseSensitive;
		contentPreviewResult = null;
		contentRegexError = '';
	});

	function buildContentRegex(pattern: string, isRegex: boolean, caseSensitive: boolean): RegExp {
		const flags = 'g' + (caseSensitive ? '' : 'i');
		const escaped = isRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return new RegExp(escaped, flags);
	}

	async function previewContentReplace() {
		if (!contentFind) return;
		contentPreviewing = true;
		contentPreviewResult = null;
		contentRegexError = '';

		let regex: RegExp;
		try {
			regex = buildContentRegex(contentFind, contentIsRegex, contentCaseSensitive);
		} catch {
			contentRegexError = t('content.invalid_regex');
			contentPreviewing = false;
			return;
		}

		const selected = fileList?.getSelectedFiles() ?? [];
		const targets = selected.length > 0 ? selected : [...plugin.filterService.filteredFiles];

		const MAX_FILES = 20;
		const MAX_SNIPPETS = 3;
		const CONTEXT_LEN = 50;

		let totalMatches = 0;
		let matchingFileCount = 0;
		const fileResults: ContentPreviewResult['files'] = [];

		for (const file of targets) {
			const content = await plugin.app.vault.read(file);
			regex.lastIndex = 0;
			const matches = [...content.matchAll(regex)];
			if (matches.length === 0) continue;

			matchingFileCount++;
			totalMatches += matches.length;

			if (fileResults.length < MAX_FILES) {
				const snippets: ContentSnippet[] = matches.slice(0, MAX_SNIPPETS).map((m) => {
					const start = m.index ?? 0;
					const end = start + m[0].length;
					return {
						before: content.slice(Math.max(0, start - CONTEXT_LEN), start),
						match: m[0],
						after: content.slice(end, end + CONTEXT_LEN),
					};
				});
				fileResults.push({ file, matchCount: matches.length, snippets });
			}
		}

		contentPreviewResult = {
			totalMatches,
			files: fileResults,
			moreFiles: Math.max(0, matchingFileCount - MAX_FILES),
		};
		contentPreviewOpen = true;
		contentPreviewing = false;
	}

	function queueContentReplace() {
		if (!contentFind) return;
		contentRegexError = '';

		try {
			buildContentRegex(contentFind, contentIsRegex, contentCaseSensitive);
		} catch {
			contentRegexError = t('content.invalid_regex');
			return;
		}

		const selected = fileList?.getSelectedFiles() ?? [];
		const targets = selected.length > 0 ? selected : [...plugin.filterService.filteredFiles];

		const pattern = contentFind;
		const replacement = contentReplace;
		const isRegex = contentIsRegex;
		const caseSensitive = contentCaseSensitive;

		const change: PendingChange = {
			property: '',
			action: 'find_replace_content',
			details: `Find "${pattern}" → Replace "${replacement}" in ${targets.length} file(s)`,
			files: targets,
			logicFunc: () => ({
				[FIND_REPLACE_CONTENT]: { pattern, replacement, isRegex, caseSensitive },
			}),
			customLogic: true,
		};
		plugin.queueService.add(change);
	}

	// ─── Move popup ───────────────────────────────────────────────────────────

	let moveTargetFiles = $state<import('obsidian').TFile[]>([]);
	let moveTargetFolder = $state('');

	const movePreviews = $derived.by(() => {
		const limit = Math.min(moveTargetFiles.length, 8);
		return moveTargetFiles.slice(0, limit).map((file) => ({
			oldPath: file.path,
			newPath: moveTargetFolder ? `${moveTargetFolder}/${file.name}` : file.name,
		}));
	});

	function openMovePopup() {
		const selected = fileList?.getSelectedFiles() ?? [];
		moveTargetFiles = selected.length > 0 ? selected : [...plugin.filterService.filteredFiles];
		moveTargetFolder = '';
		showPopup('move');
	}

	function queueMoves() {
		const targetFolder = moveTargetFolder;
		// Collect all changes first, then add in one batch (one UI event instead of N)
		const changes: PendingChange[] = [];
		for (const file of moveTargetFiles) {
			const newPath = targetFolder ? `${targetFolder}/${file.name}` : file.name;
			if (newPath === file.path) continue;
			changes.push({
				property: '',
				action: 'move',
				details: `${file.path} → ${newPath}`,
				files: [file],
				logicFunc: () => ({ [MOVE_FILE]: targetFolder }),
				customLogic: true,
			});
		}
		plugin.queueService.addBatch(changes);
		closePopup();
	}

	function attachFolderSuggest(el: HTMLElement) {
		const suggest = new FolderSuggest(plugin.app, el as HTMLInputElement, (path: string) => {
			moveTargetFolder = path;
			(el as HTMLInputElement).value = path;
		});
		return { destroy() { suggest.close(); } };
	}

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
		const onVaultResolved = () => { refreshFiles(); refreshPropBrowser(); };
		const onQueueChanged = () => { refreshQueue(); };

		plugin.filterService.on('changed', onFilterChanged);
		plugin.queueService.on('changed', onQueueChanged);

		refreshFiles();
		refreshFilterTree();
		refreshQueue();
		refreshPropBrowser();

		// Re-render file list + prop browser when vault finishes indexing
		plugin.app.metadataCache.on('resolved', onVaultResolved);

		return () => {
			plugin.filterService.off('changed', onFilterChanged);
			plugin.queueService.off('changed', onQueueChanged);
			plugin.app.metadataCache.off('resolved', onVaultResolved);
		};
	});
</script>

<!-- ─── Header ─────────────────────────────────────────────────────────────── -->
<div class="obsiman-view-header">
	<span class="obsiman-view-title">{t("plugin.name")}</span>
</div>

<!-- ─── Page container (horizontal slide strip) ────────────────────────────── -->
<!-- obsiman-pages-viewport clips via overflow:hidden; the container slides inside it -->
<div class="obsiman-pages-viewport">
	<div
		class="obsiman-page-container"
		class:is-animating={isAnimating}
		style:--page-index={pageIndex}
		ontransitionend={onContainerTransitionEnd}
	>
		{#each pageOrder as pageId (pageId)}
			<div class="obsiman-page" data-page={pageId}>
				<!-- FILES PAGE -->
				{#if pageId === "files"}
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
						<label for="obsiman-toggle-all"
							>{t("files.select_all")}</label
						>
					</div>
					<div
						class="obsiman-file-list-container"
						use:initFileList
					></div>

					<!-- FILTERS PAGE -->
				{:else if pageId === "filters"}
					<!-- Tab bar: Rules | Scope -->
					<div class="obsiman-subtab-bar">
						<div
							class="obsiman-subtab"
							class:is-active={filtersTab === "rules"}
							onclick={() => {
								filtersTab = "rules";
							}}
							role="tab"
							tabindex="0"
						>
							<span>{t("filter.tab.rules")}</span>
						</div>
						<div
							class="obsiman-subtab"
							class:is-active={filtersTab === "scope"}
							onclick={() => {
								filtersTab = "scope";
							}}
							role="tab"
							tabindex="0"
						>
							<span>{t("filter.tab.scope")}</span>
						</div>
					</div>

					<div class="obsiman-subtab-area">
						<!-- Rules tab -->
						<div
							class="obsiman-subtab-content"
							class:is-active={filtersTab === "rules"}
						>
							<div class="obsiman-filter-buttons">
								<button
									class="obsiman-btn"
									onclick={openAddFilterModal}
									>{t("filter.add_rule")}</button
								>
								<button
									class="obsiman-btn"
									onclick={() => {
										plugin.filterService.clearFilters();
										refreshFilterTree();
										updateStats();
									}}>{t("filter.clear")}</button
								>
								<button
									class="obsiman-btn"
									onclick={() =>
										new SaveTemplateModal(
											plugin.app,
											plugin,
											plugin.filterService.activeFilter,
										).open()}
									>{t("filter.template.save")}</button
								>
							</div>
							<!-- Property browser: click property → has_property filter, click value → specific_value filter -->
							<div class="obsiman-prop-browser">
								{#if propBrowserItems.length === 0}
									<div class="obsiman-prop-browser-empty">{t("filter.prop_browser.empty")}</div>
								{:else}
									{#each propBrowserItems as item (item.name)}
										<div
											class="obsiman-prop-browser-row"
											onclick={() => addPropFilter(item.name)}
											role="option"
											aria-selected="false"
											tabindex="0"
										>
											<button
												class="obsiman-prop-browser-expand"
												aria-label={item.expanded ? "Collapse" : "Expand"}
												onclick={(e) => { e.stopPropagation(); togglePropExpanded(item.name); }}
											>{item.expanded ? "▼" : "▶"}</button>
											<span class="obsiman-prop-browser-name">{item.name}</span>
											<span class="obsiman-prop-browser-count">{item.values.length}</span>
										</div>
										{#if item.expanded}
											<div class="obsiman-prop-browser-values">
												{#each item.values as val (val)}
													<div
														class="obsiman-prop-browser-value"
														onclick={() => addValueFilter(item.name, val)}
														role="option"
														aria-selected="false"
														tabindex="0"
													>{val}</div>
												{/each}
											</div>
										{/if}
									{/each}
								{/if}
							</div>
						</div>

						<!-- Scope tab -->
						<div
							class="obsiman-subtab-content"
							class:is-active={filtersTab === "scope"}
						>
							<div class="obsiman-scope-desc">
								{t("scope.desc")}
							</div>
							<div class="obsiman-scope-list">
								{#each scopeOptions as opt}
									<div
										class="obsiman-scope-item"
										class:is-active={plugin.settings
											.explorerOperationScope ===
											opt.value}
										onclick={() => {
											plugin.settings.explorerOperationScope =
												opt.value as
													| "auto"
													| "selected"
													| "filtered"
													| "all";
											void plugin.saveSettings();
										}}
										role="option"
										aria-selected={plugin.settings
											.explorerOperationScope ===
											opt.value}
										tabindex="0"
									>
										<div
											class="obsiman-scope-icon"
											use:icon={opt.icon}
										></div>
										<span>{opt.label}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<!-- OPS PAGE -->
				{:else if pageId === "ops"}
					<div class="obsiman-subtab-bar">
						{#each opsTabs as tab}
							<div
								class="obsiman-subtab"
								class:is-active={opsTab === tab.id}
								data-tab={tab.id}
								onclick={() => {
									opsTab = tab.id;
								}}
								role="tab"
								tabindex="0"
							>
								<span>{tab.label}</span>
							</div>
						{/each}
					</div>

					<div class="obsiman-subtab-area">
						<!-- File Ops tab (always in DOM so QueueListComponent persists) -->
						<div
							class="obsiman-subtab-content"
							class:is-active={opsTab === "fileops"}
						>
							<div class="obsiman-ops-buttons">
								<button
									class="obsiman-btn"
									onclick={openFileRename}
								>
									<span
										class="obsiman-btn-icon"
										use:icon={"lucide-pencil"}
									></span>
									{t("ops.rename")}
								</button>
								<button
									class="obsiman-btn"
									onclick={openPropertyManager}
								>
									<span
										class="obsiman-btn-icon"
										use:icon={"lucide-plus"}
									></span>
									{t("ops.add_property")}
								</button>
								<button
									class="obsiman-btn"
									onclick={openMovePopup}
								>
									<span
										class="obsiman-btn-icon"
										use:icon={"lucide-folder-input"}
									></span>
									{t("ops.move")}
								</button>
							</div>
							<div
								class="obsiman-queue-container"
								use:initQueueList
							></div>
							<div class="obsiman-queue-actions">
								<button
									class="obsiman-btn mod-cta"
									onclick={() => {
										if (!plugin.queueService.isEmpty)
											new QueueDetailsModal(
												plugin.app,
												plugin.queueService,
											).open();
									}}>{t("ops.apply")}</button
								>
								<button
									class="obsiman-btn"
									onclick={() => plugin.queueService.clear()}
								>
									{t("ops.clear")}
								</button>
							</div>
						</div>

						<!-- Linter tab (always in DOM) -->
						<div
							class="obsiman-subtab-content"
							class:is-active={opsTab === "linter"}
						>
							<div class="obsiman-linter-desc">
								{t("ops.linter.desc")}
							</div>
							<button
								class="obsiman-btn mod-cta"
								onclick={openLinter}
								>{t("ops.linter.run")}</button
							>
						</div>

						<!-- Template tab -->
						<div
							class="obsiman-subtab-content"
							class:is-active={opsTab === "template"}
						>
							<div class="obsiman-coming-soon">
								{t("ops.coming_soon")}
							</div>
						</div>

						<!-- Content tab -->
						<div
							class="obsiman-subtab-content"
							class:is-active={opsTab === "content"}
						>
							<!-- Find row: input + Aa + .* toggles -->
							<div class="obsiman-content-find-row">
								<input
									class="obsiman-search-input"
									type="text"
									placeholder={t("content.find_placeholder")}
									bind:value={contentFind}
								/>
								<button
									class="obsiman-icon-toggle"
									class:is-active={contentCaseSensitive}
									aria-label={t("content.toggle_case")}
									title={t("content.toggle_case")}
									onclick={() => {
										contentCaseSensitive =
											!contentCaseSensitive;
									}}>Aa</button
								>
								<button
									class="obsiman-icon-toggle"
									class:is-active={contentIsRegex}
									aria-label={t("content.toggle_regex")}
									title={t("content.toggle_regex")}
									onclick={() => {
										contentIsRegex = !contentIsRegex;
									}}>.*</button
								>
							</div>
							{#if contentRegexError}
								<div class="obsiman-content-regex-error">
									{contentRegexError}
								</div>
							{/if}
							<input
								class="obsiman-search-input"
								type="text"
								placeholder={t("content.replace_placeholder")}
								bind:value={contentReplace}
							/>
							<div class="obsiman-content-scope-hint">
								{contentScopeHint}
							</div>
							<div class="obsiman-content-actions">
								<button
									class="obsiman-btn"
									disabled={!contentFind || contentPreviewing}
									onclick={() => {
										void previewContentReplace();
									}}
									>{contentPreviewing
										? "…"
										: t("content.preview")}</button
								>
								<button
									class="obsiman-btn mod-cta"
									disabled={!contentFind}
									onclick={queueContentReplace}
									>{t("content.queue_replace")}</button
								>
							</div>
							{#if contentPreviewResult !== null}
								<div class="obsiman-content-preview">
									<div
										class="obsiman-content-preview-header"
										onclick={() => {
											contentPreviewOpen =
												!contentPreviewOpen;
										}}
										role="button"
										tabindex="0"
									>
										<span class="obsiman-preview-chevron"
											>{contentPreviewOpen
												? "▼"
												: "▶"}</span
										>
										{#if contentPreviewResult.totalMatches === 0}
											<span
												>{t("content.no_matches")}</span
											>
										{:else}
											<span
												>{t("content.preview_count")
													.replace(
														"{matches}",
														String(
															contentPreviewResult.totalMatches,
														),
													)
													.replace(
														"{files}",
														String(
															contentPreviewResult
																.files.length +
																contentPreviewResult.moreFiles,
														),
													)}</span
											>
										{/if}
									</div>
									{#if contentPreviewOpen && contentPreviewResult.totalMatches > 0}
										{#each contentPreviewResult.files as fileResult}
											<div
												class="obsiman-content-preview-file"
											>
												{fileResult.file.path} ({fileResult.matchCount})
											</div>
											{#each fileResult.snippets as snippet}
												<div
													class="obsiman-content-preview-snippet"
												>
													<span>{snippet.before}</span
													><mark>{snippet.match}</mark
													><span>{snippet.after}</span
													>
												</div>
											{/each}
										{/each}
										{#if contentPreviewResult.moreFiles > 0}
											<div class="obsiman-text-faint">
												{t(
													"content.preview_more",
												).replace(
													"{count}",
													String(
														contentPreviewResult.moreFiles,
													),
												)}
											</div>
										{/if}
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- ─── Bottom nav floats over content inside the viewport ──────────────────── -->
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
		<!-- Long-press 2s any icon to enter reorder mode, then move pointer to target icon and release -->
		<div
			class="obsiman-nav-pill"
			class:is-reordering={isReordering}
			bind:this={pillEl}
			onpointermove={onPillPointerMove}
			onpointerup={onPillPointerUp}
			onpointerleave={exitReorder}
			role="tablist"
		>
			{#each pageOrder as pageId, i}
				<div
					class="obsiman-nav-icon"
					class:is-active={activePage === pageId && !isReordering}
					class:is-reorder-target={isReordering &&
						reorderTargetIdx === i}
					aria-label={pageLabels[pageId] ?? pageId}
					use:icon={pageIcons[pageId] ?? "lucide-circle"}
					onpointerdown={(e) => onNavIconPointerDown(e, i)}
					onpointercancel={exitReorder}
					onclick={() => {
						if (!isReordering) navigateTo(pageId);
					}}
					role="tab"
					tabindex="0"
				>
					{#if !isReordering && pageId === "filters" && filterRuleCount > 0}
						<div class="obsiman-nav-dot-badge">
							{filterRuleCount}
						</div>
					{/if}
					{#if !isReordering && pageId === "ops" && queuedCount > 0}
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
</div>

<!-- ─── Popup overlay (always in DOM, shown/hidden via CSS) ────────────────── -->
<div
	class="obsiman-popup-overlay"
	class:is-hidden={activePopup === null}
	class:is-open={popupOpen}
	onclick={(e) => {
		if (e.target === e.currentTarget) closePopup();
	}}
	role="dialog"
	aria-modal="true"
>
	<div class="obsiman-popup-content">
		<!-- Active Filters popup -->
		<div hidden={activePopup !== "active-filters"}>
			<div class="obsiman-popup-header">
				<span class="obsiman-popup-title">{t("filters.active")}</span>
				<div
					class="clickable-icon"
					aria-label="Close"
					use:icon={"lucide-x"}
					onclick={closePopup}
					role="button"
					tabindex="0"
				></div>
			</div>
			<div
				class="obsiman-filter-tree obsiman-popup-filter-tree"
				use:initPopupFilterTree
			></div>
			<div class="obsiman-popup-actions">
				<button
					class="obsiman-btn"
					onclick={() => {
						plugin.filterService.clearFilters();
						updateStats();
						closePopup();
					}}>{t("filter.clear")}</button
				>
				<button
					class="obsiman-btn mod-cta"
					onclick={() => {
						closePopup();
						openAddFilterModal();
					}}
				>
					{t("filter.add_rule")}
				</button>
			</div>
		</div>

		<!-- Scope popup -->
		<div hidden={activePopup !== "scope"}>
			<div class="obsiman-popup-header">
				<span class="obsiman-popup-title">{t("scope.title")}</span>
				<div
					class="clickable-icon"
					aria-label="Close"
					use:icon={"lucide-x"}
					onclick={closePopup}
					role="button"
					tabindex="0"
				></div>
			</div>
			<div class="obsiman-scope-list">
				{#each scopeOptions as opt}
					<div
						class="obsiman-scope-item"
						class:is-active={plugin.settings
							.explorerOperationScope === opt.value}
						onclick={() => setScope(opt.value)}
						role="option"
						aria-selected={plugin.settings
							.explorerOperationScope === opt.value}
						tabindex="0"
					>
						<div
							class="obsiman-scope-icon"
							use:icon={opt.icon}
						></div>
						<span>{opt.label}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- View mode popup -->
		<div hidden={activePopup !== "view-mode"}>
			<div class="obsiman-popup-header">
				<span class="obsiman-popup-title">{t("nav.view_mode")}</span>
				<div
					class="clickable-icon"
					aria-label="Close"
					use:icon={"lucide-x"}
					onclick={closePopup}
					role="button"
					tabindex="0"
				></div>
			</div>
			<div class="obsiman-view-mode-list">
				<div
					class="obsiman-scope-item"
					class:is-active={plugin.settings.viewMode !== "selected"}
					onclick={() => setViewMode("list")}
					role="option"
					aria-selected={plugin.settings.viewMode !== "selected"}
					tabindex="0"
				>
					<div
						class="obsiman-scope-icon"
						use:icon={"lucide-list"}
					></div>
					<span>{t("view.mode.list")}</span>
				</div>
				<div
					class="obsiman-scope-item"
					class:is-active={plugin.settings.viewMode === "selected"}
					onclick={() => setViewMode("selected")}
					role="option"
					aria-selected={plugin.settings.viewMode === "selected"}
					tabindex="0"
				>
					<div
						class="obsiman-scope-icon"
						use:icon={"lucide-check-square"}
					></div>
					<span>{t("view.mode.selected")}</span>
				</div>
				<div
					class="obsiman-scope-item is-disabled"
					aria-disabled="true"
				>
					<div
						class="obsiman-scope-icon"
						use:icon={"lucide-table"}
					></div>
					<span>{t("view.mode.prop_columns")}</span>
					<span class="obsiman-coming-soon-badge"
						>{t("ops.coming_soon")}</span
					>
				</div>
			</div>
		</div>

		<!-- Search popup -->
		<div hidden={activePopup !== "search"}>
			<div class="obsiman-popup-header">
				<span class="obsiman-popup-title">{t("nav.search_files")}</span>
				<div
					class="clickable-icon"
					aria-label="Close"
					use:icon={"lucide-x"}
					onclick={closePopup}
					role="button"
					tabindex="0"
				></div>
			</div>
			<div class="obsiman-search-fields">
				<input
					class="obsiman-search-input"
					type="text"
					placeholder={t("search.name_placeholder")}
					bind:value={searchName}
				/>
				<input
					class="obsiman-search-input"
					type="text"
					placeholder={t("search.folder_placeholder")}
					bind:value={searchFolder}
				/>
			</div>
		</div>

		<!-- Move popup -->
		<div hidden={activePopup !== "move"}>
			<div class="obsiman-popup-header">
				<span class="obsiman-popup-title"
					>{t("move.title")} ({moveTargetFiles.length})</span
				>
				<div
					class="clickable-icon"
					aria-label="Close"
					use:icon={"lucide-x"}
					onclick={closePopup}
					role="button"
					tabindex="0"
				></div>
			</div>
			<input
				class="obsiman-search-input"
				type="text"
				placeholder={t("move.target_folder_placeholder")}
				use:attachFolderSuggest
				oninput={(e) => {
					moveTargetFolder = (
						e.target as HTMLInputElement
					).value.trim();
				}}
			/>
			<p
				class="obsiman-text-faint"
				style="font-size: var(--font-ui-smaller); margin: 4px 0 8px;"
			>
				{t("move.root_hint")}
			</p>
			<div class="obsiman-rename-preview">
				{#each movePreviews as row}
					<div class="obsiman-rename-row">
						<span class="obsiman-diff-deleted">{row.oldPath}</span>
						<span> → </span>
						<span class="obsiman-diff-added">{row.newPath}</span>
					</div>
				{/each}
				{#if moveTargetFiles.length > movePreviews.length}
					<div class="obsiman-text-faint">
						... and {moveTargetFiles.length - movePreviews.length} more
					</div>
				{/if}
			</div>
			<div class="obsiman-popup-actions">
				<button class="obsiman-btn mod-cta" onclick={queueMoves}
					>{t("prop.add_to_queue")}</button
				>
				<button class="obsiman-btn" onclick={closePopup}>Cancel</button>
			</div>
		</div>
	</div>
</div>
