import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import PageToolsOpsLog from '../../src/components/pages/pageToolsOpsLog.svelte';
import { OpsLogService } from '../../src/services/serviceOpsLog.svelte';
import { PerfMeter } from '../../src/services/perfMeter';

describe('pageToolsOpsLog', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;
	let opsLog: OpsLogService;

	beforeEach(() => {
		PerfMeter.__resetForTests();
		opsLog = new OpsLogService({ retention: 50 });
		opsLog.bind();
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		opsLog.dispose();
	});

	function mountPage() {
		app = mount(PageToolsOpsLog as unknown as Component<Record<string, unknown>>, {
			target,
			props: { opsLog },
		});
		flushSync();
	}

	it('renders one row per record', () => {
		PerfMeter.mark('alpha', 'queue');
		PerfMeter.mark('beta', 'service');
		mountPage();
		// header is also a `.vm-ops-log-row`, so look for non-header rows
		const rows = target.querySelectorAll(
			'.vm-ops-log-row:not(.vm-ops-log-header)',
		);
		expect(rows.length).toBe(2);
	});

	it('label filter narrows the list', async () => {
		PerfMeter.mark('alpha', 'queue');
		PerfMeter.mark('beta', 'queue');
		mountPage();
		const input = target.querySelector<HTMLInputElement>('.vm-ops-log-label-input');
		expect(input).toBeTruthy();
		input!.value = 'alpha';
		input!.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		const rows = target.querySelectorAll(
			'.vm-ops-log-row:not(.vm-ops-log-header)',
		);
		expect(rows.length).toBe(1);
		expect(rows[0].querySelector('.vm-ops-log-label')?.textContent).toContain('alpha');
	});

	it('kind filter narrows the list', () => {
		PerfMeter.mark('alpha', 'queue');
		PerfMeter.mark('beta', 'service');
		mountPage();
		const queueBtn = target.querySelector<HTMLButtonElement>(
			'.vm-ops-log-kind-btn[data-kind="queue"]',
		);
		expect(queueBtn).toBeTruthy();
		queueBtn!.click();
		flushSync();
		const rows = target.querySelectorAll(
			'.vm-ops-log-row:not(.vm-ops-log-header)',
		);
		expect(rows.length).toBe(1);
		expect(rows[0].getAttribute('data-kind')).toBe('queue');
	});

	it('clear-log button empties the buffer', () => {
		PerfMeter.mark('alpha', 'queue');
		PerfMeter.mark('beta', 'service');
		mountPage();
		const clearBtn = target.querySelector<HTMLButtonElement>('[data-action="clear"]');
		expect(clearBtn).toBeTruthy();
		clearBtn!.click();
		flushSync();
		expect(opsLog.getRecords()).toHaveLength(0);
		const rows = target.querySelectorAll(
			'.vm-ops-log-row:not(.vm-ops-log-header)',
		);
		expect(rows.length).toBe(0);
	});

	it('respects the retention cap so the row count never exceeds it', () => {
		const small = new OpsLogService({ retention: 3 });
		small.bind();
		for (let i = 0; i < 6; i += 1) PerfMeter.mark(`m${i}`, 'queue');
		app = mount(PageToolsOpsLog as unknown as Component<Record<string, unknown>>, {
			target,
			props: { opsLog: small },
		});
		flushSync();
		const rows = target.querySelectorAll(
			'.vm-ops-log-row:not(.vm-ops-log-header)',
		);
		expect(rows.length).toBe(3);
		small.dispose();
	});
});
