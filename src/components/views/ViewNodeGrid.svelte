<script lang="ts">
	import { untrack } from 'svelte';
	import { createVirtualizer } from '@tanstack/svelte-virtual';
	import type { Rect, Virtualizer } from '@tanstack/svelte-virtual';
	import type { TreeNode } from '../../types/typeNode';
	import {
		visibleHoverBadges,
		type ActiveOpsByNode,
		type BadgeKind,
	} from '../../services/badgeRegistry';

	const HOVER_BADGE_ICONS: Record<BadgeKind, string> = {
		set: 'lucide-pencil-line',
		rename: 'lucide-text-cursor-input',
		convert: 'lucide-replace',
		delete: 'lucide-trash-2',
		filter: 'lucide-filter',
	};

	const HOVER_BADGE_LABELS: Record<BadgeKind, string> = {
		set: 'Set',
		rename: 'Rename',
		convert: 'Convert',
		delete: 'Delete',
		filter: 'Filter',
	};

	const GRID_TILE_MIN_WIDTH = 128;
	const GRID_TILE_HEIGHT = 54;
	const GRID_GAP = 8;
	const GRID_PADDING = 8;
	const GRID_FALLBACK_WIDTH = 480;
	const GRID_FALLBACK_HEIGHT = 360;
	const GRID_OVERSCAN = 3;
	const GRID_ROW_HEIGHT = GRID_TILE_HEIGHT + GRID_GAP;

	interface Props {
		nodes: TreeNode[];
		selectedIds?: Set<string>;
		focusedId?: string | null;
		activeId?: string | null;
		onTileClick: (id: string, e: MouseEvent) => void;
		onPrimaryAction?: (id: string, e: MouseEvent) => void;
		onBoxSelect?: (ids: string[], e: PointerEvent) => void;
		onContextMenu: (id: string, e: MouseEvent) => void;
		onTileKeydown?: (id: string, e: KeyboardEvent) => void;
		onHoverBadgeAction?: (id: string, kind: BadgeKind, e: MouseEvent | KeyboardEvent) => void;
		activeOpsByNode?: ActiveOpsByNode;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		nodes,
		selectedIds,
		focusedId,
		activeId,
		onTileClick,
		onPrimaryAction,
		onBoxSelect,
		onContextMenu,
		onTileKeydown,
		onHoverBadgeAction,
		activeOpsByNode,
		icon,
	}: Props = $props();

	function hoverBadgesFor(node: TreeNode): BadgeKind[] {
		if (!activeOpsByNode) return [];
		return visibleHoverBadges({ id: node.id }, activeOpsByNode);
	}

	function handleHoverBadgePress(e: MouseEvent | KeyboardEvent, id: string, kind: BadgeKind) {
		e.stopPropagation();
		e.preventDefault();
		onHoverBadgeAction?.(id, kind, e);
	}

	function handleHoverBadgeKeydown(e: KeyboardEvent, id: string, kind: BadgeKind) {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
			handleHoverBadgePress(e, id, kind);
		}
	}

	let outerEl: HTMLDivElement | undefined = $state();
	let gridWidth = $state(GRID_FALLBACK_WIDTH);
	let columnCount = $state(1);
	let dragStart = $state<{ x: number; y: number; pointerId: number } | null>(null);
	let selectionBox = $state<{
		left: number;
		top: number;
		width: number;
		height: number;
	} | null>(null);
	let suppressNextClick = false;
	let gridMetricsFrame: number | null = null;

	const rowCount = $derived(Math.ceil(nodes.length / columnCount));
	const rowVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => outerEl ?? null,
		estimateSize: () => GRID_ROW_HEIGHT,
		observeElementRect: observeGridRect,
		overscan: GRID_OVERSCAN,
		initialRect: { width: GRID_FALLBACK_WIDTH, height: GRID_FALLBACK_HEIGHT },
	});
	const virtualRows = $derived($rowVirtualizer.getVirtualItems());
	const totalHeight = $derived($rowVirtualizer.getTotalSize() + GRID_PADDING * 2);

	$effect(() => {
		const count = rowCount;
		const scrollElement = outerEl;
		const width = gridWidth;
		untrack(() =>
			$rowVirtualizer.setOptions({
			count,
			getScrollElement: () => scrollElement ?? null,
			estimateSize: () => GRID_ROW_HEIGHT,
			observeElementRect: observeGridRect,
			overscan: GRID_OVERSCAN,
			initialRect: { width, height: GRID_FALLBACK_HEIGHT },
			}),
		);
	});

	$effect(() => {
		if (!outerEl) return;
		updateGridMetrics();
		if (typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(scheduleGridMetricsUpdate);
		ro.observe(outerEl);
		return () => {
			if (gridMetricsFrame !== null) cancelAnimationFrame(gridMetricsFrame);
			gridMetricsFrame = null;
			ro.disconnect();
		};
	});

	function handleTileClick(id: string, e: MouseEvent) {
		if (suppressNextClick) {
			suppressNextClick = false;
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		onTileClick(id, e);
	}

	function handleTileKeydown(id: string, e: KeyboardEvent) {
		onTileKeydown?.(id, e);
	}

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0 || !outerEl || shouldIgnoreBoxStart(e.target)) return;
		dragStart = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
		selectionBox = null;
		capturePointer(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragStart || !outerEl || e.pointerId !== dragStart.pointerId) return;
		const dx = e.clientX - dragStart.x;
		const dy = e.clientY - dragStart.y;
		if (!selectionBox && Math.hypot(dx, dy) < 4) return;
		e.preventDefault();
		selectionBox = makeSelectionBox(dragStart.x, dragStart.y, e.clientX, e.clientY);
	}

	function handlePointerUp(e: PointerEvent) {
		if (!dragStart || e.pointerId !== dragStart.pointerId) return;
		const box = selectionBox;
		releasePointer(e.pointerId);
		dragStart = null;
		selectionBox = null;
		if (!box) return;
		const ids = intersectingTileIds(box);
		suppressNextClick = true;
		if (ids.length > 0) onBoxSelect?.(ids, e);
	}

	function handlePointerCancel() {
		if (dragStart) releasePointer(dragStart.pointerId);
		dragStart = null;
		selectionBox = null;
	}

	function releasePointer(pointerId: number) {
		if (!outerEl?.hasPointerCapture(pointerId)) return;
		outerEl.releasePointerCapture(pointerId);
	}

	function capturePointer(pointerId: number) {
		if (!outerEl) return;
		try {
			outerEl.setPointerCapture(pointerId);
		} catch {
			// Synthetic CLI/test pointer events do not always create a capturable pointer.
		}
	}

	function shouldIgnoreBoxStart(target: EventTarget | null): boolean {
		const el = target instanceof HTMLElement ? target : null;
		return Boolean(
			el?.closest('input, textarea, select, button, .vm-badge, [role="button"]'),
		);
	}

	function makeSelectionBox(startX: number, startY: number, endX: number, endY: number) {
		const outerRect = outerEl!.getBoundingClientRect();
		const startLeft = startX - outerRect.left + outerEl!.scrollLeft;
		const startTop = startY - outerRect.top + outerEl!.scrollTop;
		const endLeft = endX - outerRect.left + outerEl!.scrollLeft;
		const endTop = endY - outerRect.top + outerEl!.scrollTop;
		return {
			left: Math.min(startLeft, endLeft),
			top: Math.min(startTop, endTop),
			width: Math.abs(endLeft - startLeft),
			height: Math.abs(endTop - startTop),
		};
	}

	function intersectingTileIds(box: NonNullable<typeof selectionBox>): string[] {
		const ids: string[] = [];
		const metrics = gridMetrics();
		const boxRect = rectFromBox(box);
		for (let index = 0; index < nodes.length; index += 1) {
			const tileRect = tileRectFor(index, metrics);
			if (rectsIntersect(boxRect, tileRect)) ids.push(nodes[index].id);
		}
		return ids;
	}

	function updateGridMetrics() {
		const width = outerEl?.clientWidth || GRID_FALLBACK_WIDTH;
		gridWidth = width;
		columnCount = columnsForWidth(width);
	}

	function scheduleGridMetricsUpdate() {
		if (typeof requestAnimationFrame === 'undefined') {
			updateGridMetrics();
			return;
		}
		if (gridMetricsFrame !== null) return;
		gridMetricsFrame = requestAnimationFrame(() => {
			gridMetricsFrame = null;
			updateGridMetrics();
		});
	}

	function observeGridRect(
		_: Virtualizer<HTMLDivElement, HTMLDivElement>,
		cb: (rect: Rect) => void,
	): () => void {
		let rectFrame: number | null = null;
		const emit = () => {
			cb({
				width: outerEl?.clientWidth || gridWidth || GRID_FALLBACK_WIDTH,
				height: outerEl?.clientHeight || GRID_FALLBACK_HEIGHT,
			});
		};
		const schedule = () => {
			if (typeof requestAnimationFrame === 'undefined') {
				emit();
				return;
			}
			if (rectFrame !== null) return;
			rectFrame = requestAnimationFrame(() => {
				rectFrame = null;
				emit();
			});
		};
		schedule();
		if (!outerEl || typeof ResizeObserver === 'undefined') return () => {};
		const ro = new ResizeObserver(schedule);
		ro.observe(outerEl);
		return () => {
			if (rectFrame !== null) cancelAnimationFrame(rectFrame);
			ro.disconnect();
		};
	}

	function columnsForWidth(width: number): number {
		const contentWidth = Math.max(GRID_TILE_MIN_WIDTH, width - GRID_PADDING * 2);
		return Math.max(1, Math.floor((contentWidth + GRID_GAP) / (GRID_TILE_MIN_WIDTH + GRID_GAP)));
	}

	function gridMetrics() {
		const columns = columnCount;
		const width = outerEl?.clientWidth || gridWidth || GRID_FALLBACK_WIDTH;
		const contentWidth = Math.max(GRID_TILE_MIN_WIDTH, width - GRID_PADDING * 2);
		const tileWidth = (contentWidth - GRID_GAP * (columns - 1)) / columns;
		return { columns, tileWidth };
	}

	function tileRectFor(index: number, metrics: ReturnType<typeof gridMetrics>): DOMRect {
		const row = Math.floor(index / metrics.columns);
		const column = index % metrics.columns;
		const left = GRID_PADDING + column * (metrics.tileWidth + GRID_GAP);
		const top = GRID_PADDING + row * GRID_ROW_HEIGHT;
		return new DOMRect(left, top, metrics.tileWidth, GRID_TILE_HEIGHT);
	}

	function rectFromBox(box: NonNullable<typeof selectionBox>): DOMRect {
		return new DOMRect(box.left, box.top, box.width, box.height);
	}

	function rectsIntersect(a: DOMRect, b: DOMRect): boolean {
		return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
	}
