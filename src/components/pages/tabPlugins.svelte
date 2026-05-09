<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { setIcon } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import { explorerPlugins } from '../../providers/explorerPlugins';
	import type {
		ExplorerExpansionCommand,
		ExplorerExpansionSummary,
		ExplorerViewMode,
	} from '../../types/typeExplorer';
	import PanelExplorer from '../containers/panelExplorer.svelte';

	let {
		plugin,
		searchTerm = $bindable(''),
		searchMode = 0,
		sortBy = $bindable('name'),
		sortDirection = $bindable('asc'),
		viewMode = $bindable('tree'),
		active = true,
		explorer = $bindable(),
		nodeExpansionCommand = null,
		onNodeExpansionSummaryChange,
	}: {
		plugin: VaultmanPlugin;
		searchTerm?: string;
		searchMode?: number;
		sortBy?: string;
		sortDirection?: 'asc' | 'desc';
		viewMode?: ExplorerViewMode;
		active?: boolean;
		explorer?: explorerPlugins;
		nodeExpansionCommand?: ExplorerExpansionCommand | null;
		onNodeExpansionSummaryChange?: (summary: ExplorerExpansionSummary) => void;
	} = $props();

	onMount(() => {
		explorer = new explorerPlugins(plugin);
	});

	onDestroy(() => {
		explorer?.destroy();
	});

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(n: string) {
				setIcon(el, n);
			},
		};
	}
</script>

<div class="vm-plugins-tab-content">
	{#if explorer}
		<PanelExplorer
			{plugin}
			provider={explorer}
			bind:viewMode
			bind:searchTerm
			{searchMode}
			bind:sortBy
			bind:sortDirection
			{active}
			{nodeExpansionCommand}
			{onNodeExpansionSummaryChange}
			{icon}
		/>
	{/if}
</div>
