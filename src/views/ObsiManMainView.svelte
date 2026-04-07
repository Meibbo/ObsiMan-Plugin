<script lang="ts">
	import { onMount } from 'svelte';
	import { setIcon } from 'obsidian';
	import type { ObsiManPlugin } from '../../main';
	import { FilterTreeComponent } from '../components/FilterTreeComponent';
	import { PropertyGridComponent } from '../components/PropertyGridComponent';
	import { OperationsPanelComponent } from '../components/OperationsPanelComponent';
	import { AddFilterModal } from '../modals/AddFilterModal';
	import { SaveTemplateModal } from '../modals/SaveTemplateModal';
	import { QueueDetailsModal } from '../modals/QueueDetailsModal';
	import { t } from '../i18n/index';

	let { plugin }: { plugin: ObsiManPlugin } = $props();

	// ─── Collapse state ───────────────────────────────────────────────────────

	let filtersOpen = $state(true);
	let opsOpen = $state(true);

	// ─── Component refs ───────────────────────────────────────────────────────

	let filterTree: FilterTreeComponent | undefined;
	let grid: PropertyGridComponent | undefined;
	let opsPanel: OperationsPanelComponent | undefined;

	// ─── Stats ────────────────────────────────────────────────────────────────

	let filteredCount = $state(0);
	let selectedCount = $state(0);
	let queuedCount = $state(0);
	let filterRuleCount = $state(0);

	function updateStats() {
		filteredCount = plugin.filterService.filteredFiles.length;
		selectedCount = grid?.selectedPaths?.size ?? 0;
		queuedCount = plugin.queueService.queue.length;
		filterRuleCount = plugin.filterService.activeFilter?.children?.length ?? 0;
	}

	// ─── Actions ──────────────────────────────────────────────────────────────

	function initFilterTree(node: HTMLElement) {
		filterTree = new FilterTreeComponent(node, (n: unknown, parent: unknown) => {
			plugin.filterService.removeNode(n, parent);
			filterTree?.render(plugin.filterService.activeFilter);
			refreshGrid();
			updateStats();
		});
		filterTree.render(plugin.filterService.activeFilter);
		return { destroy() { filterTree = undefined; } };
	}

	function initGrid(node: HTMLElement) {
		grid = new PropertyGridComponent(node, plugin.app, plugin, {
			onSelectionChange: (paths) => {
				selectedCount = paths.size;
				updateStats();
			},
			onInlineEdit: (change) => plugin.queueService.add(change),
		});
		refreshGrid();
		return { destroy() { grid = undefined; } };
	}

	function initOps(node: HTMLElement) {
		opsPanel = new OperationsPanelComponent(node, plugin, {
			onToggle: (expanded) => { opsOpen = expanded; },
		});
		return { destroy() { opsPanel = undefined; } };
	}

	// ─── Refresh ─────────────────────────────────────────────────────────────

	function refreshGrid() {
		if (!grid) return;
		const files = plugin.filterService.filteredFiles;
		const columns = plugin.settings.gridColumns ?? [];
		grid.render(files, grid.selectedPaths, columns);
		updateStats();
	}

	function refreshFilterTree() {
		filterTree?.render(plugin.filterService.activeFilter);
	}

	// ─── Filter actions ───────────────────────────────────────────────────────

	function openAddFilterModal() {
		new AddFilterModal(
			plugin.app,
			plugin.propertyIndex.getPropertyNames(),
			(prop: string) => plugin.propertyIndex.getPropertyValues(prop),
			(node: unknown) => {
				plugin.filterService.addNode(node);
				refreshFilterTree();
				refreshGrid();
				updateStats();
			}
		).open();
	}

	// ─── Icon action ─────────────────────────────────────────────────────────

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return { update(n: string) { setIcon(el, n); } };
	}

	// ─── Lifecycle ────────────────────────────────────────────────────────────

	onMount(() => {
		const onFilterChanged = () => {
			refreshGrid();
			refreshFilterTree();
			updateStats();
		};
		const onQueueChanged = () => {
			queuedCount = plugin.queueService.queue.length;
		};

		plugin.filterService.on('changed', onFilterChanged);
		plugin.queueService.on('changed', onQueueChanged);

		updateStats();

		return () => {
			plugin.filterService.off('changed', onFilterChanged);
			plugin.queueService.off('changed', onQueueChanged);
		};
	});
</script>

<!-- ─── Main view: 3 rows ─────────────────────────────────────────────────── -->
<div class="obsiman-main-layout">

	<!-- TOP: Filters section -->
	<div class="obsiman-main-section obsiman-main-filters" class:is-collapsed={!filtersOpen}>
		<div class="obsiman-main-section-header">
			<div
				class="obsiman-main-section-toggle clickable-icon"
				use:icon={filtersOpen ? 'lucide-chevron-down' : 'lucide-chevron-right'}
				onclick={() => { filtersOpen = !filtersOpen; }}
				role="button"
				tabindex="0"
				aria-label={filtersOpen ? 'Collapse filters' : 'Expand filters'}
			></div>
			<span class="obsiman-main-section-title">{t('section.filters')}</span>
			{#if filterRuleCount > 0}
				<span class="obsiman-main-badge">{filterRuleCount}</span>
			{/if}
			<div class="obsiman-main-section-actions">
				<button class="obsiman-btn" onclick={openAddFilterModal}>{t('filter.add_rule')}</button>
				<button class="obsiman-btn" onclick={() => {
					plugin.filterService.clearFilters();
					refreshFilterTree();
					refreshGrid();
					updateStats();
				}}>{t('filter.clear')}</button>
				<button class="obsiman-btn" onclick={() =>
					new SaveTemplateModal(plugin.app, plugin, plugin.filterService.activeFilter).open()
				}>{t('filter.template.save')}</button>
			</div>
		</div>
		{#if filtersOpen}
			<div class="obsiman-main-section-body">
				<div class="obsiman-filter-tree" use:initFilterTree></div>
			</div>
		{/if}
	</div>

	<!-- CENTER: Files grid (fills remaining space) -->
	<div class="obsiman-main-section obsiman-main-grid">
		<div class="obsiman-main-section-header">
			<span class="obsiman-main-section-title">{t('section.files')}</span>
			<span class="obsiman-main-stats">
				{filteredCount} {t('nav.files')}
				{#if selectedCount > 0} · {selectedCount} selected{/if}
				{#if queuedCount > 0} · {queuedCount} pending{/if}
			</span>
			<div class="obsiman-main-section-actions">
				<button class="obsiman-btn mod-cta" onclick={() => {
					if (!plugin.queueService.isEmpty)
						new QueueDetailsModal(plugin.app, plugin.queueService).open();
				}}>{t('ops.apply')}</button>
			</div>
		</div>
		<div class="obsiman-main-grid-body" use:initGrid></div>
	</div>

	<!-- BOTTOM: Operations section -->
	<div class="obsiman-main-section obsiman-main-ops" class:is-collapsed={!opsOpen}>
		<div class="obsiman-main-section-header">
			<div
				class="obsiman-main-section-toggle clickable-icon"
				use:icon={opsOpen ? 'lucide-chevron-down' : 'lucide-chevron-right'}
				onclick={() => { opsOpen = !opsOpen; }}
				role="button"
				tabindex="0"
				aria-label={opsOpen ? 'Collapse operations' : 'Expand operations'}
			></div>
			<span class="obsiman-main-section-title">{t('section.operations')}</span>
		</div>
		{#if opsOpen}
			<div class="obsiman-main-section-body obsiman-main-ops-body" use:initOps></div>
		{/if}
	</div>

</div>
