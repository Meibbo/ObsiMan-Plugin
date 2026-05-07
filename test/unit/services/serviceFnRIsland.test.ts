import { describe, expect, it, vi } from 'vitest';
import { FnRIslandService } from '../../../src/services/serviceFnRIsland.svelte';

describe('FnRIslandService', () => {
	it('initializes with a sane default snapshot', () => {
		const service = new FnRIslandService();
		const snap = service.snapshot();
		expect(snap.activeExplorerId).toBe('');
		expect(snap.mode).toBe('search');
		expect(snap.query).toBe('');
		expect(snap.flags).toEqual({ matchCase: false, wholeWord: false, regex: false });
		expect(snap.expanded).toBe(false);
	});

	it('updates active explorer through setActiveExplorer', () => {
		const service = new FnRIslandService();
		service.setActiveExplorer('tags');
		expect(service.snapshot().activeExplorerId).toBe('tags');
	});

	it('switches mode through setMode', () => {
		const service = new FnRIslandService();
		service.setMode('rename');
		expect(service.snapshot().mode).toBe('rename');
		service.setMode('replace');
		expect(service.snapshot().mode).toBe('replace');
		service.setMode('add');
		expect(service.snapshot().mode).toBe('add');
		service.setMode('search');
		expect(service.snapshot().mode).toBe('search');
	});

	it('updates query text through setQuery', () => {
		const service = new FnRIslandService();
		service.setQuery('hello {{base}}');
		expect(service.snapshot().query).toBe('hello {{base}}');
	});

	it('toggles individual flags through setFlag', () => {
		const service = new FnRIslandService();
		service.setFlag('matchCase', true);
		service.setFlag('regex', true);
		expect(service.snapshot().flags).toEqual({ matchCase: true, wholeWord: false, regex: true });
		service.setFlag('matchCase', false);
		expect(service.snapshot().flags.matchCase).toBe(false);
	});

	it('expands and collapses through expand/collapse', () => {
		const service = new FnRIslandService();
		expect(service.snapshot().expanded).toBe(false);
		service.expand();
		expect(service.snapshot().expanded).toBe(true);
		service.collapse();
		expect(service.snapshot().expanded).toBe(false);
	});

	it('calls subscribers when state mutates', () => {
		const service = new FnRIslandService();
		const listener = vi.fn();
		const unsubscribe = service.subscribe(listener);
		service.setQuery('a');
		service.setMode('add');
		expect(listener).toHaveBeenCalled();
		unsubscribe();
		listener.mockClear();
		service.setQuery('b');
		expect(listener).not.toHaveBeenCalled();
	});

	it('dispatches submit through the provided dispatcher with a frozen payload', () => {
		const dispatch = vi.fn();
		const service = new FnRIslandService({ dispatch });
		service.setActiveExplorer('tags');
		service.setMode('add');
		service.setQuery('newtag');
		service.submit();
		expect(dispatch).toHaveBeenCalledTimes(1);
		const payload = dispatch.mock.calls[0][0];
		expect(payload.activeExplorerId).toBe('tags');
		expect(payload.mode).toBe('add');
		expect(payload.query).toBe('newtag');
		expect(payload.flags).toEqual({ matchCase: false, wholeWord: false, regex: false });
	});

	it('does not dispatch on submit when query is empty', () => {
		const dispatch = vi.fn();
		const service = new FnRIslandService({ dispatch });
		service.setActiveExplorer('tags');
		service.setMode('add');
		service.setQuery('   ');
		service.submit();
		expect(dispatch).not.toHaveBeenCalled();
	});

	it('clears the query after a successful add submit', () => {
		const dispatch = vi.fn();
		const service = new FnRIslandService({ dispatch });
		service.setActiveExplorer('tags');
		service.setMode('add');
		service.setQuery('newtag');
		service.submit();
		expect(service.snapshot().query).toBe('');
	});

	it('collapses the island after submit', () => {
		const dispatch = vi.fn();
		const service = new FnRIslandService({ dispatch });
		service.setActiveExplorer('tags');
		service.setMode('add');
		service.setQuery('newtag');
		service.expand();
		service.submit();
		expect(service.snapshot().expanded).toBe(false);
	});
});
