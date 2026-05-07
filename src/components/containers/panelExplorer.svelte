<script lang="ts" generics="TMeta = unknown">
	import type { TFile } from 'obsidian';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { VaultmanPlugin } from '../../main';
	import type {
		ExplorerExpansionCommand,
		ExplorerExpansionSummary,
		ExplorerProvider,
		ExplorerViewMode,
	} from '../../types/typeExplorer';
	import type { INodeSelectionService, NodeSelectionSnapshot } from '../../types/typeSelection';
	import type { ViewEmptyState } from '../../types/typeViews';
	import GridNavigationToolbar from '../layout/GridNavigationToolbar.svelte';
	import ViewTree from '../views/viewTree.svelte';
	import ViewNodeGrid from '../views/ViewNodeGrid.svelte';
	import ViewNodeTable from '../views/ViewNodeTable.svelte';
	import ViewEmptyLanding from '../views/viewEmptyLanding.svelte';
	import { getActivePerfProbe } from '../../dev/perfProbe';
	import { nodeRowsFromTree, nodeTableColumnsForProvider } from '../../services/serviceViewTableAdapter';
	import { NodeSelectionService } from '../../services/serviceSelection.svelte';
	import type { TreeNode } from '../../types/typeNode';
	import { bubbleHiddenTreeBadges } from '../../utils/utilBadgeBubbling';
	import { collectAutoExpandedIds, resolveExpandedIds } from '../../utils/utilExplorerExpansion';

	let {
		plugin,
		provider,
		viewMode = $bindable('tree'),
		searchTerm = $bindable(''),
		searchMode = 0,
		sortBy = $bindable('name'),
		sortDirection = $bindable('asc'),
		addMode = false,
		active = true,
		showSelectedOnly = false,
		selectedFiles = $bindable(new Set<string>()),
		nodeExpansionCommand = null,
		onNodeExpansionSummaryChange,
		icon,
	}: {
		plugin: VaultmanPlugin;
		provider: ExplorerProvider<TMeta>;
		viewMode?: ExplorerViewMode;
		searchTerm?: string;
		searchMode?: number;
		sortBy?: string;
		sortDirection?: 'asc' | 'desc';
		addMode?: boolean;
		active?: boolean;
		showSelectedOnly?: boolean;
		selectedFiles?: Set<string>;
		nodeExpansionCommand?: ExplorerExpansionCommand | null;
		onNodeExpansionSummaryChange?: (summary: ExplorerExpansionSummary) => void;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	} = $props();

	let nodes = $state<TreeNode<TMeta>[]>([]);
	let flatFiles = $state<TFile[]>([]);
	let rootEl: HTMLDivElement | undefined = $state();
	let currentGridParentId = $state<string | null>(null);
	let gridBackStack = $state<(string | null)[]>([]);
	let gridForwardStack = $state<(string | null)[]>([]);
	const manualExpandedIds = new SvelteSet<string>();
	const manualCollapsedIds = new SvelteSet<string>();
	const fallbackSelectionService = new NodeSelectionService();
	const selectionService = $derived(
		((plugin as VaultmanPlugin & { selectionService?: INodeSelectionService }).selectionService ??
			fallbackSelectionService) as INodeSelectionService,
	);
	const selectionSnapshot = $derived(selectionService.snapshot(provider.id));
	const selectedNodeIds = $derived(new Set(selectionSnapshot.ids));
	const focusedNodeId = $derived(selectionSnapshot.focusedId);
	let previousSearchTerm = '';
	const autoExpandedIds = $derived(
		collectAutoExpandedIds(nodes, { searchTerm, smallTreeThreshold: 8 }),
	);
	const expandedIds = $derived(
		resolveExpandedIds({
			manualExpandedIds,
			manualCollapsedIds,
			autoExpandedIds,
		}),
	);
	const expandableNodeIds = $derived(collectExpandableNodeIds(nodes));
	const hasExpandedParents = $derived(expandableNodeIds.some((id) => expandedIds.has(id)));
	const displayNodes = $derived(resolveDisplayNodes(nodes, expandedIds));
	const gridHierarchyMode = $derived.by((): 'folder' | 'inline' => {
		const configured = (
			plugin as VaultmanPlugin & {
				settings?: { gridHierarchyMode?: 'folder' | 'inline' };
			}
		).settings?.gridHierarchyMode;
		return configured === 'inline' ? 'inline' : 'folder';
	});
	const gridExpandedIds = $derived(
		gridHierarchyMode === 'inline' ? manualExpandedIds : expandedIds,
	);
	const currentGridPath = $derived(
		currentGridParentId ? findNodePath(nodes, currentGridParentId) : [],
	);
	const currentGridNodes = $derived(childrenForGridLocation(nodes, currentGridParentId));
	const gridNodes = $derived(
		viewMode === 'grid' ? (gridHierarchyMode === 'folder' ? currentGridNodes : nodes) : [],
	);
	const tableRows = $derived(viewMode === 'table' ? nodeRowsFromTree(nodes) : []);
	const tableColumns = $derived(nodeTableColumnsForProvider<TMeta>(provider.id));
	const emptyState = $derived.by(() => resolveEmptyState(viewMode, searchTerm, provider));
	const fallbackItemCount = $derived(flatFiles.length + nodes.length);
	const fallbackState = $derived.by(() =>
		resolveFallbackState(viewMode, fallbackItemCount, emptyState),
	);
	const isTreeEmpty = $derived(viewMode === 'tree' && nodes.length === 0);
	const isGridEmpty = $derived(viewMode === 'grid' && gridNodes.length === 0);
	const isTableEmpty = $derived(viewMode === 'table' && tableRows.length === 0);
	let lastCommittedSelectionKey = '';
	let lastExpansionSummaryKey = '';
	let lastExpansionCommandSerial = -1;

	$effect(() => {
		// React directly to prop changes
		const mode: 'leaf' | 'all' = searchMode === 1 ? 'leaf' : 'all';
		provider.setSearchTerm?.(searchTerm, mode);
		provider.setSortBy?.(sortBy, sortDirection);
		provider.setViewMode?.(viewMode);
		provider.setAddMode?.(addMode);
		provider.setShowSelectedOnly?.(showSelectedOnly);
		if (active) untrack(refreshData);
	});

	$effect(() => {
		const normalizedSearch = searchTerm.trim();
		if (normalizedSearch !== previousSearchTerm) {
			manualCollapsedIds.clear();
			previousSearchTerm = normalizedSearch;
		}
	});

	$effect(() => {
		if (!active) return;
		const refresh = () => untrack(refreshData);
		const unsubscribeOperations = plugin.operationsIndex.subscribe(refresh);
		const unsubscribeActiveFilters = plugin.activeFiltersIndex.subscribe(refresh);
		return () => {
			unsubscribeOperations();
			unsubscribeActiveFilters();
		};
	});

	$effect(() => {
		if (!active) return;
		const snapshot = selectionService.prune(provider.id, visibleNodeIds());
		untrack(() => commitSelection(snapshot));
	});

	$effect(() => {
		if (viewMode !== 'grid' || gridHierarchyMode !== 'folder') return;
		if (currentGridParentId && !findNodeById(nodes, currentGridParentId)) {
			currentGridParentId = null;
			gridBackStack = [];
			gridForwardStack = [];
		}
	});

	$effect(() => {
		const summary = {
			canToggle: expandableNodeIds.length > 0,
			hasExpandedParents,
		};
		const key = `${summary.canToggle}:${summary.hasExpandedParents}`;
		if (key === lastExpansionSummaryKey) return;
		lastExpansionSummaryKey = key;
		onNodeExpansionSummaryChange?.(summary);
	});

	$effect(() => {
		if (!nodeExpansionCommand || nodeExpansionCommand.serial === lastExpansionCommandSerial) {
			return;
		}
		lastExpansionCommandSerial = nodeExpansionCommand.serial;
		if (nodeExpansionCommand.action === 'expand-all') {
			expandAllParents();
		} else {
			collapseAllParents();
		}
	});

	function refreshData() {
		if (viewMode === 'tree') {
			nodes = readProviderTree();
			flatFiles = [];
		} else if (viewMode === 'grid') {
			nodes = readProviderTree();
			flatFiles = [];
		} else if (viewMode === 'table') {
			nodes = readProviderTree();
			flatFiles = [];
		} else {
			const files = provider.getFiles?.() || [];
			getActivePerfProbe()?.count('panelExplorer.getFiles', { rows: files.length });
			flatFiles = files;
			nodes = files.length === 0 ? readProviderTree() : [];
		}
	}

	function readProviderTree(): TreeNode<TMeta>[] {
		return (
			getActivePerfProbe()?.measure('panelExplorer.getTree', undefined, () => provider.getTree()) ??
			provider.getTree()
		);
	}

	function resolveDisplayNodes(
		items: TreeNode<TMeta>[],
		expanded: ReadonlySet<string>,
	): TreeNode<TMeta>[] {
		return (
			getActivePerfProbe()?.measure(
				'panelExplorer.bubbleHiddenTreeBadges',
				{ nodes: items.length },
				() => bubbleHiddenTreeBadges(items, expanded),
			) ?? bubbleHiddenTreeBadges(items, expanded)
		);
	}

	function handleNodeClick(id: string, e: MouseEvent) {
		const node = findNodeById(nodes, id);
		if (!node) return;

		const additive = e.ctrlKey || e.metaKey;
		const range = e.shiftKey;
		commitSelection(
			selectionService.selectPointer(provider.id, visibleNodeIds(), id, { additive, range }),
		);
	}

	function handlePrimaryAction(id: string, e: MouseEvent) {
		const node = findNodeById(nodes, id);
		if (!node) return;
		const additive = e.ctrlKey || e.metaKey;
		const range = e.shiftKey;
		commitSelection(
			selectionService.selectPointer(provider.id, visibleNodeIds(), id, { additive, range }),
		);
		if (viewMode === 'grid' && gridHierarchyMode === 'folder' && node.children?.length) {
			navigateGridTo(node.id);
			return;
		}
		activateNode(node);
	}

	function handleContextMenu(id: string, e: MouseEvent) {
		e.preventDefault();
		const node = findNodeById(nodes, id);
		if (!node) return;
		if (!selectedNodeIds.has(id)) {
			commitSelection(selectionService.selectPointer(provider.id, visibleNodeIds(), id));
		}
		provider.handleContextMenu(node, e, selectedNodesForContext(node));
	}

	function handleRowKeydown(id: string, e: KeyboardEvent) {
		if (viewMode === 'grid' && gridHierarchyMode === 'folder' && handleGridNavigationKeydown(e)) {
			return;
		}
		if (
			viewMode === 'grid' &&
			gridHierarchyMode === 'inline' &&
			handleInlineGridExpansionKeydown(id, e)
		) {
			return;
		}
		if (viewMode === 'tree' && e.key === 'ArrowLeft') {
			handleTreeArrowLeft(id, e);
		} else if (viewMode === 'tree' && e.key === 'ArrowRight') {
			handleTreeArrowRight(id, e);
		} else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			if (!focusedNodeId) selectionService.setFocused(provider.id, id);
			commitSelection(
				selectionService.moveFocus(provider.id, visibleNodeIds(), e.key === 'ArrowDown' ? 1 : -1, {
					additive: e.ctrlKey || e.metaKey,
					range: e.shiftKey,
				}),
			);
		} else if (e.key === ' ' || e.key === 'Spacebar') {
			e.preventDefault();
			if (!focusedNodeId) selectionService.setFocused(provider.id, id);
			commitSelection(
				selectionService.toggleFocused(provider.id, visibleNodeIds(), {
					additive: e.ctrlKey || e.metaKey,
					range: e.shiftKey,
				}),
			);
		} else if (e.key === 'Enter') {
			const node = findNodeById(nodes, id);
			if (node) handlePrimaryAction(id, e as unknown as MouseEvent);
		}
	}

	function handleInlineGridExpansionKeydown(id: string, e: KeyboardEvent): boolean {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return false;
		const node = findNodeById(nodes, id);
		const hasChildren = !!node?.children && node.children.length > 0;
		if (!hasChildren) return false;
		if (e.key === 'ArrowRight' && !gridExpandedIds.has(id)) {
			e.preventDefault();
			expandNode(id);
			return true;
		}
		if (e.key === 'ArrowLeft' && gridExpandedIds.has(id)) {
			e.preventDefault();
			collapseNode(id);
			return true;
		}
		return false;
	}

	function handleGridNavigationKeydown(e: KeyboardEvent): boolean {
		if (e.altKey && e.key === 'ArrowLeft') {
			e.preventDefault();
			navigateGridBack();
			return true;
		}
		if (e.altKey && e.key === 'ArrowRight') {
			e.preventDefault();
			navigateGridForward();
			return true;
		}
		if (e.key === 'Backspace' || (e.altKey && e.key === 'ArrowUp')) {
			e.preventDefault();
			navigateGridUp();
			return true;
		}
		return false;
	}

	function handleTreeArrowLeft(id: string, e: KeyboardEvent) {
		const node = findNodeById(nodes, id);
		if (!node) return;
		const hasChildren = !!node.children && node.children.length > 0;
		if (hasChildren && expandedIds.has(id)) {
			e.preventDefault();
			collapseNode(id);
			return;
		}
		const parentId = parentIdFor(nodes, id);
		if (!parentId) return;
		e.preventDefault();
		commitSelection(selectionService.selectPointer(provider.id, visibleNodeIds(), parentId));
	}

	function handleTreeArrowRight(id: string, e: KeyboardEvent) {
		const node = findNodeById(nodes, id);
		if (!node?.children || node.children.length === 0 || expandedIds.has(id)) return;
		e.preventDefault();
		expandNode(id);
	}

	function activateNode(node: TreeNode<TMeta>) {
		if (provider.handleNodeSelection) {
			provider.handleNodeSelection(selectedNodesForContext(node));
			return;
		}
		provider.handleNodeClick(node);
	}

	function handleBadgeClick(queueIndex: number) {
		const operation = plugin.operationsIndex.nodes[queueIndex];
		if (!operation) return;
		plugin.queueService.remove(operation.id);
	}

	function findNodeById(nodes: TreeNode<TMeta>[], id: string): TreeNode<TMeta> | undefined {
		for (const n of nodes) {
			if (n.id === id) return n;
			if (n.children) {
				const found = findNodeById(n.children, id);
				if (found) return found;
			}
		}
		return undefined;
	}

	function toggleExpand(id: string, _e?: MouseEvent | KeyboardEvent) {
		const targetExpandedIds =
			viewMode === 'grid' && gridHierarchyMode === 'inline' ? gridExpandedIds : expandedIds;
		if (targetExpandedIds.has(id)) {
			collapseNode(id);
		} else {
			expandNode(id);
		}
	}

	function expandNode(id: string) {
		manualExpandedIds.add(id);
		manualCollapsedIds.delete(id);
	}

	function collapseNode(id: string) {
		manualExpandedIds.delete(id);
		manualCollapsedIds.add(id);
	}

	function expandAllParents() {
		for (const id of expandableNodeIds) expandNode(id);
	}

	function collapseAllParents() {
		for (const id of expandableNodeIds) collapseNode(id);
	}

	function handleBoxSelect(ids: string[], e: PointerEvent) {
		commitSelection(
			selectionService.selectBox(provider.id, visibleNodeIds(), ids, {
				additive: e.ctrlKey || e.metaKey,
			}),
		);
	}

	function handleTableSelectAll(ids: string[], e: Event) {
		const additive = e instanceof MouseEvent ? e.ctrlKey || e.metaKey : false;
		commitSelection(selectionService.selectBox(provider.id, visibleNodeIds(), ids, { additive }));
	}

	function commitSelection(snapshot: NodeSelectionSnapshot) {
		const key = selectionKey(snapshot);
		if (key === lastCommittedSelectionKey) return;
		lastCommittedSelectionKey = key;
		plugin.viewService.clearSelection(provider.id);
		for (const id of snapshot.ids) plugin.viewService.select(provider.id, id, 'add');
		plugin.viewService.setFocused(provider.id, snapshot.focusedId);
		syncFileSelectionFromNodes(snapshot.ids);
	}

	function syncFileSelectionFromNodes(ids: ReadonlySet<string>) {
		if (provider.id !== 'files') return;
		const files = [...ids]
			.map((id) => findNodeById(nodes, id))
			.map((node) => (node ? nodeFile(node) : null))
			.filter((file): file is TFile => Boolean(file));
		selectedFiles = new Set(files.map((file) => file.path));
		plugin.filterService.setSelectedFiles(files);
		if (showSelectedOnly) untrack(refreshData);
	}

	function selectionKey(snapshot: NodeSelectionSnapshot): string {
		return [
			[...snapshot.ids].join('\u0000'),
			snapshot.anchorId ?? '',
			snapshot.focusedId ?? '',
			snapshot.hoveredId ?? '',
		].join('\u0001');
	}

	function nodeFile(node: TreeNode<TMeta>): TFile | null {
		const meta = node.meta as { file?: TFile; isFolder?: boolean } | undefined;
		if (!meta?.file || meta.isFolder) return null;
		return meta.file;
	}

	function visibleNodeIds(): string[] {
		if (viewMode === 'grid') {
			if (gridHierarchyMode === 'inline') return collectVisibleHierarchyIds(nodes, gridExpandedIds);
			return gridNodes.map((node) => node.id);
		}
		if (viewMode === 'table') return tableRows.map((row) => row.id);
		const ids: string[] = [];
		const walk = (items: TreeNode<TMeta>[]) => {
			for (const node of items) {
				ids.push(node.id);
				if (node.children && expandedIds.has(node.id)) walk(node.children);
			}
		};
		walk(nodes);
		return ids;
	}

	function navigateGridTo(parentId: string | null, recordHistory = true) {
		if (parentId === currentGridParentId) return;
		if (recordHistory) {
			gridBackStack = [...gridBackStack, currentGridParentId];
			gridForwardStack = [];
		}
		currentGridParentId = parentId;
		clearNodeSelection();
	}

	function navigateGridBack() {
		if (gridBackStack.length === 0) return;
		const previous = gridBackStack[gridBackStack.length - 1];
		gridBackStack = gridBackStack.slice(0, -1);
		gridForwardStack = [currentGridParentId, ...gridForwardStack];
		currentGridParentId = previous;
		clearNodeSelection();
	}

	function navigateGridForward() {
		if (gridForwardStack.length === 0) return;
		const next = gridForwardStack[0];
		gridForwardStack = gridForwardStack.slice(1);
		gridBackStack = [...gridBackStack, currentGridParentId];
		currentGridParentId = next;
		clearNodeSelection();
	}

	function navigateGridUp() {
		if (!currentGridParentId) return;
		const path = findNodePath(nodes, currentGridParentId);
		const parent = path.length > 1 ? path[path.length - 2] : null;
		navigateGridTo(parent?.id ?? null);
	}

	function refreshGridLocation() {
		refreshData();
		if (currentGridParentId && !findNodeById(nodes, currentGridParentId)) {
			currentGridParentId = null;
			gridBackStack = [];
			gridForwardStack = [];
		}
	}

	function collectExpandableNodeIds(items: TreeNode<TMeta>[]): string[] {
		const ids: string[] = [];
		const walk = (list: TreeNode<TMeta>[]) => {
			for (const node of list) {
				if (node.children && node.children.length > 0) {
					ids.push(node.id);
					walk(node.children);
				}
			}
		};
		walk(items);
		return ids;
	}

	function collectVisibleHierarchyIds(
		items: TreeNode<TMeta>[],
		expanded: ReadonlySet<string>,
	): string[] {
		const ids: string[] = [];
		const walk = (list: TreeNode<TMeta>[]) => {
			for (const node of list) {
				ids.push(node.id);
				if (node.children && expanded.has(node.id)) walk(node.children);
			}
		};
		walk(items);
		return ids;
	}

	function parentIdFor(items: TreeNode<TMeta>[], childId: string): string | null {
		for (const node of items) {
			if (node.children?.some((child) => child.id === childId)) return node.id;
			if (node.children) {
				const found = parentIdFor(node.children, childId);
				if (found) return found;
			}
		}
		return null;
	}

	function findNodePath(items: TreeNode<TMeta>[], id: string): TreeNode<TMeta>[] {
		for (const node of items) {
			if (node.id === id) return [node];
			if (node.children) {
				const childPath = findNodePath(node.children, id);
				if (childPath.length > 0) return [node, ...childPath];
			}
		}
		return [];
	}

	function childrenForGridLocation(
		items: TreeNode<TMeta>[],
		parentId: string | null,
	): TreeNode<TMeta>[] {
		if (!parentId) return items;
		const parent = findNodeById(items, parentId);
		return parent?.children ? [...parent.children] : [];
	}

	function selectedNodesForContext(node: TreeNode<TMeta>): TreeNode<TMeta>[] {
		const clickedType = provider.getNodeType?.(node);
		const selected = [...selectedNodeIds]
			.map((id) => findNodeById(nodes, id))
			.filter((candidate): candidate is TreeNode<TMeta> => Boolean(candidate));
		if (!clickedType) return selected.length > 0 ? selected : [node];
		const sameType = selected.filter(
			(candidate) => provider.getNodeType?.(candidate) === clickedType,
		);
		return sameType.length > 0 ? sameType : [node];
	}

	function clearNodeSelection() {
		commitSelection(selectionService.clear(provider.id));
	}

	function handleDocumentClick(e: MouseEvent) {
		if (!active || !rootEl) return;
		const target = e.target instanceof Node ? e.target : null;
		if (target && rootEl.contains(target)) return;
		clearNodeSelection();
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if (!active || e.key !== 'Escape') return;
		clearNodeSelection();
	}

	function resolveEmptyState(
		mode: ExplorerViewMode,
		term: string,
		source: ExplorerProvider<TMeta>,
	): ViewEmptyState {
		const fromProvider = source.getEmptyState?.({ mode, searchTerm: term }) ?? source.empty;
		if (fromProvider) return fromProvider;
		if (term.trim()) {
			return {
				kind: 'search',
				label: 'No matches',
				detail: 'Try a different search term.',
				icon: 'lucide-search',
			};
		}
		if (mode === 'grid') {
			return {
				kind: 'empty',
				label: 'No files',
				detail: 'This view has no files to show.',
				icon: 'lucide-files',
			};
		}
		return {
			kind: 'empty',
			label: 'No items',
			detail: 'This explorer has no items to show.',
			icon: 'lucide-inbox',
		};
	}

	function resolveFallbackState(
		mode: ExplorerViewMode,
		itemCount: number,
		empty: ViewEmptyState,
	): ViewEmptyState {
		if (itemCount === 0) return empty;
		return {
			kind: 'empty',
			label: `${mode[0].toUpperCase()}${mode.slice(1)} view not available`,
			detail: 'Switch to tree or grid to inspect these items.',
			icon: 'lucide-layout-list',
		};
	}
