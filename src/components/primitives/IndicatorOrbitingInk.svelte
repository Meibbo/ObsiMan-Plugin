<script lang="ts">
	/* Organic loading indicator with gooey effect. */
	interface Props {
		size?: number;
		color?: string;
	}

	let { size = 28, color = 'var(--text-accent)' }: Props = $props();
</script>

<div
	class="vm-indicator-orbiting-ink"
	style:--indicator-size="{size}px"
	style:--indicator-color={color}
>
	<div class="gooey-container">
		<div class="gooey-blob anim-orbit blob-1"></div>
		<div class="gooey-blob anim-orbit blob-2"></div>
		<div class="gooey-blob anim-pulse blob-center"></div>
	</div>
</div>
