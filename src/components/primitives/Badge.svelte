<script lang="ts">
	let {
		label,
		accent,
		size,
	}: {
		label: string;
		accent?: string;
		size?: string;
	} = $props();

	let style = $derived(
		(accent ? `--badge-accent: var(${accent}, ${accent});` : '') +
			(size ? `--badge-size: ${size};` : ''),
	);
</script>

<span class="vm-badge" {style}>{label}</span>
