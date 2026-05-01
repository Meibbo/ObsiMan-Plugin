<script lang="ts" generics="T">
  let {
    value = $bindable<T>(),
    options,
    label,
    disabled = false,
  }: {
    value: T;
    options: { value: T; label: string }[];
    label?: string;
    disabled?: boolean;
  } = $props();
</script>

<label class="vm-dropdown">
  {#if label}<span class="vm-dropdown-label">{label}</span>{/if}
  <select bind:value={value} {disabled}>
    {#each options as opt (String(opt.value))}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</label>
