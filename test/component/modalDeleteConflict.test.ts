import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ModalDeleteConflict from '../../src/components/modals/modalDeleteConflict.svelte';

describe('modalDeleteConflict.svelte', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
	});

	function mountModal(onConfirm: () => void, onCancel: () => void) {
		app = mount(ModalDeleteConflict as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodeLabel: 'foo',
				conflictingOps: [
					{ opId: 'op-1', kind: 'rename', label: 'foo→bar' },
					{ opId: 'op-2', kind: 'set', label: 'set color' },
				],
				onConfirm,
				onCancel,
			},
		});
		flushSync();
	}

	it('renders the conflicting ops as a list', () => {
		mountModal(vi.fn(), vi.fn());
		const items = target.querySelectorAll('.vm-modal-conflict-item');
		expect(items.length).toBe(2);
	});

	it('clicking the confirm button fires onConfirm', () => {
		const confirm = vi.fn();
		const cancel = vi.fn();
		mountModal(confirm, cancel);
		const btn = target.querySelector<HTMLButtonElement>('[data-action="confirm"]');
		expect(btn).toBeTruthy();
		btn!.click();
		expect(confirm).toHaveBeenCalledTimes(1);
		expect(cancel).not.toHaveBeenCalled();
	});

	it('clicking the cancel button fires onCancel', () => {
		const confirm = vi.fn();
		const cancel = vi.fn();
		mountModal(confirm, cancel);
		const btn = target.querySelector<HTMLButtonElement>('[data-action="cancel"]');
		expect(btn).toBeTruthy();
		btn!.click();
		expect(cancel).toHaveBeenCalledTimes(1);
		expect(confirm).not.toHaveBeenCalled();
	});

	it('Escape on the dialog fires onCancel', () => {
		const confirm = vi.fn();
		const cancel = vi.fn();
		mountModal(confirm, cancel);
		const dialog = target.querySelector<HTMLDivElement>('.vm-modal-delete-conflict');
		expect(dialog).toBeTruthy();
		const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
		dialog!.dispatchEvent(event);
		expect(cancel).toHaveBeenCalledTimes(1);
	});
});
