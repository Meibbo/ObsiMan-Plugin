<script lang="ts" generics="TMeta = unknown">
	import type { TFile } from 'obsidian';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { VaultmanPlugin } from '../../main';
	import type { ExplorerProvider, ExplorerViewMode } from '../../types/typeExplorer';
	import type { INodeSelectionService, NodeSelectionSnapshot } from '../../types/typeSelection';
	import type { ViewEmptyState } from '../../types/typeViews';
	import ViewTree from '../views/viewTree.svelte';
	import ViewNodeGrid from '../views/ViewNodeGrid.svelte';
	import ViewEmptyLanding from '../views/viewEmptyLanding.svelte';
	import { getActivePerfProbe } from '../../dev/perfProbe';
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
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	} = $props();

	let nodes = $state<TreeNode<TMeta>[]>([]);
	let flatFiles = $state<TFile[]>([]);
	let rootEl: HTMLDivElement | undefined = $state();
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
	const displayNodes = $derived(resolveDisplayNodes(nodes, expandedIds));
	const gridNodes = $derived(viewMode === 'grid' ? flattenTreeNodes(nodes) : []);
	const emptyState = $derived.by(() => resolveEmptyState(viewMode, searchTerm, provider));
	const fallbackItemCount = $derived(flatFiles.length + nodes.length);
	const fallbackState = $derived.by(() =>
		resolveFallbackState(viewMode, fallbackItemCount, emptyState),
	);
	const isTreeEmpty = $derived(viewMode === 'tree' && nodes.length === 0);
	const isGridEmpty = $derived(viewMode === 'grid' && gridNodes.length === 0);
	let lastCommittedSelectionKey = '';

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

	function refreshData() {
		if (viewMode === 'tree') {
			nodes = readProviderTree();
			flatFiles = [];
		} else if (viewMode === 'grid') {
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
		commitSelection(selectionService.selectPointer(provider.id, visibleNodeIds(), id, { additive, range }));
	}

	function handlePrimaryAction(id: string, e: MouseEvent) {
		const node = findNodeById(nodes, id);
		if (!node) return;
		const additive = e.ctrlKey || e.metaKey;
		const range = e.shiftKey;
		commitSelection(selectionService.selectPointer(provider.id, visibleNodeIds(), id, { additive, range }));
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
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
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

	function toggleExpand(id: string) {
		if (expandedIds.has(id)) {
			manualExpandedIds.delete(id);
			manualCollapsedIds.add(id);
		} else {
			manualExpandedIds.add(id);
			manualCollapsedIds.delete(id);
		}
	}

	function handleBoxSelect(ids: string[], e: PointerEvent) {
		commitSelection(
			selectionService.selectBox(provider.id, visibleNodeIds(), ids, {
				additive: e.ctrlKey || e.metaKey,
			}),
		);
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
		if (viewMode === 'grid') return flattenTreeNodes(nodes).map((node) => node.id);
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

	function flattenTreeNodes(items: TreeNode<TMeta>[]): TreeNode<TMeta>[] {
		const out: TreeNode<TMeta>[] = [];
		const walk = (list: TreeNode<TMeta>[]) => {
			for (const node of list) {
				out.push(node);
				if (node.children) walk(node.children);
			}
		};
		walk(items);
		return out;
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
			{#if isGridEmpty}
				<ViewEmptyLanding state={emptyState} {icon} />
			{:else}
				<ViewNodeGrid
					nodes={gridNodes}
					selectedIds={selectedNodeIds}
					focusedId={focusedNodeId}
					activeId={selectionSnapshot.activeId}
					onTileClick={handleNodeClick}
					onPrimaryAction={handlePrimaryAction}
					onBoxSelect={handleBoxSelect}
					onContextMenu={handleContextMenu}
					onTileKeydown={handleRowKeydown}
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
	.vm-fallback-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
		overflow: hidden;
	}
</style>
