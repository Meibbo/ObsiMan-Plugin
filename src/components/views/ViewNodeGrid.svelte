<script lang="ts">
	import type { TreeNode } from '../../types/typeNode';

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
		icon,
	}: Props = $props();

	let outerEl: HTMLDivElement | undefined = $state();
	let dragStart = $state<{ x: number; y: number; pointerId: number } | null>(null);
	let selectionBox = $state<{
		left: number;
		top: number;
		width: number;
		height: number;
	} | null>(null);
	let suppressNextClick = false;

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
		outerEl.setPointerCapture(e.pointerId);
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

	function shouldIgnoreBoxStart(target: EventTarget | null): boolean {
		const el = target instanceof HTMLElement ? target : null;
		return Boolean(el?.closest('input, textarea, select, button, [role="button"]'));
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
		if (!outerEl) return [];
		const boxRect = selectionBoxViewportRect(box);
		const ids: string[] = [];
		for (const tile of outerEl.querySelectorAll<HTMLElement>('.vm-node-grid-tile[data-id]')) {
			if (rectsIntersect(boxRect, tile.getBoundingClientRect())) {
				const id = tile.dataset.id;
				if (id) ids.push(id);
			}
		}
		return ids;
	}

	function selectionBoxViewportRect(box: NonNullable<typeof selectionBox>): DOMRect {
		const outerRect = outerEl!.getBoundingClientRect();
		return new DOMRect(
			outerRect.left + box.left - outerEl!.scrollLeft,
			outerRect.top + box.top - outerEl!.scrollTop,
			box.width,
			box.height,
		);
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
	{#each nodes as node (node.id)}
		{@const isSelected = selectedIds?.has(node.id) ?? false}
		{@const isFocused = focusedId === node.id}
		{@const isActive = activeId === node.id}
		<div
			class="vm-node-grid-tile {node.cls ?? ''}"
			class:is-selected={isSelected}
			class:is-focused={isFocused}
			class:is-active={isActive}
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
		</div>
	{/each}
	{#if selectionBox}
		<div
			class="vm-selection-box"
			style="left: {selectionBox.left}px; top: {selectionBox.top}px; width: {selectionBox.width}px; height: {selectionBox.height}px"
		></div>
	{/if}
</div>
