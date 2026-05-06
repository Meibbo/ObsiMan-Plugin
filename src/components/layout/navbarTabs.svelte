<script lang="ts">
	import type { TabConfig } from '../../types/typeTab';
	import { setIcon } from 'obsidian';
	import { translate } from '../../index/i18n/lang';

	let {
		tabs,
		active = $bindable(),
		showLabels = false,
		disabledTabIds = [],
		faintTabIds = [],
	}: {
		tabs: TabConfig[];
		active: string;
		showLabels?: boolean;
		disabledTabIds?: string[];
		faintTabIds?: string[];
	} = $props();

	const disabledTabs = $derived(new Set(disabledTabIds));
	const faintTabs = $derived(new Set(faintTabIds));

	function attachIcon(node: HTMLElement, iconName: string): { update: (n: string) => void } {
		setIcon(node, iconName);
		return { update: (n: string) => setIcon(node, n) };
	}

	function selectTab(tabId: string): void {
		if (disabledTabs.has(tabId)) return;
		active = tabId;
	}
</script>

<div class="vm-tab-bar" class:has-labels={showLabels}>
	{#each tabs as tab (tab.id)}
		{@const disabled = disabledTabs.has(tab.id)}
		<div
			class="vm-tab nav-action-button"
			class:is-active={active === tab.id}
			class:is-disabled={disabled}
			class:is-faint={faintTabs.has(tab.id)}
			onclick={() => selectTab(tab.id)}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					selectTab(tab.id);
				}
			}}
			aria-label={translate(tab.labelKey)}
			aria-disabled={disabled}
			role="tab"
			tabindex={disabled ? -1 : 0}
		>
			<span class="vm-tab-icon" use:attachIcon={tab.icon}></span>
			{#if showLabels}
				<span class="vm-tab-label">{translate(tab.labelKey)}</span>
			{/if}
		</div>
	{/each}
</div>
