<script lang="ts">
	/**
	 * settingsLeafToggle — global "all tabs as independent leaves" toggle.
	 * On = detach every tab in DETACHABLE; off = re-attach every tab.
	 *
	 * Spec: docs/work/hardening/specs/2026-05-07-multifacet-2/04-independent-leaves.md
	 */
	import { translate } from '../../index/i18n/lang';
	import { ALL_TAB_IDS } from '../../registry/tabRegistry';
	import type { LeafDetachService } from '../../services/serviceLeafDetach';

	let {
		leafDetach,
		onChange,
	}: {
		leafDetach: LeafDetachService;
		onChange?: (allDetached: boolean) => void;
	} = $props();

	function computeAllDetached(): boolean {
		return ALL_TAB_IDS.every((t) => leafDetach.isDetached(t));
	}

	let allDetached = $state(computeAllDetached());
	let busy = $state(false);

	async function onClick() {
		if (busy) return;
		busy = true;
		try {
			if (allDetached) {
				for (const t of ALL_TAB_IDS) await leafDetach.attach(t);
				allDetached = false;
			} else {
				for (const t of ALL_TAB_IDS) await leafDetach.detach(t);
				allDetached = true;
			}
			onChange?.(allDetached);
		} finally {
			busy = false;
		}
	}

	const label = $derived(
		translate('settings.leaf_toggle.all_independent') ?? 'All tabs as independent leaves',
	);
</script>

<label class="vm-settings-leaf-toggle">
	<span class="vm-settings-label">{label}</span>
	<input
		type="checkbox"
		class="vm-settings-leaf-toggle-input"
		checked={allDetached}
		disabled={busy}
		onchange={onClick}
	/>
</label>
