import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import SettingsLeafToggle from '../../src/components/settings/settingsLeafToggle.svelte';
import { LeafDetachService } from '../../src/services/serviceLeafDetach';
import { ALL_TAB_IDS } from '../../src/registry/tabRegistry';
import { PerfMeter } from '../../src/services/perfMeter';

function makeStore(initial: Record<string, unknown> = {}) {
	let data: Record<string, unknown> = { ...initial };
	return {
		loadData: async () => ({ ...data }),
		saveData: async (next: unknown) => {
			data = { ...(next as Record<string, unknown>) };
		},
	};
}

describe('settingsLeafToggle', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		PerfMeter.__resetForTests();
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

	async function setup(initial: Record<string, unknown> = {}) {
		const store = makeStore(initial);
		const spawn = vi.fn(async (_t: string) => {});
		const close = vi.fn(async (_t: string) => {});
		const svc = new LeafDetachService({
			store,
			host: { spawnLeaf: spawn, closeLeaf: close },
		});
		await svc.load();
		return { svc, spawn, close };
	}

	function mountIt(props: Record<string, unknown>) {
		app = mount(SettingsLeafToggle as unknown as Component<Record<string, unknown>>, {
			target,
			props,
		});
		flushSync();
	}

	it('starts unchecked when no tab is detached', async () => {
		const { svc } = await setup();
		mountIt({ leafDetach: svc });
		const input = target.querySelector<HTMLInputElement>('.vm-settings-leaf-toggle-input')!;
		expect(input.checked).toBe(false);
	});

	it('checking the toggle detaches every tab in DETACHABLE', async () => {
		const { svc, spawn } = await setup();
		mountIt({ leafDetach: svc });
		const input = target.querySelector<HTMLInputElement>('.vm-settings-leaf-toggle-input')!;

		input.click();
		// allow the async loop to drain
		for (let i = 0; i < 200; i += 1) await Promise.resolve();
		flushSync();

		const calls = spawn.mock.calls.map((c) => c[0]).sort();
		expect(calls).toEqual([...ALL_TAB_IDS].sort());
		for (const tab of ALL_TAB_IDS) expect(svc.isDetached(tab)).toBe(true);
		expect(input.checked).toBe(true);
	});

	it('unchecking after a fully-detached state re-attaches every tab', async () => {
		const seed: Record<string, boolean> = {};
		for (const t of ALL_TAB_IDS) seed[t] = true;
		const { svc, close } = await setup({ independentLeaves: seed });
		mountIt({ leafDetach: svc });

		const input = target.querySelector<HTMLInputElement>('.vm-settings-leaf-toggle-input')!;
		expect(input.checked).toBe(true);

		input.click();
		for (let i = 0; i < 200; i += 1) await Promise.resolve();
		flushSync();

		const calls = close.mock.calls.map((c) => c[0]).sort();
		expect(calls).toEqual([...ALL_TAB_IDS].sort());
		for (const tab of ALL_TAB_IDS) expect(svc.isDetached(tab)).toBe(false);
		expect(input.checked).toBe(false);
	});
});
