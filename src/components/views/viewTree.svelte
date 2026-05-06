<script lang="ts">
	import type { NodeBadge, TreeNode } from '../../types/typeNode';
	import { getActivePerfProbe } from '../../dev/perfProbe';
	import { TreeVirtualizer } from '../../services/serviceVirtualizer.svelte';
	import HighlightText from '../primitives/HighlightText.svelte';

	interface Props {
		nodes: TreeNode[];
		expandedIds: Set<string>;
		selectedIds?: Set<string>;
		focusedId?: string | null;
		onToggle: (id: string) => void;
		onRowClick: (id: string, e: MouseEvent) => void;
		onPrimaryAction?: (id: string, e: MouseEvent) => void;
		onBoxSelect?: (ids: string[], e: PointerEvent) => void;
		onContextMenu: (id: string, e: MouseEvent) => void;
		onRowKeydown?: (id: string, e: KeyboardEvent) => void;
		activeFilterIds?: Set<string>;
		searchHighlightIds?: Set<string>;
		warningIds?: Set<string>;
		editingId?: string | null;
		onRename?: (id: string, newLabel: string) => void;
		onCancelRename?: () => void;
		onBadgeDoubleClick?: (queueIndex: number) => void;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		nodes,
		expandedIds,
		selectedIds,
		focusedId,
		onToggle,
		onRowClick,
		onPrimaryAction,
		onBoxSelect,
		onContextMenu,
		onRowKeydown,
		activeFilterIds,
		searchHighlightIds,
		warningIds,
		editingId,
		onRename,
		onCancelRename,
		onBadgeDoubleClick,
		icon,
	}: Props = $props();

	const virtualizer = new TreeVirtualizer();

	let outerEl: HTMLDivElement | undefined = $state();
	let dragStart = $state<{ x: number; y: number; pointerId: number } | null>(null);
	let selectionBox = $state<{
		left: number;
		top: number;
		width: number;
		height: number;
	} | null>(null);
	let suppressNextClick = false;

	const flatArray = $derived(flattenMeasured(nodes, expandedIds));
	const totalH = $derived(flatArray.length * virtualizer.rowHeight);

	$effect(() => {
		virtualizer.items = flatArray;
	});

	const win = $derived(virtualizer.window);
	const visibleSlice = $derived(flatArray.slice(win.startIndex, win.endIndex));

	function onScroll(e: Event) {
		virtualizer.scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
		getActivePerfProbe()?.count('viewTree.scroll', {
			rows: flatArray.length,
			visibleRows: visibleSlice.length,
		});
	}

	function flattenMeasured(items: TreeNode[], expanded: ReadonlySet<string>) {
		return (
			getActivePerfProbe()?.measure('viewTree.flatten', { nodes: items.length }, () =>
				virtualizer.flatten(items, expanded),
			) ?? virtualizer.flatten(items, expanded)
		);
	}

	$effect(() => {
		if (!outerEl) return;
		const cs = getComputedStyle(outerEl);
		const v = parseFloat(cs.getPropertyValue('--vm-tree-row-h'));
		if (v > 0) virtualizer.rowHeight = v;
		virtualizer.viewportHeight = outerEl.clientHeight;
		const ro = new ResizeObserver(() => {
			if (outerEl) virtualizer.viewportHeight = outerEl.clientHeight;
		});
		ro.observe(outerEl);
		return () => ro.disconnect();
	});

	function handleKeydown(e: KeyboardEvent, id: string) {
		if (onRowKeydown) {
			onRowKeydown(id, e);
			return;
		}
		if (e.key === 'Enter') onPrimaryAction?.(id, e as unknown as MouseEvent);
	}

	function handleInputKeydown(e: KeyboardEvent, id: string, inputEl: HTMLInputElement) {
		if (e.key === 'Enter') {
			e.stopPropagation();
			onRename?.(id, inputEl.value);
		} else if (e.key === 'Escape') {
			e.stopPropagation();
			onCancelRename?.();
		}
	}

	function handleRowClick(e: MouseEvent, id: string) {
		if (suppressNextClick) {
			suppressNextClick = false;
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		onRowClick(id, e);
	}

	function handlePrimaryAction(e: MouseEvent, id: string) {
		e.stopPropagation();
		onPrimaryAction?.(id, e);
	}

	function handlePrimaryActionKeydown(e: KeyboardEvent, id: string) {
		if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
		e.stopPropagation();
		e.preventDefault();
		onPrimaryAction?.(id, e as unknown as MouseEvent);
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
		const ids = intersectingRowIds(box);
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
		return Boolean(
			el?.closest(
				'input, textarea, select, button, .vm-tree-toggle, .vm-badge, .vm-tree-child-badge-indicator, [role="button"]',
			),
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

	function intersectingRowIds(box: NonNullable<typeof selectionBox>): string[] {
		if (!outerEl) return [];
		const boxRect = selectionBoxViewportRect(box);
		const ids: string[] = [];
		for (const row of outerEl.querySelectorAll<HTMLElement>('.vm-tree-virtual-row[data-id]')) {
			if (rectsIntersect(boxRect, row.getBoundingClientRect())) {
				const id = row.dataset.id;
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

	function ownBadges(node: TreeNode): NodeBadge[] {
		return (node.badges ?? []).filter((badge) => !badge.isInherited);
	}

	function inheritedBadges(node: TreeNode): NodeBadge[] {
		return (node.badges ?? []).filter((badge) => badge.isInherited);
	}

	function badgeKey(badge: NodeBadge, index: number): string {
		return `${badge.queueIndex ?? 'badge'}:${index}:${badge.text ?? ''}:${badge.icon ?? ''}:${badge.color ?? ''}:${badge.isInherited ?? false}`;
	}

	function badgeTitle(badge: NodeBadge, inherited = false): string {
		if (badge.title) return badge.title;
		const label = badge.text ?? '';
		const prefix = inherited ? 'Hidden child ' : '';
		if (badge.queueIndex === undefined) return `${prefix}${label}`.trim();
		return `${prefix}${label} - click to remove from queue`.trim();
	}

	function badgeAriaLabel(badge: NodeBadge, inherited = false): string {
		return badge.ariaLabel ?? badgeTitle(badge, inherited);
	}

	function badgeIsActionable(badge: NodeBadge): boolean {
		return badge.queueIndex !== undefined || typeof badge.onClick === 'function';
	}

	function inheritedBadgeTitle(badges: NodeBadge[]): string {
		return `${badges.length} hidden descendant badge${badges.length === 1 ? '' : 's'}`;
	}

	function handleBadgePress(e: MouseEvent | KeyboardEvent, badge: NodeBadge) {
		if (!badgeIsActionable(badge)) return;
		e.stopPropagation();
		e.preventDefault();
		if (badge.queueIndex !== undefined) {
			onBadgeDoubleClick?.(badge.queueIndex);
			return;
		}
		badge.onClick?.();
	}

	function handleBadgeKeydown(e: KeyboardEvent, badge: NodeBadge) {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
			handleBadgePress(e, badge);
		}
	}

	function focus(el: HTMLInputElement) {
		el.focus();
		el.select();
	}
</script>

<div
	bind:this={outerEl}
	class="vm-tree-virtual-outer"
	onscroll={onScroll}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerCancel}
	role="tree"
	aria-multiselectable="true"
	tabindex="-1"
>
	<div class="vm-tree-virtual-inner" style="--vm-tree-total-h: {totalH}px">
		{#each visibleSlice as flat, i (flat.node.id)}
			{@const absIdx = win.startIndex + i}
			{@const node = flat.node}
			{@const isActive = activeFilterIds?.has(node.id) ?? false}
			{@const isWarning = warningIds?.has(node.id) ?? false}
			{@const isEditing = editingId === node.id}
			{@const isHighlighted = searchHighlightIds?.has(node.id) ?? false}
			{@const isSelected = selectedIds?.has(node.id) ?? false}
			{@const isFocused = focusedId === node.id}
			{@const directBadges = ownBadges(node)}
			{@const childBadges = inheritedBadges(node)}

			<div
				class="vm-tree-virtual-row {node.cls ?? ''}"
				class:is-active-filter={isActive}
				class:is-selected={isSelected}
				class:is-focused={isFocused}
				class:vm-badge-warning={isWarning}
				class:vm-search-highlight={isHighlighted}
				class:is-editing={isEditing}
				style="--vm-tree-y: {absIdx * virtualizer.rowHeight}px; --depth: {flat.depth}"
				data-id={node.id}
				onclick={(e) => handleRowClick(e, node.id)}
				oncontextmenu={(e) => onContextMenu(node.id, e)}
				onkeydown={(e) => handleKeydown(e, node.id)}
				role="treeitem"
				aria-selected={isSelected}
				tabindex="0"
				aria-expanded={flat.hasChildren ? flat.isExpanded : undefined}
			>
				<div
					class="vm-tree-row-surface"
					class:is-active-filter={isActive}
					class:is-selected={isSelected}
					class:is-focused={isFocused}
					class:vm-badge-warning={isWarning}
					class:vm-search-highlight={isHighlighted}
					class:is-editing={isEditing}
				>
					<!-- Chevron / Spacer -->
					<div
						class="vm-tree-toggle"
						onclick={(e) => {
							e.stopPropagation();
							if (flat.hasChildren) onToggle(node.id);
						}}
						onkeydown={() => {}}
						role="button"
						tabindex="-1"
					>
						{#if flat.hasChildren}
							<span use:icon={flat.isExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right'}
							></span>
						{/if}
					</div>

					<!-- Icon -->
					{#if node.icon}
						<span class="vm-tree-icon" use:icon={node.icon}></span>
					{/if}

					<!-- Label / Input -->
					{#if isEditing}
						<input
							class="vm-tree-input"
							value={node.label}
							onclick={(e) => e.stopPropagation()}
							onkeydown={(e) => handleInputKeydown(e, node.id, e.currentTarget)}
							onblur={() => onCancelRename?.()}
							use:focus
						/>
					{:else}
						<span
							class="vm-tree-label"
							role="button"
							tabindex="-1"
							onclick={(e) => handlePrimaryAction(e, node.id)}
							onkeydown={(e) => handlePrimaryActionKeydown(e, node.id)}
						>
							<HighlightText text={node.label} ranges={node.highlights ?? []} />
						</span>
					{/if}

					<!-- Badges / Counts -->
					{#if (node.count != null && node.count > 0) || directBadges.length > 0 || childBadges.length > 0}
						<div class="vm-tree-badge-zone">
							{#if directBadges.length > 0}
								{#each directBadges as badge, badgeIndex (badgeKey(badge, badgeIndex))}
									<div
										class="vm-badge"
										role="button"
										class:is-solid={badge.solid}
										class:is-undoable={badge.queueIndex !== undefined}
										class:is-actionable={badgeIsActionable(badge)}
										class:is-quick-action={badge.quickAction}
										class:vm-badge--red={badge.solid && badge.color === 'red'}
										class:vm-badge--blue={badge.solid && badge.color === 'blue'}
										class:vm-badge--purple={badge.solid && badge.color === 'purple'}
										class:vm-badge--orange={badge.solid && badge.color === 'orange'}
										class:vm-badge--green={badge.solid && badge.color === 'green'}
										title={badgeTitle(badge)}
										aria-label={badgeAriaLabel(badge)}
										tabindex={badgeIsActionable(badge) ? 0 : -1}
										onclick={(e) => handleBadgePress(e, badge)}
										onkeydown={(e) => handleBadgeKeydown(e, badge)}
									>
										{#if badge.icon}
											<span class="vm-badge-icon" use:icon={badge.icon}></span>
										{/if}
									</div>
								{/each}
							{/if}

							{#if childBadges.length > 0}
								<div class="vm-tree-child-badge-indicator" title={inheritedBadgeTitle(childBadges)}>
									<span class="vm-tree-child-badge-dot"></span>
									<div class="vm-tree-child-badge-pill">
										{#each childBadges as badge, badgeIndex (badgeKey(badge, badgeIndex))}
											<div
												class="vm-badge"
												role="button"
												class:is-solid={badge.solid}
												class:is-inherited={badge.isInherited}
												class:is-undoable={badge.queueIndex !== undefined}
												class:is-actionable={badgeIsActionable(badge)}
												class:is-quick-action={badge.quickAction}
												class:vm-badge--red={badge.solid && badge.color === 'red'}
												class:vm-badge--blue={badge.solid && badge.color === 'blue'}
												class:vm-badge--purple={badge.solid && badge.color === 'purple'}
												class:vm-badge--orange={badge.solid && badge.color === 'orange'}
												class:vm-badge--green={badge.solid && badge.color === 'green'}
												title={badgeTitle(badge, true)}
												aria-label={badgeAriaLabel(badge, true)}
												tabindex={badgeIsActionable(badge) ? 0 : -1}
												onclick={(e) => handleBadgePress(e, badge)}
												onkeydown={(e) => handleBadgeKeydown(e, badge)}
											>
												{#if badge.icon}
													<span class="vm-badge-icon" use:icon={badge.icon}></span>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if node.count != null && node.count > 0}
								<span class="vm-tree-count">{node.count}</span>
							{/if}
						</div>
					{/if}
				</div>
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
