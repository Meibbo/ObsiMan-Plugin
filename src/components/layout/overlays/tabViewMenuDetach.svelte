<script lang="ts">
	/**
	 * tabViewMenuDetach — single menu entry that flips between
	 * "detach to leaf" and "return to panel" depending on the current
	 * detach state owned by `LeafDetachService`.
	 *
	 * Spec: docs/work/hardening/specs/2026-05-07-multifacet-2/04-independent-leaves.md
	 */
	import { translate } from '../../../index/i18n/lang';
	import type { LeafDetachService } from '../../../services/serviceLeafDetach';
	import { DETACHABLE, type TabId } from '../../../registry/tabRegistry';

	let {
		tabId,
		leafDetach,
		onAction,
	}: {
		tabId: TabId;
		leafDetach: LeafDetachService;
		onAction?: (next: 'detached' | 'attached') => void;
	} = $props();

	// Capture the initial detached state via untracked read, then drive
	// further updates explicitly via the click handler. Reading `tabId`
	// inside `$state(...)` would warn about referencing a prop locally.
	const initialDetached = leafDetach.isDetached(tabId);
	let detached = $state(initialDetached);
	let busy = $state(false);

	const visible = $derived(DETACHABLE.has(tabId));

	const label = $derived(
		detached
			? translate('viewmenu.return_to_panel') ?? 'Return to panel'
			: translate('viewmenu.detach_to_leaf') ?? 'Detach to leaf',
	);

	async function onClick() {
		if (busy) return;
		busy = true;
		try {
			if (detached) {
				await leafDetach.attach(tabId);
				detached = false;
				onAction?.('attached');
			} else {
				await leafDetach.detach(tabId);
				detached = true;
				onAction?.('detached');
			}
		} finally {
			busy = false;
		}
	}
</script>

{#if visible}
	<button
		type="button"
		class="vm-viewmenu-detach"
		data-detached={detached ? 'true' : 'false'}
		data-tab-id={tabId}
		disabled={busy}
		onclick={onClick}
	>
		{label}
	</button>
{/if}
