import { describe, it, expect, vi } from 'vitest';
import { IconicService } from '../../../src/services/serviceIcons';
import { mockApp } from '../../helpers/obsidian-mocks';

function buildSvc(data: Record<string, unknown>) {
	const adapterFiles = new Map<string, string>([
		['.obsidian/plugins/iconic/data.json', JSON.stringify(data)],
	]);
	const app = mockApp({ adapterFiles });
	const svc = new IconicService(app);
	return { svc, app };
}

describe('IconicService', () => {
	it('returns null for unknown property name', async () => {
		const { svc } = buildSvc({});
		await (svc as unknown as { loadIcons: () => Promise<void> }).loadIcons();
		expect(svc.getIcon('whatever')).toBeNull();
	});

	it('reads property + tag icons from .obsidian/plugins/iconic/data.json', async () => {
		const { svc } = buildSvc({
			propertyIcons: { status: { icon: 'lucide-flag', color: 'red' } },
			tagIcons: { '#idea': { icon: 'lucide-lightbulb' } },
		});
		await (svc as unknown as { loadIcons: () => Promise<void> }).loadIcons();
		expect(svc.getIcon('status')).toEqual({ icon: 'lucide-flag', color: 'red' });
		expect(svc.getTagIcon('idea')).toEqual({ icon: 'lucide-lightbulb', color: undefined });
	});

	it('isAvailable becomes true after a successful load', async () => {
		const { svc } = buildSvc({ propertyIcons: {} });
		await (svc as unknown as { loadIcons: () => Promise<void> }).loadIcons();
		expect(svc.isAvailable()).toBe(true);
	});

	it('isAvailable stays false when data.json is missing', async () => {
		const app = mockApp();
		const svc = new IconicService(app);
		await (svc as unknown as { loadIcons: () => Promise<void> }).loadIcons();
		expect(svc.isAvailable()).toBe(false);
	});

	it('onLoaded fires immediately if already loaded', async () => {
		const { svc } = buildSvc({});
		await (svc as unknown as { loadIcons: () => Promise<void> }).loadIcons();
		const cb = vi.fn();
		svc.onLoaded(cb);
		expect(cb).toHaveBeenCalledTimes(1);
	});
});
