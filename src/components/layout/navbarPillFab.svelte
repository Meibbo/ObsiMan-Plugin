<script lang="ts">
	import type { FabDef } from '../../types/typePrimitives';
	import { translate } from '../../index/i18n/lang';
	import {
		COMMAND_MOUSE_GESTURE_CONFIG,
		createMouseGestureService,
		mergeMouseGestureConfig,
		type MouseGestureConfig,
	} from '../../services/serviceMouse';

	let {
		isIslandOpen = false,
		pageOrder,
		activePage,
		pageLabels,
		pageIcons,
		leftFab,
		rightFab,
		navCollapsed,
		isReordering = $bindable(),
		reorderTargetIdx,
		pillEl = $bindable(),
		selectedCount,
		filterRuleCount,
		queuedCount,
		bindNav,
		onCollapsedNavClick,
		onNavIconPointerDown,
		onPillPointerMove,
		onPillPointerUp,
		exitReorder,
		navigateTo,
		icon,
		mouseGestureConfig,
	}: {
		isIslandOpen?: boolean;
		pageOrder: string[];
		activePage: string;
		pageLabels: Record<string, string>;
		pageIcons: Record<string, string>;
		leftFab: FabDef | null;
		rightFab: FabDef | null;
		navCollapsed: boolean;
		isReordering: boolean;
		reorderTargetIdx: number;
		pillEl: HTMLElement | null;
		selectedCount: number;
		filterRuleCount: number;
		queuedCount: number;
		bindNav: (node: HTMLElement) => any;
		onCollapsedNavClick: () => void;
		onNavIconPointerDown: (e: PointerEvent, idx: number) => void;
		onPillPointerMove: (e: PointerEvent) => void;
		onPillPointerUp: () => void;
		exitReorder: () => void;
		navigateTo: (page: string) => void;
		icon: (node: HTMLElement, name: string) => any;
		mouseGestureConfig?: MouseGestureConfig;
	} = $props();

	function badgeCountForFab(fab: FabDef | null): number {
		if (fab?.badgeKind === 'queue') return queuedCount;
		if (fab?.badgeKind === 'filters') return filterRuleCount;
		return 0;
	}

	function badgeLabelForFab(fab: FabDef | null, count: number): string {
		if (fab?.badgeKind === 'queue') return `${count} ${translate('ops.queue')}`;
		if (fab?.badgeKind === 'filters') return `${count} ${translate('filters.active')}`;
		return String(count);
	}

	const leftFabBadgeCount = $derived(badgeCountForFab(leftFab));
	const rightFabBadgeCount = $derived(badgeCountForFab(rightFab));
	const mouse = createMouseGestureService();

	$effect(() => () => mouse.cancelAll());

	// FAB dispatchers are intentionally resolved by serviceMouse so primary,
	// secondary, and tertiary gestures can later be remapped from settings.
	const leftFabClick = $derived.by(() => makeFabClickHandler(leftFab, 'left'));
	const rightFabClick = $derived.by(() => makeFabClickHandler(rightFab, 'right'));
	const leftFabAuxClick = $derived.by(() => makeFabAuxClickHandler(leftFab, 'left'));
	const rightFabAuxClick = $derived.by(() => makeFabAuxClickHandler(rightFab, 'right'));

	function mouseConfigForFab(fab: FabDef): MouseGestureConfig {
		return mergeMouseGestureConfig(
			COMMAND_MOUSE_GESTURE_CONFIG,
			{
				secondary: fab.onDoubleClick ? 'double-click' : [],
				tertiary: fab.onTertiaryClick ? ['alt-click', 'middle-click'] : [],
			},
			mouseGestureConfig,
		);
	}

	function makeFabClickHandler(fab: FabDef | null, side: 'left' | 'right'): (e: MouseEvent) => void {
		if (!fab) return () => {};
		return (e: MouseEvent) => {
			e.stopPropagation();
			mouse.handleClick(
				{ key: `fab:${side}`, eventTarget: e.target },
				e,
				{
					primary: () => fab.action?.(),
					secondary: () => fab.onDoubleClick?.(),
					tertiary: () => fab.onTertiaryClick?.(),
				},
				mouseConfigForFab(fab),
			);
		};
	}

	function makeFabAuxClickHandler(
		fab: FabDef | null,
		side: 'left' | 'right',
	): (e: MouseEvent) => void {
		if (!fab) return () => {};
		return (e: MouseEvent) => {
			e.stopPropagation();
			mouse.handleAuxClick(
				{ key: `fab:${side}`, eventTarget: e.target },
				e,
				{
					primary: () => fab.action?.(),
					secondary: () => fab.onDoubleClick?.(),
					tertiary: () => fab.onTertiaryClick?.(),
				},
				mouseConfigForFab(fab),
			);
		};
	}
