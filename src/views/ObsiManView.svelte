<script lang="ts">
	import { onMount } from 'svelte';
	import { Menu, setIcon } from 'obsidian';
	import type { ObsiManPlugin } from '../../main';
	import { FileListComponent } from '../components/FileListComponent';
	import { PropertyExplorerComponent } from '../components/PropertyExplorerComponent';
	import { QueueListComponent } from '../components/QueueListComponent';
	import { QueueIslandComponent } from '../components/QueueIslandComponent';
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
	type OpsTabDef = { id: OpsTab; label: string; icon: string };
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
	let pageRenderKey = $state(0); // incremented on each reorder to force page content remount
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
			action: () => { toggleQueueIsland(); },
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
		activePage = page;
		applyPageTransform(true);
	}

	function onContainerTransitionEnd(e: TransitionEvent) {
		// Guard against child element transitions bubbling up
		if (e.target === e.currentTarget && e.propertyName === 'transform') {
			isAnimating = false;
			containerEl?.classList.remove('is-animating');
		}
	}

	// ─── Page transition — pixel-based (fixes page-3 translateX bug) ─────────
	let viewportEl: HTMLElement | null = null;
	let containerEl: HTMLElement | null = null;

	function applyPageTransform(animated: boolean) {
		if (!containerEl || !viewportEl) return;
		const w = viewportEl.offsetWidth;
		if (w === 0) return;
		// Set each page to exact pixel width
		const pages = containerEl.querySelectorAll<HTMLElement>('.obsiman-page');
		pages.forEach((p) => { p.style.width = `${w}px`; });
		if (animated) containerEl.classList.add('is-animating');
		containerEl.style.transform = `translateX(${-pageIndex * w}px)`;
	}

	function bindViewport(el: HTMLElement) {
		viewportEl = el;
		const ro = new ResizeObserver(() => { applyPageTransform(false); });
		ro.observe(el);
		applyPageTransform(false);
		return { destroy() { ro.disconnect(); viewportEl = null; } };
	}

	function bindContainer(el: HTMLElement) {
		containerEl = el;
		applyPageTransform(false);
		return { destroy() { containerEl = null; } };
	}

	$effect(() => {
		void pageIndex; // declare dependency
		applyPageTransform(true);
	});

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
			pageRenderKey++;
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

	// ─── Responsive bottom nav ────────────────────────────────────────────────
	const NAV_COLLAPSE_THRESHOLD = 220; // px — below this width the nav collapses
	let navCollapsed = $state(false);
	let navEl: HTMLElement | null = null;
	let viewRootEl: HTMLElement | null = null;
	let navExpandTimer: ReturnType<typeof setTimeout> | null = null;

	function bindNav(el: HTMLElement) {
		navEl = el;
		return {
			destroy() {
				if (navExpandTimer) { clearTimeout(navExpandTimer); navExpandTimer = null; }
				navEl = null;
			}
		};
	}

	// ResizeObserver on .obsiman-view updates nav state
	function bindViewRoot(el: HTMLElement) {
		const target = el.closest('.obsiman-view') as HTMLElement ?? el.parentElement ?? el;
		viewRootEl = target;
		const ro = new ResizeObserver((entries) => {
			const w = entries[0]?.contentRect.width ?? target.offsetWidth;
			navCollapsed = w < NAV_COLLAPSE_THRESHOLD;
		});
		ro.observe(target);
		navCollapsed = target.offsetWidth < NAV_COLLAPSE_THRESHOLD;
		return { destroy() { ro.disconnect(); viewRootEl = null; } };
	}

	function onCollapsedNavClick() {
		if (!navCollapsed || !navEl) return;
		navEl.classList.add('is-bar-expanding');
		navCollapsed = false;
		if (navExpandTimer) clearTimeout(navExpandTimer);
		navExpandTimer = setTimeout(() => {
			// Re-check width using the same element the ResizeObserver monitors
			if (viewRootEl && viewRootEl.offsetWidth < NAV_COLLAPSE_THRESHOLD) {
				navCollapsed = true;
			}
			navEl?.classList.remove('is-bar-expanding');
		}, 2000);
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

	const opsTabs: OpsTabDef[] = [
		{ id: 'fileops', label: t('ops.tab.fileops'), icon: 'lucide-file-cog' },
		{ id: 'linter', label: t('ops.tab.linter_short'), icon: 'lucide-spell-check' },
		{ id: 'template', label: t('ops.tab.template_short'), icon: 'lucide-layout-template' },
		{ id: 'content', label: t('ops.tab.content_short'), icon: 'lucide-file-search' },
	];

	// ─── Stats ────────────────────────────────────────────────────────────────

	let totalFiles = $state(0);
	let filteredCount = $state(0);
	let selectedCount = $state(0);
	let queuedCount = $state(0);
	let filterRuleCount = $state(0);

	// ─── Queue island ─────────────────────────────────────────────────────────
	let queueIslandOpen = $state(false);
	let queueIsland: QueueIslandComponent | undefined;
	let queueIslandEl: HTMLElement | null = null;

	let statsText = $derived.by(() => {
		let s = `${totalFiles} files · ${filteredCount} filtered`;
		if (selectedCount > 0) s += ` · ${selectedCount} selected`;
		if (queuedCount > 0) s += ` · ${queuedCount} pending`;
		return s;
	});

	function countFilterLeaves(group: import('../types/filter').FilterGroup): number {
		let count = 0;
		for (const child of group.children) {
			if (child.type === 'rule') count++;
			else if (child.type === 'group') count += countFilterLeaves(child);
		}
		return count;
	}

	function updateStats() {
		totalFiles = plugin.propertyIndex.fileCount;
		filteredCount = plugin.filterService.filteredFiles.length;
		selectedCount = plugin.basesInjector?.selectedPaths?.size ?? 0;
		queuedCount = plugin.queueService.queue.length;
		filterRuleCount = countFilterLeaves(plugin.filterService.activeFilter);
	}

	let fileList: FileListComponent | undefined;
	let queueList: QueueListComponent | undefined;
	let propExplorer: PropertyExplorerComponent | undefined;

	// Active filter highlight state — passed to PropertyExplorer on each render
	let activeFilterProps = $state(new Set<string>());
	let activeFilterValues = $state(new Map<string, Set<string>>());

	// ─── Actions for native components ────────────────────────────────────────

	function initFileList(node: HTMLElement) {
		fileList = new FileListComponent(node, plugin.app, () => {});
		refreshFiles();
		return {
			destroy() { fileList = undefined; }
		};
	}

	function initPropertyExplorer(node: HTMLElement) {
		propExplorer = new PropertyExplorerComponent(node, plugin, {
			defaultScope: 'filtered',
			onPropertyFilter: (_prop, _val) => { /* handled by FilterService events */ },
		});
		propExplorer.render();
		refreshActiveFilterHighlights();
		return {
			destroy() { propExplorer?.destroy(); propExplorer = undefined; }
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

	function toggleQueueIsland() {
		if (queueIslandOpen) {
			closeQueueIsland();
		} else {
			openQueueIsland();
		}
	}

	function openQueueIsland() {
		if (!queueIslandEl) return;
		queueIslandOpen = true;
		queueIsland = new QueueIslandComponent(
			queueIslandEl,
			plugin.app,
			plugin.queueService,
			() => closeQueueIsland(),
			() => { new QueueDetailsModal(plugin.app, plugin.queueService).open(); }
		);
		queueIsland.mount();
	}

	function closeQueueIsland() {
		queueIsland?.destroy();
		queueIsland = undefined;
		queueIslandOpen = false;
	}


	// ─── Refresh ─────────────────────────────────────────────────────────────

	function refreshFiles() {
		fileList?.render(plugin.filterService.filteredFiles, plugin.propertyIndex.fileCount);
		updateStats();
	}

	function refreshActiveFilterHighlights(): void {
		const props = new Set<string>();
		const vals = new Map<string, Set<string>>();
		function walk(node: import('../types/filter').FilterNode): void {
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
		activeFilterProps = props;
		activeFilterValues = vals;
		propExplorer?.setActiveFilters(props, vals);
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
		plugin.filterService.setSearchFilter(searchName, searchFolder);
	});

	// ─── Filters page tab bar ────────────────────────────────────────────────
	type FiltersTabAction = 'search' | 'scope' | 'sort' | 'view';
	let filtersActiveTab = $state<FiltersTabAction | null>(null);

	const filtersTabItems: Array<{ id: FiltersTabAction; icon: string; labelKey: string }> = [
		{ id: 'search', icon: 'lucide-search', labelKey: 'filters.tab.search' },
		{ id: 'scope', icon: 'lucide-layers', labelKey: 'filters.tab.scope' },
		{ id: 'sort', icon: 'lucide-arrow-up-down', labelKey: 'filters.tab.sort' },
		{ id: 'view', icon: 'lucide-layout-grid', labelKey: 'filters.tab.view' },
	];

	let explorerViewFormat = $state<'tree' | 'grid' | 'cards'>('tree');
	let explorerShowCount = $state(true);
	let explorerShowValues = $state(true);
	let explorerShowPropIcon = $state(true);
	let explorerShowPropName = $state(true);
	let explorerShowType = $state(false);
	let explorerTagsOnly = $state(false);

	$effect(() => {
		propExplorer?.setViewOptions({
			format: explorerViewFormat,
			showCount: explorerShowCount,
			showValues: explorerShowValues,
			showPropIcon: explorerShowPropIcon,
			showPropName: explorerShowPropName,
			showType: explorerShowType,
			tagsOnly: explorerTagsOnly,
		});
	});

	function toggleFiltersTab(tab: FiltersTabAction, e: MouseEvent) {
		if (filtersActiveTab === tab) {
			filtersActiveTab = null;
			if (tab === 'search') propExplorer?.toggleSearch(); // close search bar
		} else {
			filtersActiveTab = tab;
			if (tab === 'search') propExplorer?.toggleSearch();
			else if (tab === 'scope') propExplorer?.showFilterMenu(e);
			else if (tab === 'sort') propExplorer?.showSortMenu(e);
			// 'view' — dropdown panel shown in template
		}
	}

	// ─── Active Filters popup state ───────────────────────────────────────────

	type ActiveFilterRule = {
		id: string;
		description: string;
		node: import('../types/filter').FilterNode;
		parent: import('../types/filter').FilterGroup;
		enabled: boolean;
	};

	let activeFilterRules = $state<ActiveFilterRule[]>([]);

	function refreshActiveFiltersPopup(): void {
		const rules: ActiveFilterRule[] = [];
		let counter = 0;
		function walk(group: import('../types/filter').FilterGroup): void {
			for (const child of group.children) {
				if (child.type === 'rule') {
					rules.push({
						id: `rule-${counter++}`,
						description: describeFilterNode(child),
						node: child,
						parent: group,
						enabled: !(child as any).disabled,
					});
				} else if (child.type === 'group') {
					walk(child);
				}
			}
		}
		walk(plugin.filterService.activeFilter);
		activeFilterRules = rules;
	}

	function describeFilterNode(node: import('../types/filter').FilterNode): string {
		if (node.type !== 'rule') return 'Group';
		const prop = (node as any).property ?? '';
		const vals = (node as any).values ?? [];
		switch ((node as any).filterType) {
			case 'has_property': return `has: ${prop}`;
			case 'specific_value': return `${prop}: ${vals[0] ?? ''}`;
			case 'folder': return `folder: ${vals[0] ?? ''}`;
			case 'file_name': return `name: ${vals[0] ?? ''}`;
			default: return prop || 'filter';
		}
	}

	function toggleFilterRule(rule: ActiveFilterRule): void {
		(rule.node as any).disabled = !((rule.node as any).disabled);
		plugin.filterService.applyFilters();
		refreshActiveFiltersPopup();
	}

	function deleteFilterRule(rule: ActiveFilterRule): void {
		plugin.filterService.removeNode(rule.node, rule.parent);
		refreshActiveFiltersPopup();
		updateStats();
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

	// ─── Refresh active filters popup when it becomes visible ────────────────

	$effect(() => {
		if (activePopup === 'active-filters' && popupOpen) {
			refreshActiveFiltersPopup();
		}
	});

	// ─── Lifecycle ────────────────────────────────────────────────────────────

	onMount(() => {

		const onFilterChanged = () => {
			refreshFiles();
			refreshActiveFilterHighlights();
			updateStats();
			if (activePopup === 'active-filters') {
				refreshActiveFiltersPopup();
			}
		};
		const onVaultResolved = () => { refreshFiles(); };
		const onQueueChanged = () => {
			refreshQueue();
			if (plugin.queueService.isEmpty && queueIslandOpen) {
				closeQueueIsland();
			}
			queueIsland?.render();
		};

		plugin.filterService.on('changed', onFilterChanged);
		plugin.queueService.on('changed', onQueueChanged);

		refreshFiles();
		refreshQueue();

		// Re-render file list + prop browser when vault finishes indexing
		plugin.app.metadataCache.on('resolved', onVaultResolved);

		return () => {
			plugin.filterService.off('changed', onFilterChanged);
			plugin.queueService.off('changed', onQueueChanged);
			plugin.app.metadataCache.off('resolved', onVaultResolved);
		};
	});
</script>

<!-- ─── Page container (horizontal slide strip) ────────────────────────────── -->
<!-- obsiman-pages-viewport clips via overflow:hidden; the container slides inside it -->
<div class="obsiman-pages-viewport" use:bindViewport use:bindViewRoot>
	<div
		class="obsiman-page-container"
		use:bindContainer
		ontransitionend={onContainerTransitionEnd}
	>
		{#each pageOrder as pageId (pageId)}
			<div class="obsiman-page" data-page={pageId}>
				{#key pageRenderKey}
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
					<!-- 4-tab toolbar: Search · Scope · Sort · View -->
					<div class="obsiman-filters-tabbar">
						{#each filtersTabItems as tab}
							<div
								class="obsiman-filters-tab"
								class:is-active={filtersActiveTab === tab.id}
								onclick={(e) => toggleFiltersTab(tab.id, e)}
								aria-label={t(tab.labelKey)}
								role="tab"
								tabindex="0"
							>
								<span class="obsiman-filters-tab-icon" use:icon={tab.icon}></span>
								<span class="obsiman-filters-tab-label">{t(tab.labelKey)}</span>
							</div>
						{/each}

						{#if filtersActiveTab === 'view'}
							<div class="obsiman-filters-view-panel">
								<div class="obsiman-view-panel-section">
									<span class="obsiman-view-panel-label">{t('filters.view.format')}</span>
									{#each (['tree', 'grid', 'cards'] as const) as fmt}
										<div
											class="obsiman-view-panel-option"
											class:is-active={explorerViewFormat === fmt}
											onclick={() => { explorerViewFormat = fmt; filtersActiveTab = null; }}
											role="option"
											aria-selected={explorerViewFormat === fmt}
											tabindex="0"
										>{t('filters.view.format.' + fmt)}</div>
									{/each}
								</div>
								<div class="obsiman-view-panel-section">
									<span class="obsiman-view-panel-label">{t('filters.view.show')}</span>
									<label class="obsiman-view-panel-check">
										<input type="checkbox" bind:checked={explorerShowPropIcon} />
										{t('filters.view.show.prop_icon')}
									</label>
									<label class="obsiman-view-panel-check">
										<input type="checkbox" bind:checked={explorerShowPropName} />
										{t('filters.view.show.prop_name')}
									</label>
									<label class="obsiman-view-panel-check">
										<input type="checkbox" bind:checked={explorerShowCount} />
										{t('filters.view.show.count')}
									</label>
									<label class="obsiman-view-panel-check">
										<input type="checkbox" bind:checked={explorerShowValues} />
										{t('filters.view.show.values')}
									</label>
									<label class="obsiman-view-panel-check">
										<input type="checkbox" bind:checked={explorerShowType} />
										{t('filters.view.show.type')}
									</label>
								</div>
								<div class="obsiman-view-panel-section">
									<label class="obsiman-view-panel-check">
										<input type="checkbox" bind:checked={explorerTagsOnly} />
										<span>
											<strong>{t('filters.view.tags_only')}</strong><br/>
											<small>{t('filters.view.tags_only.desc')}</small>
										</span>
									</label>
								</div>
							</div>
						{/if}
					</div>

					<!-- PropertyExplorer fills remaining space -->
					<div class="obsiman-filters-explorer-wrap" use:initPropertyExplorer></div>

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
								aria-label={tab.label}
							>
								<span class="obsiman-subtab-icon" use:icon={tab.icon}></span>
								<span class="obsiman-subtab-label">{tab.label}</span>
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
				{/key}
			</div>
		{/each}
	</div>

	<!-- ─── Queue island container — floats above bottom nav ────────────────────── -->
	<div class="obsiman-queue-island-wrap" bind:this={queueIslandEl}></div>

	<!-- ─── Bottom nav floats over content inside the viewport ──────────────────── -->
	<!-- Files always gets both FABs. Other pages get ONE FAB on their outer edge. -->
	<div
		class="obsiman-bottom-nav"
		use:bindNav
		class:is-bar-collapsed={navCollapsed}
		onclick={onCollapsedNavClick}
		role="navigation"
	>
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
					{#if !isReordering && pageId === "files" && selectedCount > 0}
						<div class="obsiman-nav-dot-badge">{selectedCount}</div>
					{/if}
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
		<div hidden={activePopup !== "active-filters"} class="obsiman-active-filters-popup">
			<!-- Squircle action buttons row -->
			<div class="obsiman-squircle-row">
				<div
					class="obsiman-squircle"
					aria-label={t('filters.popup.clear_all')}
					use:icon={"lucide-x"}
					onclick={() => {
						plugin.filterService.clearFilters();
						refreshActiveFiltersPopup();
						updateStats();
						closePopup();
					}}
					role="button"
					tabindex="0"
				></div>
				<div
					class="obsiman-squircle obsiman-squircle-reserved"
					aria-label="Reserved"
					use:icon={"lucide-plus"}
					role="button"
					tabindex="0"
				></div>
				<div
					class="obsiman-squircle"
					aria-label={t('filters.popup.templates')}
					use:icon={"lucide-bookmark"}
					onclick={(e) => {
						const menu = new Menu();
						plugin.settings.filterTemplates.forEach((tpl) => {
							menu.addItem((item) =>
								item.setTitle(tpl.name).onClick(() => {
									plugin.filterService.loadTemplate(tpl);
									refreshActiveFiltersPopup();
									updateStats();
									closePopup();
								})
							);
						});
						menu.addSeparator();
						menu.addItem((item) =>
							item.setTitle(t('filter.template.save')).onClick(() => {
								new SaveTemplateModal(
									plugin.app, plugin, plugin.filterService.activeFilter
								).open();
								closePopup();
							})
						);
						menu.showAtMouseEvent(e);
					}}
					role="button"
					tabindex="0"
				></div>
				<div
					class="obsiman-squircle obsiman-squircle-reserved"
					aria-label="Reserved"
					use:icon={"lucide-check"}
					role="button"
					tabindex="0"
				></div>
			</div>

			<!-- Filter rules list -->
			<div class="obsiman-active-filters-list">
				{#if activeFilterRules.length === 0}
					<div class="obsiman-active-filters-empty">{t('filters.popup.empty')}</div>
				{:else}
					{#each activeFilterRules as rule (rule.id)}
						<div class="obsiman-active-filter-rule" class:is-disabled={!rule.enabled}>
							<span class="obsiman-active-filter-rule-text">{rule.description}</span>
							<div
								class="obsiman-active-filter-toggle clickable-icon"
								aria-label={rule.enabled ? t('filters.popup.rule.disable') : t('filters.popup.rule.enable')}
								onclick={() => toggleFilterRule(rule)}
								role="button"
								tabindex="0"
							></div>
							<div
								class="obsiman-active-filter-delete clickable-icon"
								aria-label={t('filters.popup.rule.delete')}
								use:icon={"lucide-x"}
								onclick={() => deleteFilterRule(rule)}
								role="button"
								tabindex="0"
							></div>
						</div>
					{/each}
				{/if}
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
