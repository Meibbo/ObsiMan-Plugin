<script lang="ts">
  import { setIcon } from "obsidian";

  export interface BtnSelectionItem {
    icon: string;          // Lucide icon name (e.g. "lucide-trash")
    label: string;         // i18n-resolved text for aria-label + tooltip
    onClick: () => void;   // fire-and-forget; async callers must wrap with `void`
    isActive?: boolean;    // visual active state (e.g. toggle ON)
    isToggle?: boolean;    // marks button as toggleable (distinct feel from imperative)
    disabled?: boolean;    // grayed out, non-clickable
  }

  interface Props {
    buttons: BtnSelectionItem[];  // 1–4 items
    ariaLabel?: string;           // overall row aria-label
  }

  let { buttons, ariaLabel }: Props = $props();

  function iconAction(el: HTMLElement, name: string) {
    setIcon(el, name);
    return {
      update(newName: string) {
        setIcon(el, newName);
      },
    };
  }
</script>

<div class="vaultman-squircle-row vm-btn-selection-row" aria-label={ariaLabel}>
  {#each buttons as item (item.label)}
    <div
      class="vaultman-squircle"
      class:is-active={item.isActive}
      class:is-toggle={item.isToggle}
      class:is-accent={!item.isToggle && item.isActive}
      class:is-disabled={item.disabled}
      aria-label={item.label}
      aria-pressed={item.isToggle ? item.isActive : undefined}
      role="button"
      tabindex={item.disabled ? -1 : 0}
      use:iconAction={item.icon}
      onclick={() => { if (!item.disabled) item.onClick(); }}
      onkeydown={(e: KeyboardEvent) => {
        if ((e.key === "Enter" || e.key === " ") && !item.disabled) item.onClick();
      }}
    ></div>
  {/each}
</div>
