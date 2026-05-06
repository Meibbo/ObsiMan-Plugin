<script lang="ts">
	let {
		text,
		ranges = [],
	}: {
		text: string;
		ranges?: { start: number; end: number }[];
	} = $props();

	let segments = $derived.by(() => {
		if (ranges.length === 0) return [{ text, highlight: false }];
		const sorted = [...ranges].sort((a, b) => a.start - b.start);
		const out: { text: string; highlight: boolean }[] = [];
		let cursor = 0;
		for (const r of sorted) {
			if (cursor < r.start) out.push({ text: text.slice(cursor, r.start), highlight: false });
			out.push({ text: text.slice(r.start, r.end), highlight: true });
			cursor = r.end;
		}
		if (cursor < text.length) out.push({ text: text.slice(cursor), highlight: false });
		return out;
	});
</script>

{#each segments as seg, i (i)}
	{#if seg.highlight}<mark class="vm-highlight">{seg.text}</mark>{:else}{seg.text}{/if}
{/each}
