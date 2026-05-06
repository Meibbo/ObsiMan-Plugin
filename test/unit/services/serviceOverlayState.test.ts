import { describe, it, expect } from 'vitest';
import { OverlayStateService } from '../../../src/services/serviceOverlayState.svelte';

describe('OverlayStateService', () => {
	it('push adds entry to stack', () => {
		const o = new OverlayStateService();
		o.push({ id: 'a', component: {} as never });
		expect(o.stack.length).toBe(1);
		expect(o.isOpen('a')).toBe(true);
	});

	it('pop removes the top entry', () => {
		const o = new OverlayStateService();
		o.push({ id: 'a', component: {} as never });
		o.push({ id: 'b', component: {} as never });
		o.pop();
		expect(o.stack.length).toBe(1);
		expect(o.isOpen('b')).toBe(false);
	});

	it('popById removes a specific entry', () => {
		const o = new OverlayStateService();
		o.push({ id: 'a', component: {} as never });
		o.push({ id: 'b', component: {} as never });
		o.popById('a');
		expect(o.stack.map((e) => e.id)).toEqual(['b']);
	});

	it('clear empties the stack', () => {
		const o = new OverlayStateService();
		o.push({ id: 'a', component: {} as never });
		o.push({ id: 'b', component: {} as never });
		o.clear();
		expect(o.stack.length).toBe(0);
	});

	it('isOpen returns false for unknown id', () => {
		const o = new OverlayStateService();
		expect(o.isOpen('x')).toBe(false);
	});

	it('pop on empty stack is a no-op', () => {
		const o = new OverlayStateService();
		const before = o.stack;
		o.pop();
		expect(o.stack).toBe(before);
		expect(o.stack.length).toBe(0);
	});

	it('popById on missing id is a no-op (preserves array identity)', () => {
		const o = new OverlayStateService();
		o.push({ id: 'a', component: {} as never });
		const before = o.stack;
		o.popById('missing');
		expect(o.stack).toBe(before);
		expect(o.stack.map((e) => e.id)).toEqual(['a']);
	});

	it('clear on empty stack is a no-op (preserves array identity)', () => {
		const o = new OverlayStateService();
		const before = o.stack;
		o.clear();
		expect(o.stack).toBe(before);
		expect(o.stack.length).toBe(0);
	});

	it('popById("queue") removes queue when present', () => {
		const o = new OverlayStateService();
		o.push({ id: 'queue', component: {} as never });
		o.push({ id: 'active-filters', component: {} as never });
		o.popById('queue');
		expect(o.isOpen('queue')).toBe(false);
		expect(o.stack.map((e) => e.id)).toEqual(['active-filters']);
	});
});
