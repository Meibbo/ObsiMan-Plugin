<script lang="ts">
	let { children }: { children?: import('svelte').Snippet } = $props();
</script>

<div data-svar-theme="dark">
	{@render children?.()}
</div>
