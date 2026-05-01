<script lang="ts">
  import { setIcon } from 'obsidian';

  let {
    icon,
    label,
    onClick,
    isActive = false,
    disabled = false,
    size = 'md',
  }: {
    icon: string;
    label: string;
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
  } = $props();

  function attachIcon(node: HTMLElement, name: string): { update(name: string): void; destroy(): void } {
    setIcon(node, name);
    return {
      update(n: string) { setIcon(node, n); },
      destroy() { node.empty(); },
    };
  }

  let classes = $derived(
    `vm-btn-squircle vm-btn-squircle-${size}${isActive ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`
  );
</script>

<button
  class={classes}
  aria-label={label}
  title={label}
  disabled={disabled}
  onclick={() => { if (!disabled) onClick(); }}
>
  <span use:attachIcon={icon} class="vm-btn-squircle-icon"></span>
</button>
