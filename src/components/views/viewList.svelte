<script lang="ts">
	import { Virtualizer } from '../../services/serviceVirtualizer.svelte';
	import type { NodeBase } from '../../types/typeContracts';
	import type { ExplorerRenderModel, ViewAction, ViewBadge, ViewRow } from '../../types/typeViews';

	interface Props {
		model: ExplorerRenderModel<NodeBase>;
		onAction?: (action: ViewAction<NodeBase>, row: ViewRow<NodeBase>) => void;
		icon?: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let { model, onAction, icon }: Props = $props();

	let outerEl: HTMLDivElement | undefined = $state();
	const virtualizer = new Virtualizer<ViewRow<NodeBase>>();

	const totalH = $derived(virtualizer.items.length * virtualizer.rowHeight);

	$effect(() => {
		virtualizer.items = [...model.rows];
		virtualizer.rowHeight = model.virtualization.rowHeight;
		virtualizer.overscan = model.virtualization.overscan;
	});

	$effect(() => {
		if (!outerEl) return;
		virtualizer.viewportHeight = outerEl.clientHeight || virtualizer.viewportHeight;
		const ro = new ResizeObserver(() => {
			if (outerEl) virtualizer.viewportHeight = outerEl.clientHeight;
		});
		ro.observe(outerEl);
		return () => ro.disconnect();
	});

	function onScroll(e: Event) {
		virtualizer.scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
	}

	function iconAction(el: HTMLElement, name: string) {
		return icon?.(el, name) ?? { update: () => {} };
	}

	function rowIcon(row: ViewRow<NodeBase>): string | undefined {
		return row.icon ?? row.layers.icons?.[0]?.icon;
	}

	function allBadges(row: ViewRow<NodeBase>): ViewBadge[] {
		const badges = row.layers.badges;
		return [
			...(badges?.ops ?? []),
			...(badges?.filters ?? []),
			...(badges?.warnings ?? []),
			...(badges?.inherited ?? []),
			...(badges?.counts ?? []),
		];
	}

	function handleAction(action: ViewAction<NodeBase>, row: ViewRow<NodeBase>) {
		if (action.disabled) return;
		action.run?.(row);
		onAction?.(action, row);
	}
</script>

<div bind:this={outerEl} class="vm-view-list vm-explorer-popup-list" onscroll={onScroll}>
	<div class="vm-view-list-inner vm-explorer-popup-inner" style="height: {totalH}px">
		{#each virtualizer.visible as row, i (row.id)}
			{@const absIdx = virtualizer.window.startIndex + i}
			{@const iconName = rowIcon(row)}
			{@const badges = allBadges(row)}
			<div
				class="vm-view-list-row vm-explorer-popup-row"
				class:is-selected={row.layers.state?.selected}
				class:is-disabled={row.disabled || row.layers.state?.disabled}
				style="transform: translateY({absIdx * virtualizer.rowHeight}px)"
				data-id={row.id}
			>
				{#if iconName}
					<span class="vm-view-list-icon" use:iconAction={iconName}></span>
				{/if}

				<span class="vm-view-list-main">
					<span class="vm-view-list-label">{row.label}</span>
					{#if row.detail}
						<span class="vm-view-list-detail">{row.detail}</span>
					{/if}
				</span>

				{#if badges.length > 0}
					<span class="vm-view-list-badges">
						{#each badges as badge (badge.id)}
							<span class="vm-badge" class:is-solid={badge.solid} title={badge.label ?? ''}>
								{#if badge.icon}
									<span class="vm-badge-icon" use:iconAction={badge.icon}></span>
								{/if}
								{#if badge.label}
									<span class="vm-badge-label">{badge.label}</span>
								{/if}
							</span>
						{/each}
					</span>
				{/if}

				{#if row.actions.length > 0}
					<span class="vm-view-list-actions">
						{#each row.actions as action (action.id)}
							<button
								class="vm-btn-icon"
								class:vm-btn-danger={action.tone === 'danger'}
								disabled={action.disabled}
								onclick={() => handleAction(action, row)}
								aria-label={action.label}
							>
								{#if action.icon}
									<span use:iconAction={action.icon}></span>
								{:else}
									{action.label}
								{/if}
							</button>
						{/each}
					</span>
				{/if}
			</div>
		{/each}
	</div>
</div>
