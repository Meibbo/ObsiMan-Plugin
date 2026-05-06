<script lang="ts">
	import { translate } from '../../../index/i18n/lang';

	type FiltersTab = 'props' | 'files' | 'tags' | 'content';

	type SortOption = {
		id: string;
		iconName: string;
		labelKey: string;
	};

	const SORT_OPTIONS: Record<FiltersTab, SortOption[]> = {
		props: [
			{ id: 'count', iconName: 'lucide-hash', labelKey: 'sort.by.count' },
			{
				id: 'name',
				iconName: 'lucide-a-large-small',
				labelKey: 'sort.by.name',
			},
			{
				id: 'date',
				iconName: 'lucide-calendar',
				labelKey: 'sort.by.date',
			},
			{ id: 'sub', iconName: 'lucide-indent', labelKey: 'sort.by.sub' },
		],
		tags: [
			{ id: 'count', iconName: 'lucide-hash', labelKey: 'sort.by.count' },
			{
				id: 'name',
				iconName: 'lucide-a-large-small',
				labelKey: 'sort.by.name',
			},
			{
				id: 'date',
				iconName: 'lucide-calendar',
				labelKey: 'sort.by.date',
			},
			{
				id: 'sub',
				iconName: 'lucide-indent',
				labelKey: 'sort.by.subtags',
			},
		],
		files: [
			{
				id: 'name',
				iconName: 'lucide-a-large-small',
				labelKey: 'sort.by.name',
			},
			{ id: 'count', iconName: 'lucide-hash', labelKey: 'sort.by.count' },
			{
				id: 'date',
				iconName: 'lucide-calendar',
				labelKey: 'sort.by.date',
			},
			{
				id: 'columns',
				iconName: 'lucide-columns-2',
				labelKey: 'sort.by.columns',
			},
		],
		content: [
			{
				id: 'name',
				iconName: 'lucide-a-large-small',
				labelKey: 'sort.by.name',
			},
			{ id: 'count', iconName: 'lucide-hash', labelKey: 'sort.by.count' },
			{
				id: 'date',
				iconName: 'lucide-calendar',
				labelKey: 'sort.by.date',
			},
			{
				id: 'columns',
				iconName: 'lucide-file-text',
				labelKey: 'filter.tab.content',
			},
		],
	};

	const DRAWER_OPTIONS: Record<'props' | 'tags', string[]> = {
		props: ['Text', 'Number', 'Date', 'Toggle', 'List'],
		tags: ['All', 'Nested', 'Simple'],
	};

	let {
		activeTab,
		onClose,
		sortBy = $bindable('name'),
		sortDir = $bindable('asc'),
		operationScope = $bindable('auto'),
		onOperationScopeChange,
		icon,
	}: {
		activeTab: FiltersTab;
		onClose: () => void;
		sortBy: string;
		sortDir: 'asc' | 'desc';
		operationScope: 'auto' | 'selected' | 'filtered' | 'all';
		onOperationScopeChange?: (value: 'auto' | 'selected' | 'filtered' | 'all') => void;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	} = $props();

	let drawerOpen = $state(false);
	let vertTopActive = $state(false);

	const DEFAULT_DIR: Record<string, 'asc' | 'desc'> = {
		name: 'asc',
		count: 'desc',
		date: 'desc',
		sub: 'desc',
		columns: 'asc',
	};

	// Reset per-tab UI state, but NOT the sort state (which is shared/bound)
	$effect(() => {
		void activeTab;
		drawerOpen = false;
		vertTopActive = false;
	});

	function selectSort(id: string) {
		if (sortBy === id) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = id;
			sortDir = DEFAULT_DIR[id] ?? 'asc';
		}
	}

	const vertTopIcon = $derived(
		activeTab === 'props'
			? 'lucide-list-tree'
			: activeTab === 'tags'
				? 'lucide-network'
				: 'lucide-circle',
	);

	const vertBotIcon = $derived(
		activeTab === 'files' ? 'lucide-circle-dot' : 'lucide-chevrons-down',
	);
</script>

<div class="vm-sort-popup">
	<!-- Vert-col: absolute, floats left over tab content -->
	<div class="vm-sort-vertcol">
		{#if activeTab === 'props' || activeTab === 'tags'}
			<div
				class="vm-sort-vertcol-btn"
				class:is-active={vertTopActive}
				aria-label={activeTab === 'props'
					? translate('sort.vertcol.props_values')
					: translate('sort.vertcol.node_level')}
				onclick={() => {
					vertTopActive = !vertTopActive;
				}}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') vertTopActive = !vertTopActive;
				}}
				role="button"
				tabindex="0"
				use:icon={vertTopIcon}
			></div>
		{/if}
		<div
			class="vm-sort-vertcol-btn"
			class:is-active={drawerOpen}
			aria-label={activeTab === 'files'
				? translate('sort.vertcol.direct_toggle')
				: translate('sort.vertcol.scope_drawer')}
			onclick={() => {
				drawerOpen = !drawerOpen;
			}}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') drawerOpen = !drawerOpen;
			}}
			role="button"
			tabindex="0"
			use:icon={vertBotIcon}
		></div>
		{#if drawerOpen && (activeTab === 'props' || activeTab === 'tags')}
			<div class="vm-sort-vertcol-drawer">
				{#each DRAWER_OPTIONS[activeTab] as opt (opt)}
					<div class="vm-sort-drawer-item">{opt}</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Main content panel: row 1 + row 2 -->
	<div class="vm-sort-main">
		<!-- Row 1: Scope dropdown · Template btn · Close btn -->
		<div class="vm-sort-row vm-sort-row-controls">
			<select
				class="vm-sort-scope-select"
				bind:value={operationScope}
				onchange={() => onOperationScopeChange?.(operationScope)}
				aria-label={translate('sort.scope.label')}
			>
				<option value="auto">{translate('settings.scope.auto')}</option>
				<option value="all">{translate('sort.scope.all')}</option>
				<option value="filtered">{translate('sort.scope.filtered')}</option>
				<option value="selected">{translate('sort.scope.selected')}</option>
			</select>
			<div
				class="vm-sort-circle-btn"
				aria-label={translate('sort.template')}
				onclick={() => {
					/* no-op: Iter 17 */
				}}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') {
						/* no-op: Iter 17 */
					}
				}}
				role="button"
				tabindex="0"
				use:icon={'lucide-bookmark'}
			></div>
			<div
				class="vm-sort-close-btn clickable-icon"
				aria-label={translate('sort.close')}
				onclick={onClose}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter' || e.key === ' ') onClose();
				}}
				role="button"
				tabindex="0"
				use:icon={'lucide-chevron-right'}
			></div>
		</div>

		<!-- Row 2: 4 squircles -->
		<div class="vm-sort-row vm-squircle-row">
			{#each SORT_OPTIONS[activeTab] as opt (opt.id)}
				<div
					class="vm-squircle"
					class:is-accent={sortBy === opt.id}
					aria-label={translate(opt.labelKey) +
						(sortBy === opt.id ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')}
					onclick={() => selectSort(opt.id)}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter' || e.key === ' ') selectSort(opt.id);
					}}
					role="button"
					tabindex="0"
				>
					<span class="vm-squircle-icon" use:icon={opt.iconName}></span>
					{#if sortBy === opt.id}
						<span
							class="vm-sort-dir"
							use:icon={sortDir === 'asc' ? 'lucide-arrow-up' : 'lucide-arrow-down'}
						></span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
