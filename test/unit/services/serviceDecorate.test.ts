import { afterEach, describe, it, expect } from 'vitest';
import {
	clearActivePerfProbe,
	createPerfProbe,
	setActivePerfProbe,
} from '../../../src/dev/perfProbe';
import { mockApp } from '../../helpers/obsidian-mocks';
import { DecorationManager } from '../../../src/services/serviceDecorate';

describe('DecorationManager', () => {
	afterEach(() => {
		clearActivePerfProbe();
	});

	it('returns empty highlights when query is empty', () => {
		const dm = new DecorationManager(mockApp());
		const out = dm.decorate({ id: 'a', label: 'hello world' } as never);
		expect(out.highlights).toEqual([]);
	});

	it('highlights all occurrences of the query in the label', () => {
		const dm = new DecorationManager(mockApp());
		dm.setHighlightQuery('foo');
		const out = dm.decorate({ id: 'a', label: 'foo bar foo' } as never);
		expect(out.highlights).toEqual([
			{ start: 0, end: 3 },
			{ start: 8, end: 11 },
		]);
	});

	it('notifies subscribers when query changes', () => {
		const dm = new DecorationManager(mockApp());
		let count = 0;
		dm.subscribe(() => count++);
		dm.setHighlightQuery('x');
		expect(count).toBe(1);
	});

	it('falls back through tag/property/basename when label absent', () => {
		const dm = new DecorationManager(mockApp());
		dm.setHighlightQuery('pro');
		const out = dm.decorate({ id: 'x', property: 'project' } as never);
		expect(out.highlights.length).toBeGreaterThan(0);
		expect(out.highlights[0].start).toBe(0);
	});

	it('uses context query without mutating the global query', () => {
		const dm = new DecorationManager(mockApp());
		const out = dm.decorate({ id: 'a', label: 'Alpha beta' } as never, { highlightQuery: 'alpha' });
		expect(out.highlights).toEqual([{ start: 0, end: 5 }]);
		expect(dm.decorate({ id: 'b', label: 'Alpha' } as never).highlights).toEqual([]);
	});

	it('returns default icons for explorer node contexts', () => {
		const dm = new DecorationManager(mockApp());
		expect(
			dm.decorate({ id: 'p', label: 'status' } as never, { kind: 'prop', propType: 'text' })
				.icons[0],
		).toBe('lucide-text-align-start');
		expect(dm.decorate({ id: 't', label: '#project' } as never, { kind: 'tag' }).icons[0]).toBe(
			'lucide-tag',
		);
		expect(
			dm.decorate({ id: 'f', label: 'Notes' } as never, { kind: 'file', isFolder: true }).icons[0],
		).toBe('lucide-folder');
	});

	it('records active probe metrics for decoration calls', () => {
		const probe = createPerfProbe({ now: () => 0 });
		const dm = new DecorationManager(mockApp());

		setActivePerfProbe(probe.api);
		dm.decorate({ id: 'p', label: 'status' } as never, { kind: 'prop' });

		expect(probe.snapshot().timings['decoration.decorate']).toMatchObject({
			count: 1,
			totalNodes: 1,
		});
	});
});
