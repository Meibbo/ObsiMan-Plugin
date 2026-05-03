<script lang="ts">
  import type { TabConfig } from "../../types/typeTab";
  import { setIcon } from "obsidian";
  import { translate } from "../../index/i18n/lang";

  let {
    tabs,
    active = $bindable(),
    showLabels = false,
  }: {
    tabs: TabConfig[];
    active: string;
    showLabels?: boolean;
  } = $props();

  function attachIcon(node: HTMLElement, iconName: string): { update: (n: string) => void } {
    setIcon(node, iconName);
    return { update: (n: string) => setIcon(node, n) };
  }
</script>

<div class="vm-tab-bar" class:has-labels={showLabels}>
  {#each tabs as tab (tab.id)}
    <div
      class="vm-tab nav-action-button"
      class:is-active={active === tab.id}
      onclick={() => (active = tab.id)}
      onkeydown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          active = tab.id;
        }
      }}
      aria-label={translate(tab.labelKey)}
      role="tab"
      tabindex="0"
    >
      <span class="vm-tab-icon" use:attachIcon={tab.icon}></span>
      {#if showLabels}
        <span class="vm-tab-label">{translate(tab.labelKey)}</span>
      {/if}
    </div>
  {/each}
</div>