</script>

<div
	bind:this={outerEl}
	class="vm-node-grid"
	role="grid"
	aria-multiselectable="true"
	tabindex="-1"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerCancel}
>
	<div
		class="vm-node-grid-inner"
		style="--vm-node-grid-total-h: {totalHeight}px; --vm-node-grid-columns: {columnCount}"
	>
		{#each virtualRows as virtualRow (virtualRow.key)}
			{@const rowNodes = nodes.slice(
				virtualRow.index * columnCount,
				virtualRow.index * columnCount + columnCount,
			)}
			<div class="vm-node-grid-row" style="--vm-node-grid-y: {virtualRow.start + GRID_PADDING}px">
				{#each rowNodes as node (node.id)}
					{@const isSelected = selectedIds?.has(node.id) ?? false}
					{@const isFocused = focusedId === node.id}
					{@const isActive = activeId === node.id}
					{@const hoverBadges = hoverBadgesFor(node)}
					<div
						class="vm-node-grid-tile {node.cls ?? ''}"
						class:is-selected={isSelected}
						class:is-focused={isFocused}
						class:is-active={isActive}
						class:is-active-node={isActive}
						data-id={node.id}
						onclick={(e) => handleTileClick(node.id, e)}
						oncontextmenu={(e) => onContextMenu(node.id, e)}
						onkeydown={(e) => handleTileKeydown(node.id, e)}
						role="gridcell"
						tabindex="0"
						aria-selected={isSelected}
					>
						{#if node.icon}
							<span class="vm-node-grid-icon" use:icon={node.icon}></span>
						{/if}
						<button
							type="button"
							class="vm-node-grid-label"
							onclick={(e) => {
								e.stopPropagation();
								onPrimaryAction?.(node.id, e);
							}}
						>
							{node.label}
						</button>
						{#if hoverBadges.length > 0}
							<div class="vm-node-grid-hover-badge-zone">
								{#each hoverBadges as kind (kind)}
									<div
										class="vm-badge is-hover-badge is-actionable"
										data-hover-kind={kind}
										role="button"
										tabindex="0"
										title={HOVER_BADGE_LABELS[kind]}
										aria-label={HOVER_BADGE_LABELS[kind]}
										onclick={(e) => handleHoverBadgePress(e, node.id, kind)}
										onkeydown={(e) => handleHoverBadgeKeydown(e, node.id, kind)}
									>
										<span class="vm-badge-icon" use:icon={HOVER_BADGE_ICONS[kind]}></span>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	</div>
	{#if selectionBox}
		<div
			class="vm-selection-box"
			style="left: {selectionBox.left}px; top: {selectionBox.top}px; width: {selectionBox.width}px; height: {selectionBox.height}px"
		></div>
	{/if}
</div>
