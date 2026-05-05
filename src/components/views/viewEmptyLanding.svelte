<script lang="ts">
	import type { ViewEmptyState } from '../../types/typeViews';

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
	<span class="vm-empty-landing-icon" class:is-loading={kind === 'loading'} use:iconAction={iconName}></span>
	<div class="vm-empty-landing-copy">
		<h3>{state.label}</h3>
		{#if state.detail}
			<p>{state.detail}</p>
		{/if}
	</div>
</section>

<style>
	.vm-empty-landing {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		min-height: 160px;
		height: 100%;
		padding: 24px;
		color: var(--text-muted);
		text-align: left;
	}

	.vm-empty-landing-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		flex: 0 0 auto;
		color: var(--text-accent);
	}

	.vm-empty-landing-icon :global(svg) {
		width: 22px;
		height: 22px;
	}

	.vm-empty-landing-icon.is-loading {
		animation: vm-empty-landing-spin 1s linear infinite;
	}

	.vm-empty-landing-copy {
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-width: 280px;
	}

	.vm-empty-landing h3 {
		margin: 0;
		color: var(--text-normal);
		font-size: 14px;
		font-weight: 600;
		line-height: 1.3;
	}

	.vm-empty-landing p {
		margin: 0;
		font-size: 12px;
		line-height: 1.4;
	}

	@keyframes vm-empty-landing-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
