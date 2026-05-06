<script lang="ts">
	import type { ViewEmptyState } from '../../types/typeViews';
	import IndicatorOrbitingInk from '../primitives/IndicatorOrbitingInk.svelte';

	interface Props {
		state: ViewEmptyState;
		icon?: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let { state, icon }: Props = $props();

	const kind = $derived(state.kind ?? 'empty');
	const iconName = $derived(state.icon ?? (kind === 'loading' ? 'lucide-loader-circle' : 'lucide-inbox'));

	function iconAction(el: HTMLElement, name: string) {
		return icon?.(el, name) ?? { update: () => {} };
	}
</script>

<section class="vm-empty-landing" data-empty-kind={kind} aria-live={kind === 'loading' ? 'polite' : 'off'}>
	{#if kind === 'loading'}
		<div class="vm-empty-landing-indicator">
			<IndicatorOrbitingInk size={40} />
		</div>
	{:else}
		<span class="vm-empty-landing-icon" use:iconAction={iconName}></span>
	{/if}
	<div class="vm-empty-landing-copy">
		<h3>{state.label}</h3>
		{#if state.detail}
			<p>{state.detail}</p>
		{/if}
	</div>
</section>
