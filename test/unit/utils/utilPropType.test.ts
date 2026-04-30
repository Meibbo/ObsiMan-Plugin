import { describe, it, expect } from 'vitest';
import { PropertyTypeService } from '../../../src/utils/utilPropType';
import { mockApp } from 'obsidian';

describe('PropertyTypeService', () => {
	it('reads types.json from configDir on load and exposes getType', async () => {
		const adapterFiles = new Map<string, string>([
			['.obsidian/types.json', JSON.stringify({ types: { status: 'text', count: 'number' } })],
		]);
		const app = mockApp({ adapterFiles });
		const svc = new PropertyTypeService(app);
		await (svc as unknown as { loadTypes: () => Promise<void> }).loadTypes();
		expect(svc.getType('status')).toBe('text');
		expect(svc.getType('count')).toBe('number');
		expect(svc.getType('missing')).toBeNull();
	});

	it('returns sorted unique type list via getAllTypes', async () => {
		const adapterFiles = new Map<string, string>([
			['.obsidian/types.json', JSON.stringify({ types: { a: 'number', b: 'text', c: 'number' } })],
		]);
		const svc = new PropertyTypeService(mockApp({ adapterFiles }));
		await (svc as unknown as { loadTypes: () => Promise<void> }).loadTypes();
		expect(svc.getAllTypes()).toEqual(['number', 'text']);
	});

	it('writes a new type assignment back to types.json', async () => {
		const adapterFiles = new Map<string, string>([
			['.obsidian/types.json', JSON.stringify({ types: { existing: 'text' } })],
		]);
		const app = mockApp({ adapterFiles });
		const svc = new PropertyTypeService(app);
		await (svc as unknown as { loadTypes: () => Promise<void> }).loadTypes();

		await svc.setType('newProp', 'date');

		expect(svc.getType('newProp')).toBe('date');
		const written = JSON.parse(adapterFiles.get('.obsidian/types.json') ?? '{}') as {
			types: Record<string, string>;
		};
		expect(written.types.newProp).toBe('date');
	});

	it('survives a missing types.json silently', async () => {
		const svc = new PropertyTypeService(mockApp());
		await (svc as unknown as { loadTypes: () => Promise<void> }).loadTypes();
		expect(svc.getAllTypes()).toEqual([]);
	});
});
