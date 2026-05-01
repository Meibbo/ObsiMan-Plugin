<script lang="ts">
  let {
    value = $bindable(''),
    label,
    placeholder = '',
    disabled = false,
    onInput,
  }: {
    value: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    onInput?: (next: string) => void;
  } = $props();
</script>

<label class="vm-text-input">
  {#if label}<span class="vm-text-input-label">{label}</span>{/if}
  <input
    type="text"
    bind:value={value}
    {placeholder}
    {disabled}
    oninput={() => onInput?.(value)}
  />
</label>
