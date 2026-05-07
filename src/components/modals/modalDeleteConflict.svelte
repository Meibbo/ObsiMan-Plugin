<script lang="ts">
	import { translate } from '../../index/i18n/lang';
	import type { ConflictingOpDescriptor } from '../../services/serviceQueue.svelte';

	interface Props {
		nodeLabel: string;
		conflictingOps: ConflictingOpDescriptor[];
		onConfirm: () => void;
		onCancel: () => void;
	}

	let { nodeLabel, conflictingOps, onConfirm, onCancel }: Props = $props();

	const opsSummary = $derived(
		conflictingOps
			.map((op) => `${op.kind}${op.label ? ` (${op.label})` : ''}`)
			.join(', '),
	);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onCancel();
		}
	}
</script>

<div
	class="vm-modal vm-modal-delete-conflict"
	role="dialog"
	aria-modal="true"
	aria-labelledby="vm-modal-delete-conflict-title"
	onkeydown={handleKeydown}
	tabindex="-1"
>
	<h3 id="vm-modal-delete-conflict-title" class="vm-modal-title">
		{translate('modal.delete_conflict.title')}
	</h3>
	<p class="vm-modal-body">
		{translate('modal.delete_conflict.body', { label: nodeLabel, ops: opsSummary })}
	</p>
	<ul class="vm-modal-conflict-list">
		{#each conflictingOps as op (op.opId)}
			<li class="vm-modal-conflict-item" data-op-kind={op.kind}>
				<span class="vm-modal-conflict-kind">{op.kind}</span>
				{#if op.label}
					<span class="vm-modal-conflict-label">{op.label}</span>
				{/if}
			</li>
		{/each}
	</ul>
	<div class="vm-modal-actions">
		<button
			type="button"
			class="vm-modal-button vm-modal-cancel"
			data-action="cancel"
			onclick={onCancel}
		>
			{translate('common.cancel')}
		</button>
		<button
			type="button"
			class="vm-modal-button vm-modal-confirm mod-warning"
			data-action="confirm"
			onclick={onConfirm}
		>
			{translate('common.confirm')}
		</button>
	</div>
</div>
