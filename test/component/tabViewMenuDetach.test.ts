import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import TabViewMenuDetach from '../../src/components/layout/overlays/tabViewMenuDetach.svelte';
import { LeafDetachService } from '../../src/services/serviceLeafDetach';
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

function makeHost() {
	return {
		spawnLeaf: async (_t: string) => {},
		closeLeaf: async (_t: string) => {},
	};
}

async function setup(initial: Record<string, unknown> = {}) {
	const store = makeStore(initial);
	const host = makeHost();
	const svc = new LeafDetachService({ store, host });
	await svc.load();
	return svc;
}

describe('tabViewMenuDetach', () => {
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

	function mountIt(props: Record<string, unknown>) {
		app = mount(TabViewMenuDetach as unknown as Component<Record<string, unknown>>, {
			target,
			props,
		});
		flushSync();
	}

	it('renders "Detach to leaf" when the tab is currently in-panel', async () => {
		const leafDetach = await setup();
		mountIt({ tabId: 'explorer-files', leafDetach });
		const btn = target.querySelector<HTMLButtonElement>('.vm-viewmenu-detach');
		expect(btn).toBeTruthy();
		expect(btn!.textContent?.trim()).toBe('Detach to leaf');
		expect(btn!.getAttribute('data-detached')).toBe('false');
	});

	it('renders "Return to panel" when the tab is already detached', async () => {
		const leafDetach = await setup({ independentLeaves: { 'explorer-tags': true } });
		mountIt({ tabId: 'explorer-tags', leafDetach });
		const btn = target.querySelector<HTMLButtonElement>('.vm-viewmenu-detach');
		expect(btn!.textContent?.trim()).toBe('Return to panel');
		expect(btn!.getAttribute('data-detached')).toBe('true');
	});

	it('flips its label after the user clicks (detach -> attach -> detach)', async () => {
		const leafDetach = await setup();
		mountIt({ tabId: 'queue', leafDetach });
		const btn = target.querySelector<HTMLButtonElement>('.vm-viewmenu-detach')!;
		expect(btn.textContent?.trim()).toBe('Detach to leaf');

		btn.click();
		for (let i = 0; i < 20; i += 1) await Promise.resolve();
		flushSync();
		expect(leafDetach.isDetached('queue')).toBe(true);
		expect(btn.textContent?.trim()).toBe('Return to panel');

		btn.click();
		for (let i = 0; i < 20; i += 1) await Promise.resolve();
		flushSync();
		expect(leafDetach.isDetached('queue')).toBe(false);
		expect(btn.textContent?.trim()).toBe('Detach to leaf');
	});
});
