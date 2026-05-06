<script lang="ts" generics="T">
	let {
		value = $bindable<T>(),
		options,
		label,
		disabled = false,
		onChange,
	}: {
		value: T;
		options: { value: T; label: string }[];
		label?: string;
		disabled?: boolean;
		onChange?: (next: T) => void;
	} = $props();

	function handleChange(event: Event): void {
		const select = event.currentTarget as HTMLSelectElement;
		const next = options[select.selectedIndex]?.value;
		if (next === undefined) return;
		value = next;
		onChange?.(next);
	}
</script>

<label class="vm-dropdown">
	{#if label}<span class="vm-dropdown-label">{label}</span>{/if}
	<select bind:value {disabled} onchange={handleChange}>
		{#each options as opt (String(opt.value))}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
</label>
