<script lang="ts">
  let {
    label,
    accent,
  }: {
    label: string;
    accent?: string;
  } = $props();

  let style = $derived(accent ? `--badge-accent: var(${accent}, ${accent});` : '');
</script>

<span class="vm-badge" style={style}>{label}</span>