</script>

<svelte:document onclick={handleDocumentClick} />
<svelte:window onkeydown={handleWindowKeydown} />

<div class="vm-panel-explorer" bind:this={rootEl}>
	{#if viewMode === 'tree'}
		<div class="vm-tree-container">
			{#if isTreeEmpty}
				<ViewEmptyLanding state={emptyState} {icon} />
			{:else}
				<ViewTree
					nodes={displayNodes}
					{expandedIds}
					selectedIds={selectedNodeIds}
					focusedId={focusedNodeId}
					onToggle={toggleExpand}
					onRowClick={handleNodeClick}
					onPrimaryAction={handlePrimaryAction}
					onBoxSelect={handleBoxSelect}
					onContextMenu={handleContextMenu}
					onRowKeydown={handleRowKeydown}
					onBadgeDoubleClick={handleBadgeClick}
					{icon}
				/>
			{/if}
		</div>
	{:else if viewMode === 'grid'}
		<div class="vm-grid-container">
			{#if gridHierarchyMode === 'folder'}
				<GridNavigationToolbar
					path={currentGridPath}
					canBack={gridBackStack.length > 0}
					canForward={gridForwardStack.length > 0}
					canUp={currentGridParentId !== null}
					onBack={navigateGridBack}
					onForward={navigateGridForward}
					onUp={navigateGridUp}
					onRefresh={refreshGridLocation}
					onNavigateRoot={() => navigateGridTo(null)}
					onNavigateCrumb={(id) => navigateGridTo(id)}
					{icon}
				/>
			{/if}
			{#if isGridEmpty}
				<ViewEmptyLanding state={emptyState} {icon} />
			{:else}
				<ViewNodeGrid
					nodes={gridNodes}
					selectedIds={selectedNodeIds}
					focusedId={focusedNodeId}
					activeId={selectionSnapshot.activeId}
					hierarchyMode={gridHierarchyMode}
					expandedIds={gridHierarchyMode === 'inline' ? gridExpandedIds : undefined}
					onTileClick={handleNodeClick}
					onPrimaryAction={handlePrimaryAction}
					onBoxSelect={handleBoxSelect}
					onContextMenu={handleContextMenu}
					onTileKeydown={handleRowKeydown}
					onToggleExpand={toggleExpand}
					{icon}
				/>
			{/if}
		</div>
	{:else if viewMode === 'table'}
		<div class="vm-table-container">
			{#if isTableEmpty}
				<ViewEmptyLanding state={emptyState} {icon} />
			{:else}
				<ViewNodeTable
					rows={tableRows}
					columns={tableColumns}
					selectedIds={selectedNodeIds}
					focusedId={focusedNodeId}
					activeId={selectionSnapshot.activeId}
					onRowClick={handleNodeClick}
					onPrimaryAction={handlePrimaryAction}
					onContextMenu={handleContextMenu}
					onRowKeydown={handleRowKeydown}
					onSelectAll={(ids, e) => handleTableSelectAll(ids, e)}
					{icon}
				/>
			{/if}
		</div>
	{:else}
		<div class="vm-fallback-container">
			<ViewEmptyLanding state={fallbackState} {icon} />
		</div>
	{/if}
</div>

<style>
	.vm-tree-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
		overflow: hidden;
	}
	.vm-grid-container {
		flex: 1;
		overflow: hidden;
		min-height: 0;
		height: 100%;
	}
	.vm-table-container {
		flex: 1;
		overflow: hidden;
		min-height: 0;
		height: 100%;
	}
	.vm-fallback-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
		overflow: hidden;
	}
</style>
