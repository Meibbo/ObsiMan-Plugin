<script lang="ts">
	let { children }: { children?: import('svelte').Snippet } = $props();
</script>

<div data-svar-theme="light">
	{@render children?.()}
</div>
