import { describe, it, expect, vi } from 'vitest';
import { FnRIslandService } from '../../../src/services/serviceFnRIsland.svelte';
import {
	prefillPropSetIsland,
	parsePropSetSubmission,
	buildPropSetChange,
} from '../../../src/services/serviceFnRPropSet';
import { mockTFile } from '../../helpers/obsidian-mocks';

describe('serviceFnRPropSet — prefillPropSetIsland', () => {
	it('switches the FnR island into add-prop mode and seeds "<prop>: " query', () => {
		const service = new FnRIslandService();
		prefillPropSetIsland(service, 'status');
		const snap = service.snapshot();
		expect(snap.mode).toBe('add-prop');
		expect(snap.query).toBe('status: ');
		expect(snap.expanded).toBe(true);
	});

	it('is a no-op when prop name is empty', () => {
		const service = new FnRIslandService();
		prefillPropSetIsland(service, '   ');
		expect(service.snapshot().mode).toBe('search');
		expect(service.snapshot().query).toBe('');
	});

	it('dispatches a frozen payload on submit that round-trips through parser', () => {
		const dispatch = vi.fn();
		const service = new FnRIslandService({ dispatch });
		prefillPropSetIsland(service, 'status');
		// User types the value after the prefilled prefix.
		service.setQuery('status: draft');
		service.submit();
		expect(dispatch).toHaveBeenCalledTimes(1);
		const payload = dispatch.mock.calls[0][0];
		expect(payload.mode).toBe('add-prop');
		const parsed = parsePropSetSubmission(payload);
		expect(parsed).toEqual({ key: 'status', value: 'draft' });
	});

	it('parser refuses payloads not in `key: value` shape', () => {
		const payload = {
			activeExplorerId: 'props',
			mode: 'add-prop' as const,
			query: 'no-colon',
			resolvedQuery: 'no-colon',
			flags: { matchCase: false, wholeWord: false, regex: false },
			expanded: false,
			errors: [],
			regexError: null,
		};
		expect(parsePropSetSubmission(payload)).toBeNull();
	});

	it('builds a `set_prop` PendingChange that overwrites the key on every file', () => {
		const a = mockTFile('a.md');
		const b = mockTFile('b.md');
		const change = buildPropSetChange([a, b], 'status', 'draft');
		expect(change).not.toBeNull();
		expect(change!.type).toBe('property');
		expect(change!.action).toBe('set');
		expect((change as { property: string }).property).toBe('status');
		// logicFunc returns the literal { key: value } overwrite, no skip.
		const updates = change!.logicFunc(a, { status: 'old' });
		expect(updates).toEqual({ status: 'draft' });
	});

	it('returns null when files or key is missing', () => {
		const a = mockTFile('a.md');
		expect(buildPropSetChange([], 'k', 'v')).toBeNull();
		expect(buildPropSetChange([a], '', 'v')).toBeNull();
	});
});
