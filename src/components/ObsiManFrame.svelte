<script lang="ts">
	import { onMount } from "svelte";
	import { setIcon } from "obsidian";
	import type { ObsiManPlugin } from "../../main";
	import type { FilesExplorerPanel } from "./containers/FilesExplorerPanel";
	import type { PropsExplorerPanel } from "./containers/PropsExplorerPanel";
	import type { TagsExplorerPanel } from "./containers/TagsExplorerPanel";
	import StatisticsPage from "./pages/StatisticsPage.svelte";
	import FiltersPage from "./pages/FiltersPage.svelte";
	import OperationsPage from "./pages/OperationsPage.svelte";
	import BottomNav from "./layout/BottomNav.svelte";
	import PopupOverlay from "./layout/PopupOverlay.svelte";
	import { QueueListComponent } from "./QueueListComponent";
	import { QueueIslandComponent } from "./QueueIslandComponent";
	import { QueueDetailsModal } from "../modals/QueueDetailsModal";
	import { FolderSuggest } from "../utils/autocomplete";
	import { MOVE_FILE } from "../types/operation";
	import type { PendingChange } from "../types/operation";
	import { translate } from "../i18n/index";
	import type { PopupType, FabDef } from "../types/ui";

	// ─── Props ────────────────────────────────────────────────────────────────

	let { plugin }: { plugin: ObsiManPlugin } = $props();

	// ─── Page navigation ──────────────────────────────────────────────────────

	function resolvedPageOrder(): string[] {
		const order = plugin.settings.pageOrder as string[] | undefined;
		const valid = ["statistics", "filters", "ops"];
		if (
			Array.isArray(order) &&
			order.length === 3 &&
			valid.every((p) => order.includes(p))
		) {
			return order;
		}
		return ["ops", "statistics", "filters"];
	}

	const initialPageOrder = resolvedPageOrder();
	let pageOrder = $state(initialPageOrder);
	let pageRenderKey = $state(0); // incremented on each reorder to force page content remount
	const pageLabels: Record<string, string> = {
		statistics: translate("nav.statistics"),
		filters: translate("nav.filters"),
		ops: translate("nav.ops"),
	};

	const pageIcons: Record<string, string> = {
		statistics: "lucide-bar-chart-2",
		filters: "lucide-filter",
		ops: "lucide-settings-2",
	};

	// ─── Per-page FAB definitions ────────────────────────────────────────────────

	const pageFabs: Record<
		string,
		{ left: FabDef | null; right: FabDef | null }
	> = {
		ops: {
			left: {
				icon: "lucide-list-checks",
				label: translate("ops.queue"),
				action: () => {
					toggleQueueIsland();
				},
			},
			right: null,
		},
		statistics: {
			left: { icon: "lucide-blocks", label: "Add-ons", action: () => {} },
			right: {
				icon: "lucide-settings",
				label: translate("nav.statistics") ?? "Settings",
				action: () => {
					// Stub settings open hook
					(plugin.app as any).setting?.open?.();
					(plugin.app as any).setting?.openTabById?.("obsiman");
				},
			},
		},
		filters: {
			left: null,
			right: {
				icon: "lucide-sparkles",
				label: translate("filters.active"),
				action: () => showPopup("active-filters"),
			},
		},
	};

	const leftFab = $derived.by<FabDef | null>(
		() => pageFabs[activePage]?.left ?? null,
	);
	const rightFab = $derived.by<FabDef | null>(
		() => pageFabs[activePage]?.right ?? null,
	);

	let activePage = $state(initialPageOrder[0] ?? "ops");

	// Use DOM insertion order (pageOrder at mount time) — avoids stale settings mismatch
	let pageIndex = $derived(pageOrder.indexOf(activePage));

	function navigateTo(page: string) {
		activePage = page;
		applyPageTransform(true);
	}

	function onContainerTransitionEnd(e: TransitionEvent) {
		// Guard against child element transitions bubbling up
		if (e.target === e.currentTarget && e.propertyName === "transform") {
			containerEl?.classList.remove("is-animating");
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
		const pages =
			containerEl.querySelectorAll<HTMLElement>(".obsiman-page");
		pages.forEach((p) => {
			p.style.width = `${w}px`;
		});
		if (animated) containerEl.classList.add("is-animating");
		containerEl.style.transform = `translateX(${-pageIndex * w}px)`;
	}

	function bindViewport(el: HTMLElement) {
		viewportEl = el;
		const ro = new ResizeObserver(() => {
			applyPageTransform(false);
		});
		ro.observe(el);
		applyPageTransform(false);
		return {
			destroy() {
				ro.disconnect();
				viewportEl = null;
			},
		};
	}

	function bindContainer(el: HTMLElement) {
		containerEl = el;
		applyPageTransform(false);
		return {
			destroy() {
				containerEl = null;
			},
		};
	}

	$effect(() => {
		void pageIndex; // declare dependency
		applyPageTransform(true);
	});

	$effect(() => {
		if (!pageOrder.includes(activePage)) {
			activePage = pageOrder[0] ?? "ops";
		}
	});

	// ─── Bottom Navbar DnD reorder ───────────────────────────
	// Uses pointer events only — HTML5 DnD is avoided because Obsidian's
	// workspace intercepts it and creates tab groups.

	let isReordering = $state(false);
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let reorderSourceIdx = -1;
	let reorderTargetIdx = $state(-1);
	let pillEl = $state<HTMLElement | null>(null);
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
		const iconEl = el?.closest?.(".obsiman-nav-icon") as HTMLElement | null;
		if (iconEl && pillEl.contains(iconEl)) {
			const icons = pillEl.querySelectorAll(".obsiman-nav-icon");
			const idx = Array.from(icons).indexOf(iconEl);
			if (idx >= 0 && idx !== reorderSourceIdx) {
				reorderTargetIdx = idx;
			}
		}
	}

	function onPillPointerUp() {
		cancelLongPress();
		if (
			isReordering &&
			reorderSourceIdx >= 0 &&
			reorderTargetIdx >= 0 &&
			reorderSourceIdx !== reorderTargetIdx
		) {
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
				if (navExpandTimer) {
					clearTimeout(navExpandTimer);
					navExpandTimer = null;
				}
				navEl = null;
			},
		};
	}

	// ResizeObserver on .obsiman-view updates nav state
	function bindViewRoot(el: HTMLElement) {
		const target =
			(el.closest(".obsiman-view") as HTMLElement) ??
			el.parentElement ??
			el;
		viewRootEl = target;
		const ro = new ResizeObserver((entries) => {
			const w = entries[0]?.contentRect.width ?? target.offsetWidth;
			navCollapsed = w < NAV_COLLAPSE_THRESHOLD;
		});
		ro.observe(target);
		navCollapsed = target.offsetWidth < NAV_COLLAPSE_THRESHOLD;
		return {
			destroy() {
				ro.disconnect();
				viewRootEl = null;
			},
		};
	}

	function onCollapsedNavClick() {
		if (!navCollapsed || !navEl) return;
		navEl.classList.add("is-bar-expanding");
		navCollapsed = false;
		if (navExpandTimer) clearTimeout(navExpandTimer);
		navExpandTimer = setTimeout(() => {
			// Re-check width using the same element the ResizeObserver monitors
			if (viewRootEl && viewRootEl.offsetWidth < NAV_COLLAPSE_THRESHOLD) {
				navCollapsed = true;
			}
			navEl?.classList.remove("is-bar-expanding");
		}, 2000);
	}

	// ─── Popup ────────────────────────────────────────────────────────────────

	let activePopup = $state<PopupType | null>(null);
	let popupOpen = $state(false);

	function showPopup(type: PopupType) {
		activePopup = type;
		// Next frame so CSS transition fires after is-hidden is removed
		requestAnimationFrame(() => {
			popupOpen = true;
		});
	}

	function closePopup() {
		popupOpen = false;
		// Wait for the 0.3s spring transition before clearing content
		setTimeout(() => {
			activePopup = null;
		}, 320);
	}

	// ─── Stats ────────────────────────────────────────────────────────────────

	let filteredCount = $state(0);
	let selectedCount = $state(0);
	let queuedCount = $state(0);
	let filterRuleCount = $state(0);

	// ─── Queue island ─────────────────────────────────────────────────────────
	let queueIslandOpen = $state(false);
	let queueIsland: QueueIslandComponent | undefined;
	let queueIslandEl: HTMLElement | null = null;

	function countFilterLeaves(
		group: import("../types/filter").FilterGroup,
	): number {
		let count = 0;
		for (const child of group.children) {
			if (child.type === "rule") count++;
			else if (child.type === "group") count += countFilterLeaves(child);
		}
		return count;
	}

	function updateStats() {
		filteredCount = plugin.filterService.filteredFiles.length;
		queuedCount = plugin.queueService.queue.length;
		filterRuleCount = countFilterLeaves(plugin.filterService.activeFilter);
	}

	let fileList = $state<FilesExplorerPanel | undefined>(undefined);
	let queueList: QueueListComponent | undefined;
	let propExplorer = $state<PropsExplorerPanel | undefined>(undefined);
	let tagsExplorer = $state<TagsExplorerPanel | null>(null);

	// ─── Filters page state ──────────────────────────────────────────────────
	type FiltersTab = "tags" | "props" | "files";
	let filtersActiveTab = $state<FiltersTab>("props");
	let filtersSearch = $state("");
	let filtersSearchCategory = $state<Record<FiltersTab, number>>({
		tags: 0,
		props: 0,
		files: 0,
	});

	$effect(() => {
		const term = filtersSearch;
		const tab = filtersActiveTab;
		const catMode = filtersSearchCategory[tab] ?? 0;

		// Route search with per-tab category scoping
		switch (tab) {
			case "props":
				propExplorer?.setSearchTerm(term);
				break;
			case "tags":
				tagsExplorer?.setSearchTerm(
					term,
					catMode === 0 ? "all" : "leaf",
				);
				break;
			case "files":
				if (catMode === 0) {
					fileList?.setSearchFilter(term, "");
				} else {
					fileList?.setSearchFilter("", term);
				}
				break;
		}
	});

	// ─── Actions for native components ────────────────────────────────────────

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
			() => {
				new QueueDetailsModal(plugin.app, plugin.queueService).open();
			},
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
		fileList?.render(
			plugin.filterService.filteredFiles,
			plugin.propertyIndex.fileCount,
		);
		updateStats();
	}

	function refreshActiveFilterHighlights(): void {
		const props = new Set<string>();
		const vals = new Map<string, Set<string>>();
		function walk(node: import("../types/filter").FilterNode): void {
			if (node.type === "rule") {
				if (node.property) {
					props.add(node.property);
					if (node.values && node.values.length > 0) {
						if (!vals.has(node.property))
							vals.set(node.property, new Set());
						node.values.forEach((v) =>
							vals.get(node.property!)!.add(v),
						);
					}
				}
			} else if (node.type === "group") {
				node.children.forEach(walk);
			}
		}
		walk(plugin.filterService.activeFilter);
		// PropsExplorerPanel computes active filter highlights internally on render
		void props;
		void vals;
	}

	function refreshQueue() {
		queueList?.render(plugin.queueService.queue);
		updateStats();
	}

	// ─── Scope popup ──────────────────────────────────────────────────────────

	const scopeOptions = [
		{
			value: "all",
			label: translate("scope.all"),
			icon: "lucide-database",
		},
		{
			value: "filtered",
			label: translate("scope.filtered"),
			icon: "lucide-filter",
		},
		{
			value: "selected",
			label: translate("scope.selected"),
			icon: "lucide-check-square",
		},
	];

	function setScope(value: string) {
		plugin.settings.explorerOperationScope = value as
			| "auto"
			| "selected"
			| "filtered"
			| "all";
		void plugin.saveSettings();
		closePopup();
	}

	// ─── View mode popup ──────────────────────────────────────────────────────

	function setViewMode(mode: "list" | "selected") {
		plugin.settings.viewMode = mode;
		void plugin.saveSettings();
		// showSelectedOnly handled by FilesExplorerPanel view mode in future iteration
		closePopup();
	}

	// ─── Search popup ─────────────────────────────────────────────────────────

	let searchName = $state("");
	let searchFolder = $state("");

	$effect(() => {
		fileList?.setSearchFilter(searchName, searchFolder);
		plugin.filterService.setSearchFilter(searchName, searchFolder);
	});

	// ─── Filters page state (bound to FiltersPage component) ─────────────────

	// ─── Active Filters popup state ───────────────────────────────────────────

	type ActiveFilterRule = {
		id: string;
		description: string;
		node: import("../types/filter").FilterNode;
		parent: import("../types/filter").FilterGroup;
		enabled: boolean;
	};

	let activeFilterRules = $state<ActiveFilterRule[]>([]);

	function refreshActiveFiltersPopup(): void {
		const rules: ActiveFilterRule[] = [];
		let counter = 0;
		function walk(group: import("../types/filter").FilterGroup): void {
			for (const child of group.children) {
				if (child.type === "rule") {
					rules.push({
						id: `rule-${counter++}`,
						description: describeFilterNode(child),
						node: child,
						parent: group,
						enabled: !(child as any).disabled,
					});
				} else if (child.type === "group") {
					walk(child);
				}
			}
		}
		walk(plugin.filterService.activeFilter);
		activeFilterRules = rules;
	}

	function describeFilterNode(
		node: import("../types/filter").FilterNode,
	): string {
		if (node.type !== "rule") return "Group";
		const prop = (node as any).property ?? "";
		const vals = (node as any).values ?? [];
		switch ((node as any).filterType) {
			case "has_property":
				return `has: ${prop}`;
			case "specific_value":
				return `${prop}: ${vals[0] ?? ""}`;
			case "has_tag":
				return `has tag: ${vals[0] ?? ""}`;
			case "folder":
				return `folder: ${vals[0] ?? ""}`;
			case "file_name":
				return `name: ${vals[0] ?? ""}`;
			default:
				return prop || "filter";
		}
	}

	function toggleFilterRule(rule: ActiveFilterRule): void {
		(rule.node as any).disabled = !(rule.node as any).disabled;
		plugin.filterService.applyFilters();
		refreshActiveFiltersPopup();
	}

	function deleteFilterRule(rule: ActiveFilterRule): void {
		plugin.filterService.removeNode(rule.node, rule.parent);
		refreshActiveFiltersPopup();
		updateStats();
	}

	// ─── Scope popup ──────────────────────────────────────────────────────────

	// ─── Move popup ───────────────────────────────────────────────────────────

	let moveTargetFiles = $state<import("obsidian").TFile[]>([]);
	let moveTargetFolder = $state("");

	const movePreviews = $derived.by(() => {
		const limit = Math.min(moveTargetFiles.length, 8);
		return moveTargetFiles.slice(0, limit).map((file) => ({
			oldPath: file.path,
			newPath: moveTargetFolder
				? `${moveTargetFolder}/${file.name}`
				: file.name,
		}));
	});

	function openMovePopup() {
		const selected = fileList?.getSelectedFiles() ?? [];
		moveTargetFiles =
			selected.length > 0
				? selected
				: [...plugin.filterService.filteredFiles];
		moveTargetFolder = "";
		showPopup("move");
	}

	function queueMoves() {
		const targetFolder = moveTargetFolder;
		// Collect all changes first, then add in one batch (one UI event instead of N)
		const changes: PendingChange[] = [];
		for (const file of moveTargetFiles) {
			const newPath = targetFolder
				? `${targetFolder}/${file.name}`
				: file.name;
			if (newPath === file.path) continue;
			changes.push({
				type: "file_move",
				action: "move",
				details: `${file.path} → ${newPath}`,
				files: [file],
				logicFunc: () => ({ [MOVE_FILE]: targetFolder }),
				customLogic: true,
				targetFolder,
			});
		}
		plugin.queueService.addBatch(changes);
		closePopup();
	}

	function attachFolderSuggest(el: HTMLElement) {
		const suggest = new FolderSuggest(
			plugin.app,
			el as HTMLInputElement,
			(path: string) => {
				moveTargetFolder = path;
				(el as HTMLInputElement).value = path;
			},
		);
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
		if (activePopup === "active-filters" && popupOpen) {
			refreshActiveFiltersPopup();
		}
	});

	// ─── Lifecycle ────────────────────────────────────────────────────────────

	onMount(() => {
		const onFilterChanged = () => {
			refreshFiles();
			refreshActiveFilterHighlights();
			updateStats();
			if (activePopup === "active-filters") {
				refreshActiveFiltersPopup();
			}
		};
		const onVaultResolved = () => {
			refreshFiles();
		};
		const onQueueChanged = () => {
			refreshQueue();
			if (plugin.queueService.isEmpty && queueIslandOpen) {
				closeQueueIsland();
			}
			queueIsland?.render();
		};

		plugin.filterService.on("changed", onFilterChanged);
		plugin.queueService.on("changed", onQueueChanged);

		refreshFiles();
		refreshQueue();

		// Re-render file list + prop browser when vault finishes indexing
		plugin.app.metadataCache.on("resolved", onVaultResolved);

		return () => {
			plugin.filterService.off("changed", onFilterChanged);
			plugin.queueService.off("changed", onQueueChanged);
			plugin.app.metadataCache.off("resolved", onVaultResolved);
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
					{#if pageId === "ops"}
						<OperationsPage
							{plugin}
							getSelectedFiles={() =>
								fileList?.getSelectedFiles() ?? []}
							{openMovePopup}
							{filteredCount}
							{selectedCount}
							{icon}
						/>
					{:else if pageId === "statistics"}
						<StatisticsPage {plugin} />
					{:else if pageId === "filters"}
						<FiltersPage
							{plugin}
							bind:filtersActiveTab
							bind:filtersSearch
							bind:filtersSearchCategory
							bind:tagsExplorer
							bind:propExplorer
							bind:fileList
							bind:selectedCount
						/>
					{/if}
				{/key}
			</div>
		{/each}
	</div>

	<!-- ─── Queue island container — floats above bottom nav ────────────────────── -->
	<div class="obsiman-queue-island-wrap" bind:this={queueIslandEl}></div>

	<BottomNav
		{pageOrder}
		{activePage}
		{pageLabels}
		{pageIcons}
		{leftFab}
		{rightFab}
		{navCollapsed}
		bind:isReordering
		{reorderTargetIdx}
		bind:pillEl
		{selectedCount}
		{filterRuleCount}
		{queuedCount}
		{bindNav}
		{onCollapsedNavClick}
		{onNavIconPointerDown}
		{onPillPointerMove}
		{onPillPointerUp}
		{exitReorder}
		{navigateTo}
		{icon}
	/>
</div>

<PopupOverlay
	{plugin}
	{activePopup}
	{popupOpen}
	{closePopup}
	{activeFilterRules}
	{refreshActiveFiltersPopup}
	{updateStats}
	{toggleFilterRule}
	{deleteFilterRule}
	{scopeOptions}
	{setScope}
	{setViewMode}
	bind:searchName
	bind:searchFolder
	{moveTargetFiles}
	bind:moveTargetFolder
	{movePreviews}
	{attachFolderSuggest}
	{queueMoves}
	{icon}
/>
