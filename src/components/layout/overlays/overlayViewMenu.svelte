<script lang="ts">
	import { translate } from '../../../index/i18n/lang';
	import { untrack } from 'svelte';
	import BtnSelection from '../../btnSelection.svelte';
	import type { BtnSelectionItem } from '../../../types/typePrimitives';

	type FiltersTab = 'props' | 'files' | 'tags' | 'content';
	type ViewMode = 'tree' | 'dnd' | 'grid' | 'cards';

	type PillDef = {
		id: string;
		labelKey: string;
		defaultOn: boolean;
	};

	const VIEW_MODES: { id: ViewMode; iconName: string; labelKey: string }[] = [
		{
			id: 'tree',
			iconName: 'lucide-list-tree',
			labelKey: 'viewmode.mode.tree',
		},
		{
			id: 'dnd',
			iconName: 'lucide-grip-vertical',
			labelKey: 'viewmode.mode.dnd',
		},
		{
			id: 'grid',
			iconName: 'lucide-layout-grid',
			labelKey: 'viewmode.mode.grid',
		},
		{
			id: 'cards',
			iconName: 'lucide-layout-panel-top',
			labelKey: 'viewmode.mode.cards',
		},
	];

	// Pills for each combination of tab × view (files splits by view mode).
	const PILLS: Record<string, PillDef[]> = {
		tags: [
			{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true },
			{ id: 'text', labelKey: 'viewmode.pill.text', defaultOn: true },
			{ id: 'count', labelKey: 'viewmode.pill.count', defaultOn: true },
			{ id: 'files', labelKey: 'viewmode.pill.files', defaultOn: false },
			{ id: 'nested', labelKey: 'viewmode.pill.nested', defaultOn: false },
			{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: false },
		],
		props: [
			{ id: 'icon', labelKey: 'viewmode.pill.icon', defaultOn: true },
			{ id: 'text', labelKey: 'viewmode.pill.text', defaultOn: true },
			{ id: 'count', labelKey: 'viewmode.pill.count', defaultOn: true },
			{ id: 'type', labelKey: 'viewmode.pill.type', defaultOn: false },
			{ id: 'values', labelKey: 'viewmode.pill.values', defaultOn: false },
			{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: false },
		],
		'files-grid': [
			{ id: 'name', labelKey: 'viewmode.pill.name', defaultOn: true },
			{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: true },
			{ id: 'tags', labelKey: 'viewmode.pill.tags', defaultOn: false },
			{ id: 'path', labelKey: 'viewmode.pill.path', defaultOn: false },
			{ id: 'size', labelKey: 'viewmode.pill.size', defaultOn: false },
		],
		'files-tree': [
			{ id: 'name', labelKey: 'viewmode.pill.name', defaultOn: true },
			{ id: 'ext', labelKey: 'viewmode.pill.ext', defaultOn: true },
			{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: false },
			{ id: 'tags', labelKey: 'viewmode.pill.tags', defaultOn: false },
			{ id: 'path', labelKey: 'viewmode.pill.path', defaultOn: false },
		],
		content: [
			{ id: 'path', labelKey: 'viewmode.pill.path', defaultOn: true },
			{ id: 'text', labelKey: 'viewmode.pill.text', defaultOn: true },
			{ id: 'date', labelKey: 'viewmode.pill.date', defaultOn: false },
		],
	};

	function defaultPills(key: string): Set<string> {
		const defs = PILLS[key] ?? [];
		return new Set(defs.filter((p) => p.defaultOn).map((p) => p.id));
	}

	function pillsKey(tab: FiltersTab, view: ViewMode): string {
		if (tab === 'files') return view === 'grid' ? 'files-grid' : 'files-tree';
		return tab;
	}

	let {
		activeTab,
		onClose,
		viewMode = $bindable('tree'),
		addMode = $bindable(false),
		icon,
		initialViewMode = 'tree' as ViewMode,
		addOpCount = 0,
	}: {
		activeTab: FiltersTab;
		onClose: () => void;
		viewMode: ViewMode;
		addMode: boolean;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
		initialViewMode?: ViewMode;
		addOpCount?: number;
	} = $props();

	let activePills = $state<Set<string>>(
		untrack(() => defaultPills(pillsKey(activeTab, initialViewMode))),
	);

	// Reset per-tab UI state (pills), but NOT the view mode (shared)
	let _prevTab = $state<FiltersTab>(untrack(() => activeTab));
	$effect(() => {
		if (activeTab !== _prevTab) {
			_prevTab = activeTab;
			activePills = defaultPills(pillsKey(activeTab, viewMode));
		}
	});

	const currentPillKey = $derived(pillsKey(activeTab, viewMode));
	const currentPillDefs = $derived(PILLS[currentPillKey] ?? []);
	const showSearch = $derived(activeTab === 'files' && viewMode === 'grid');

	function selectView(v: ViewMode) {
		if (viewMode === v) return;
		viewMode = v;
		activePills = defaultPills(pillsKey(activeTab, v));
	}

	function togglePill(id: string) {
		const next = new Set(activePills);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		activePills = next;
	}

	function toggleAddMode() {
		addMode = !addMode;
	}

	const viewModeButtons = $derived<BtnSelectionItem[]>(
		VIEW_MODES.map((vm) => ({
			icon: vm.iconName,
			label: translate(vm.labelKey),
			isActive: viewMode === vm.id,
			onClick: () => selectView(vm.id),
		})),
	);
</script>

<div class="vm-viewmode-popup">
	<!-- Row 1: close · template · search* · pills (scroll) -->
	<div class="vm-viewmode-row vm-viewmode-row-controls">
		<div
			class="vm-viewmode-close-btn clickable-icon"
			aria-label={translate('viewmode.close')}
			onclick={onClose}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') onClose();
			}}
			role="button"
			tabindex="0"
			use:icon={'lucide-chevron-left'}
		></div>
		<div
			class="vm-viewmode-circle-btn"
			aria-label={translate('viewmode.template')}
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
		{#if showSearch}
			<div
				class="vm-viewmode-circle-btn"
				aria-label={translate('viewmode.search_cols')}
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
				use:icon={'lucide-search'}
			></div>
		{/if}
		<!-- ADD mode FAB -->
		<div
			class="vm-nav-fab"
			class:is-add-active={addMode}
			role="button"
			tabindex="0"
			aria-label={translate('viewmode.add_mode')}
			onclick={toggleAddMode}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') toggleAddMode();
			}}
			use:icon={'lucide-plus'}
		>
			{#if addOpCount && addOpCount > 0}
				<span class="vm-fab-badge">{addOpCount}</span>
			{/if}
		</div>
		<!-- Pills (horizontal scroll, no scrollbar) -->
		<div class="vm-viewmode-pills">
			{#each currentPillDefs as pill (pill.id)}
				<button
					class="vm-viewmode-pill"
					class:is-active={activePills.has(pill.id)}
					onclick={() => togglePill(pill.id)}
				>
					{translate(pill.labelKey)}
				</button>
			{/each}
		</div>
	</div>

	<!-- Row 2: view-mode squircles (via btnSelection shared primitive) -->
	<div class="vm-viewmode-row">
		<BtnSelection buttons={viewModeButtons} />
	</div>
</div>
