<script lang="ts">
	import { setIcon } from 'obsidian';
	import type { VaultmanPlugin } from '../../main';
	import { Virtualizer } from '../../services/serviceVirtualizer.svelte';
	import type { QueueChange } from '../../types/contracts';
	import { translate } from '../../i18n/index';

	let {
		plugin,
		onClose,
	}: {
		plugin: VaultmanPlugin;
		onClose?: () => void;
	} = $props();

	let outerEl: HTMLDivElement | undefined = $state();
	const v = new Virtualizer<QueueChange>();

	const totalH = $derived(v.items.length * v.rowHeight);
	const hasItems = $derived(v.items.length > 0);

	$effect(() => {
		v.items = [...plugin.operationsIndex.nodes];
	});

	$effect(() => {
		if (!outerEl) return;
		v.viewportHeight = outerEl.clientHeight;
		const ro = new ResizeObserver(() => {
			if (outerEl) v.viewportHeight = outerEl.clientHeight;
		});
		ro.observe(outerEl);
		return () => ro.disconnect();
	});

	function icon(el: HTMLElement, name: string) {
		setIcon(el, name);
		return { update: (n: string) => setIcon(el, n) };
	}

	function onScroll(e: Event) {
		v.scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
	}

	function removeItem(id: string) {
		plugin.queueService.remove(id);
	}

	function clearQueue() {
		plugin.queueService.clear();
	}

	function executeAll() {
		void plugin.queueService.execute();
		onClose?.();
	}
</script>

<div class="vm-explorer-popup-shell">
	<div class="vm-popup-squircles" aria-label={translate('ops.queue')}>
		<button
			class="vm-squircle"
			onclick={clearQueue}
			disabled={!hasItems}
			aria-label={translate('queue.clear')}
			use:icon={'lucide-trash-2'}
		></button>
		<button
			class="vm-squircle"
			disabled
			aria-label={translate('queue.marks')}
			use:icon={'lucide-book-marked'}
		></button>
		<button
			class="vm-squircle"
			disabled
			aria-label={translate('queue.file_diff')}
			use:icon={'lucide-git-compare'}
		></button>
		<button
			class="vm-squircle is-accent"
			onclick={executeAll}
			disabled={!hasItems}
			aria-label={translate('queue.execute')}
			use:icon={'lucide-check'}
		></button>
		<button
			class="vm-squircle"
			onclick={onClose}
			aria-label={translate('common.close')}
			use:icon={'lucide-x'}
		></button>
	</div>

	<div class="vm-explorer-popup">
		<header class="vm-explorer-popup-header">
			<span class="vm-subtitle">{translate('ops.queue', { count: v.items.length })}</span>
		</header>

		{#if !hasItems}
			<div class="vm-explorer-popup-empty">{translate('queue.island.empty')}</div>
		{:else}
			<div bind:this={outerEl} class="vm-explorer-popup-list" onscroll={onScroll}>
				<div class="vm-explorer-popup-inner" style="height: {totalH}px">
					{#each v.visible as item, i (item.id)}
						{@const absIdx = v.window.startIndex + i}
						<div
							class="vm-explorer-popup-row"
							style="transform: translateY({absIdx * v.rowHeight}px)"
						>
							<span class="vm-queue-item-type">{item.change.type}</span>
							<span class="vm-queue-item-detail">{item.change.details ?? ''}</span>
							<button
								class="vm-btn-icon vm-btn-danger"
								onclick={() => removeItem(item.id)}
								aria-label={translate('queue.remove')}>×</button
							>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
