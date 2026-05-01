<script lang="ts">
  let {
    checked = $bindable(false),
    label,
    disabled = false,
    onChange,
  }: {
    checked: boolean;
    label: string;
    disabled?: boolean;
    onChange?: (next: boolean) => void;
  } = $props();
</script>

<label class="vm-toggle" class:is-disabled={disabled}>
  <input type="checkbox" bind:checked={checked} {disabled} onchange={() => onChange?.(checked)} />
  <span class="vm-toggle-knob"></span>
  <span class="vm-toggle-label">{label}</span>
</label>
