<script lang="ts">
	import { setIcon } from 'obsidian';
	import type { BtnSelectionItem } from '../types/typePrimitives';

	export type { BtnSelectionItem };

	interface Props {
		buttons: BtnSelectionItem[];
		ariaLabel?: string; // overall row aria-label
	}

	let { buttons, ariaLabel }: Props = $props();

	function iconAction(el: HTMLElement, name: string) {
		setIcon(el, name);
		return {
			update(newName: string) {
				setIcon(el, newName);
			},
		};
	}
</script>

<div class="vm-squircle-row vm-btn-selection-row" aria-label={ariaLabel}>
	{#each buttons as item (item.label)}
		<div
			class="vm-squircle"
			class:is-active={item.isActive}
			class:is-toggle={item.isToggle}
			class:is-accent={!item.isToggle && item.isActive}
			class:is-disabled={item.disabled}
			aria-label={item.label}
			aria-pressed={item.isToggle ? item.isActive : undefined}
			role="button"
			tabindex={item.disabled ? -1 : 0}
			use:iconAction={item.icon}
			onclick={() => {
				if (!item.disabled) item.onClick();
			}}
			onkeydown={(e: KeyboardEvent) => {
				if ((e.key === 'Enter' || e.key === ' ') && !item.disabled) item.onClick();
			}}
		></div>
	{/each}
</div>
