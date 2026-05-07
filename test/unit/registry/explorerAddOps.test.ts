import { describe, expect, it } from 'vitest';
import { getAddOpBuilder } from '../../../src/registry/explorerAddOps';
import type { TagChange, PropertyChange } from '../../../src/types/typeOps';

describe('getAddOpBuilder', () => {
	it('returns a non-null builder for "tag"', () => {
		const builder = getAddOpBuilder('tag');
		expect(builder).not.toBeNull();
	});

	it('returns a non-null builder for "prop"', () => {
		const builder = getAddOpBuilder('prop');
		expect(builder).not.toBeNull();
	});

	it('returns null for unsupported explorer kinds', () => {
		expect(getAddOpBuilder('file')).toBeNull();
		expect(getAddOpBuilder('value')).toBeNull();
		expect(getAddOpBuilder('content')).toBeNull();
		expect(getAddOpBuilder('whatever')).toBeNull();
	});

	it('builds an ADD_TAG-shaped PendingChange for tags', () => {
		const builder = getAddOpBuilder('tag');
		expect(builder).not.toBeNull();
		const change = builder!('newtag') as TagChange;
		expect(change).not.toBeNull();
		expect(change.type).toBe('tag');
		expect(change.action).toBe('add');
		expect(change.tag).toBe('newtag');
		expect(Array.isArray(change.files)).toBe(true);
		expect(typeof change.logicFunc).toBe('function');
		expect(change.logicFunc({} as never, { tags: [] })).toEqual({ tags: ['newtag'] });
	});

	it('strips a leading # from tag input', () => {
		const builder = getAddOpBuilder('tag');
		const change = builder!('#hashed') as TagChange;
		expect(change.tag).toBe('hashed');
	});

	it('returns null from the tag builder when label is empty', () => {
		const builder = getAddOpBuilder('tag');
		expect(builder!('')).toBeNull();
		expect(builder!('   ')).toBeNull();
	});

	it('builds an ADD_PROPERTY-shaped PendingChange for props', () => {
		const builder = getAddOpBuilder('prop');
		expect(builder).not.toBeNull();
		const change = builder!('newprop') as PropertyChange;
		expect(change).not.toBeNull();
		expect(change.type).toBe('property');
		expect(change.action).toBe('add');
		expect(change.property).toBe('newprop');
		expect(Array.isArray(change.files)).toBe(true);
		expect(change.customLogic).toBe(true);
		expect(typeof change.logicFunc).toBe('function');
		expect(change.logicFunc({} as never, {})).toEqual({ newprop: '' });
		// existing property → no-op (returns null)
		expect(change.logicFunc({} as never, { newprop: 'x' })).toBeNull();
	});

	it('returns null from the prop builder when label is empty', () => {
		const builder = getAddOpBuilder('prop');
		expect(builder!('')).toBeNull();
		expect(builder!('   ')).toBeNull();
	});
});
