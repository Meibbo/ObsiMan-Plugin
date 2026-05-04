<script lang="ts">
	import { setIcon } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import ViewList from '../views/viewList.svelte';
	import { ViewService } from '../../services/serviceViews.svelte';
	import type { ActiveFilterEntry, NodeBase } from '../../types/typeContracts';
	import type { ExplorerRenderModel, ViewAction, ViewRow } from '../../types/typeViews';
	import { translate } from '../../index/i18n/lang';

	let {
		plugin,
		onClose,
	}: {
		plugin: VaultmanPlugin;
		onClose?: () => void;
	} = $props();

	const fallbackViewService = new ViewService();
	let model: ExplorerRenderModel<NodeBase> = $state(emptyModel());

	const fileCount = $derived(plugin.filterService.filteredFiles.length);
	const hasItems = $derived(model.rows.length > 0);

	$effect(() => {
		syncItems();
		return plugin.activeFiltersIndex.subscribe(syncItems);
	});

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return { update: (n: string) => setIcon(el, n) };
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
		model = (plugin.viewService ?? fallbackViewService).getModel({
			explorerId: 'active-filters',
			mode: 'list',
			nodes: [...plugin.activeFiltersIndex.nodes],
			getLabel: (node) => describeRule(node as ActiveFilterEntry),
			getActions: () => [
				{ id: 'remove', label: translate('filters.remove'), icon: 'lucide-x', tone: 'danger' },
			],
			getDecorationContext: () => ({ kind: 'filter' }),
		}) as unknown as ExplorerRenderModel<NodeBase>;
	}

	function handleAction(action: ViewAction<NodeBase>, row: ViewRow<NodeBase>) {
		if (action.id === 'remove') removeFilter(row.node as ActiveFilterEntry);
	}

	function emptyModel(): ExplorerRenderModel<NodeBase> {
		return {
			explorerId: 'active-filters',
			mode: 'list',
			rows: [],
			columns: [],
			groups: [],
			selection: { ids: new Set() },
			focus: { id: null },
			sort: { id: 'manual', direction: 'asc' },
			search: { query: '' },
			virtualization: { rowHeight: 32, overscan: 5 },
			capabilities: {},
		};
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
				{model.rows.length}
				{translate('filters.active')} · {fileCount}
				{translate('files.count.short')}
			</span>
		</header>

		{#if !hasItems}
			<div class="vm-explorer-popup-empty">{translate('filters.active.empty')}</div>
		{:else}
			<ViewList {model} {icon} onAction={handleAction} />
		{/if}
	</div>
</div>
