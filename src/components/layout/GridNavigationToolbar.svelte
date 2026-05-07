<script lang="ts">
	import type { TreeNode } from '../../types/typeNode';

	interface Props {
		path: TreeNode[];
		canBack?: boolean;
		canForward?: boolean;
		canUp?: boolean;
		onBack?: () => void;
		onForward?: () => void;
		onUp?: () => void;
		onRefresh?: () => void;
		onNavigateRoot?: () => void;
		onNavigateCrumb?: (id: string) => void;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		path,
		canBack = false,
		canForward = false,
		canUp = false,
		onBack,
		onForward,
		onUp,
		onRefresh,
		onNavigateRoot,
		onNavigateCrumb,
		icon,
	}: Props = $props();
</script>

<div class="vm-grid-nav-toolbar" aria-label="Grid navigation">
	<div class="vm-grid-nav-buttons">
		<button
			type="button"
			class="vm-grid-nav-button"
			data-vm-grid-nav="back"
			aria-label="Back"
			title="Back"
			disabled={!canBack}
			onclick={() => onBack?.()}
			use:icon={'lucide-arrow-left'}
		></button>
		<button
			type="button"
			class="vm-grid-nav-button"
			data-vm-grid-nav="forward"
			aria-label="Forward"
			title="Forward"
			disabled={!canForward}
			onclick={() => onForward?.()}
			use:icon={'lucide-arrow-right'}
		></button>
		<button
			type="button"
			class="vm-grid-nav-button"
			data-vm-grid-nav="up"
			aria-label="Up"
			title="Up"
			disabled={!canUp}
			onclick={() => onUp?.()}
			use:icon={'lucide-arrow-up'}
		></button>
		<button
			type="button"
			class="vm-grid-nav-button"
			data-vm-grid-nav="refresh"
			aria-label="Refresh"
			title="Refresh"
			onclick={() => onRefresh?.()}
			use:icon={'lucide-refresh-cw'}
		></button>
	</div>
	<nav class="vm-grid-breadcrumbs" aria-label="Grid location">
		<button
			type="button"
			class="vm-grid-crumb"
			class:is-current={path.length === 0}
			data-vm-grid-crumb="root"
			aria-current={path.length === 0 ? 'page' : undefined}
			onclick={() => onNavigateRoot?.()}
		>
			Root
		</button>
		{#each path as crumb, index (crumb.id)}
			<span class="vm-grid-crumb-separator" aria-hidden="true">/</span>
			<button
				type="button"
				class="vm-grid-crumb"
				class:is-current={index === path.length - 1}
				data-vm-grid-crumb={crumb.id}
				aria-current={index === path.length - 1 ? 'page' : undefined}
				onclick={() => {
					if (index !== path.length - 1) onNavigateCrumb?.(crumb.id);
				}}
			>
				{crumb.label}
			</button>
		{/each}
	</nav>
</div>
