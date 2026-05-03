<script lang="ts">
	import { setIcon } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import { Virtualizer } from '../../services/serviceVirtualizer.svelte';
	import type { ActiveFilterEntry } from '../../types/typeContracts';
	import { translate } from '../../index/i18n/lang';

	let {
		plugin,
		onClose,
	}: {
		plugin: VaultmanPlugin;
		onClose?: () => void;
	} = $props();

	let outerEl: HTMLDivElement | undefined = $state();
	const v = new Virtualizer<ActiveFilterEntry>();

	const totalH = $derived(v.items.length * v.rowHeight);
	const fileCount = $derived(plugin.filterService.filteredFiles.length);
	const hasItems = $derived(v.items.length > 0);

	$effect(() => {
		syncItems();
		return plugin.activeFiltersIndex.subscribe(syncItems);
	});

	$effect(() => {
		if (!outerEl) return;
		v.viewportHeight = outerEl.clientHeight;
		const ro = new ResizeObserver(() => {
			if (outerEl) v.viewportHeight = outerEl.clientHeight;
		});
		ro.observe(outerEl);
		return () => ro.disconnect();
	});

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return { update: (n: string) => setIcon(el, n) };
	}

	function onScroll(e: Event) {
		v.scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
	}

	function describeRule(entry: ActiveFilterEntry): string {
		const rule = entry.rule;
		const prop = rule.property ?? '';
		const vals = rule.values ?? [];
		switch (rule.filterType) {
			case 'has_property':
				return `has: ${prop}`;
			case 'missing_property':
				return `missing: ${prop}`;
			case 'specific_value':
				return `${prop}: ${vals[0] ?? ''}`;
			case 'multiple_values':
				return `${prop}: ${vals.join(', ')}`;
			case 'has_tag':
				return `tag: ${vals[0] ?? ''}`;
			case 'folder':
				return `folder: ${vals[0] ?? ''}`;
			case 'folder_exclude':
				return `excl. folder: ${vals[0] ?? ''}`;
			case 'file_name':
				return `name: ${vals[0] ?? ''}`;
			case 'file_name_exclude':
				return `excl. name: ${vals[0] ?? ''}`;
			default:
				return prop || 'filter';
		}
	}

	function removeFilter(entry: ActiveFilterEntry) {
		plugin.filterService.removeNode(entry.rule);
	}

	function clearFilters() {
		plugin.filterService.clearFilters();
	}

	function syncItems() {
		v.items = [...plugin.activeFiltersIndex.nodes];
	}
</script>

<div class="vm-explorer-popup-shell">
	<div class="vm-popup-squircles" aria-label={translate('filters.active')}>
		<button
			class="vm-squircle"
			disabled
			aria-label={translate('filter.tab.props')}
			use:icon={'lucide-list-tree'}
		></button>
		<button
			class="vm-squircle"
			disabled
			aria-label={translate('nav.ops')}
			use:icon={'lucide-settings-2'}
		></button>
		<button
			class="vm-squircle"
			onclick={clearFilters}
			disabled={!hasItems}
			aria-label={translate('filters.popup.clear_all')}
			use:icon={'lucide-eraser'}
		></button>
		<button
			class="vm-squircle"
			disabled
			aria-label={translate('filters.popup.templates')}
			use:icon={'lucide-book-marked'}
		></button>
		<button
			class="vm-squircle is-accent"
			onclick={onClose}
			aria-label={translate('common.close')}
			use:icon={'lucide-check'}
		></button>
	</div>

	<div class="vm-explorer-popup">
		<header class="vm-explorer-popup-header">
			<span class="vm-subtitle">
				{v.items.length}
				{translate('filters.active')} · {fileCount}
				{translate('files.count.short')}
			</span>
		</header>

		{#if !hasItems}
			<div class="vm-explorer-popup-empty">{translate('filters.active.empty')}</div>
		{:else}
			<div bind:this={outerEl} class="vm-explorer-popup-list" onscroll={onScroll}>
				<div class="vm-explorer-popup-inner" style="height: {totalH}px">
					{#each v.visible as entry, i (entry.id)}
						{@const absIdx = v.window.startIndex + i}
						<div
							class="vm-explorer-popup-row"
							style="transform: translateY({absIdx * v.rowHeight}px)"
						>
							<span class="vm-filter-entry-desc">{describeRule(entry)}</span>
							<button
								class="vm-btn-icon vm-btn-danger"
								onclick={() => removeFilter(entry)}
								aria-label={translate('filters.remove')}>×</button
							>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