</script>

<div
	class="vm-bottom-nav vm-glass vm-glass--bottom"
	class:is-island-open={isIslandOpen}
	use:bindNav
	class:is-bar-collapsed={navCollapsed}
	role="navigation"
	aria-label={translate('toolbar.navigation') || 'Bottom navigation'}
>
	{#if navCollapsed}
		<button
			class="vm-nav-expand-trigger"
			onclick={onCollapsedNavClick}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') onCollapsedNavClick();
			}}
			aria-label={translate('nav.expand') || 'Expand navigation bar'}
			title={translate('nav.expand') || 'Expand navigation bar'}
		></button>
	{/if}

	{#if leftFab}
		<div class="vm-nav-fab-wrap">
			<div
				class="vm-nav-fab"
				aria-label={leftFab.label}
				use:icon={leftFab.icon}
				onclick={leftFabClick}
				onauxclick={leftFabAuxClick}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.stopPropagation();
						leftFab.action?.();
					}
				}}
				role="button"
				tabindex="0"
			></div>
			{#if leftFabBadgeCount > 0}
				<div
					class="vm-fab-badge"
					data-vm-badge-kind={leftFab.badgeKind}
					aria-label={badgeLabelForFab(leftFab, leftFabBadgeCount)}
					title={badgeLabelForFab(leftFab, leftFabBadgeCount)}
				>
					{leftFabBadgeCount}
				</div>
			{/if}
		</div>
	{:else}
		<div class="vm-nav-fab-placeholder"></div>
	{/if}

	<!-- Center: frosted glass pill with page icons -->
	<div
		class="vm-nav-pill"
		class:is-reordering={isReordering}
		bind:this={pillEl}
		onpointermove={(e: PointerEvent) => onPillPointerMove(e)}
		onpointerup={() => onPillPointerUp()}
		onpointerleave={() => exitReorder()}
		role="tablist"
		tabindex="-1"
	>
		{#each pageOrder as pageId, i (pageId)}
			<div
				class="vm-nav-icon"
				class:is-active={activePage === pageId && !isReordering}
				class:is-reorder-target={isReordering && reorderTargetIdx === i}
				aria-label={pageLabels[pageId] ?? pageId}
				use:icon={pageIcons[pageId] ?? 'lucide-circle'}
				onpointerdown={(e: PointerEvent) => onNavIconPointerDown(e, i)}
				onpointercancel={() => exitReorder()}
				onclick={(e: MouseEvent) => {
					e.stopPropagation();
					if (!isReordering) navigateTo(pageId);
				}}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.stopPropagation();
						if (!isReordering) navigateTo(pageId);
					}
				}}
				role="tab"
				tabindex={activePage === pageId ? 0 : -1}
			>
				{#if !isReordering && pageId === 'statistics' && selectedCount > 0}
					<div class="vm-nav-dot-badge"></div>
				{/if}
			</div>
		{/each}
	</div>

	{#if rightFab}
		<div class="vm-nav-fab-wrap">
			<div
				class="vm-nav-fab"
				aria-label={rightFab.label}
				use:icon={rightFab.icon}
				onclick={rightFabClick}
				onauxclick={rightFabAuxClick}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.stopPropagation();
						rightFab.action?.();
					}
				}}
				role="button"
				tabindex="0"
			></div>
			{#if rightFabBadgeCount > 0}
				<div
					class="vm-fab-badge"
					data-vm-badge-kind={rightFab.badgeKind}
					aria-label={badgeLabelForFab(rightFab, rightFabBadgeCount)}
					title={badgeLabelForFab(rightFab, rightFabBadgeCount)}
				>
					{rightFabBadgeCount}
				</div>
			{/if}
		</div>
	{:else}
		<div class="vm-nav-fab-placeholder"></div>
	{/if}
</div>
