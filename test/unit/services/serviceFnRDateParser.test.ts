import { describe, expect, it } from 'vitest';
import { parseDateExpression } from '../../../src/services/serviceFnRDateParser';

const REF = new Date('2026-05-07T12:00:00Z');

describe('serviceFnRDateParser.parseDateExpression', () => {
	it('returns the reference for empty / now', () => {
		expect(parseDateExpression('', { now: REF })?.toISOString()).toBe(REF.toISOString());
		expect(parseDateExpression('now', { now: REF })?.toISOString()).toBe(REF.toISOString());
		expect(parseDateExpression('NOW', { now: REF })?.toISOString()).toBe(REF.toISOString());
	});

	it('returns start-of-day for today/yesterday/tomorrow', () => {
		const today = parseDateExpression('today', { now: REF })!;
		expect(today.getHours()).toBe(0);
		expect(today.getMinutes()).toBe(0);
		expect(today.getSeconds()).toBe(0);
		const tomorrow = parseDateExpression('tomorrow', { now: REF })!;
		expect(tomorrow.getTime() - today.getTime()).toBe(86_400_000);
		const yesterday = parseDateExpression('yesterday', { now: REF })!;
		expect(today.getTime() - yesterday.getTime()).toBe(86_400_000);
	});

	it('parses "in <count> <unit>" natural language', () => {
		const out = parseDateExpression('in two hours', { now: REF });
		expect(out?.getTime()).toBe(REF.getTime() + 2 * 3600 * 1000);
	});

	it('parses "<count> <unit> ago"', () => {
		const out = parseDateExpression('three days ago', { now: REF });
		expect(out?.getTime()).toBe(REF.getTime() - 3 * 86_400_000);
	});

	it('parses suffix math +1d / -2h', () => {
		expect(parseDateExpression('+1d', { now: REF })?.getTime()).toBe(REF.getTime() + 86_400_000);
		expect(parseDateExpression('-2h', { now: REF })?.getTime()).toBe(REF.getTime() - 2 * 3600 * 1000);
	});

	it('parses chained suffix math (+1d+2h)', () => {
		const out = parseDateExpression('+1d+2h', { now: REF });
		expect(out?.getTime()).toBe(REF.getTime() + 86_400_000 + 2 * 3600 * 1000);
	});

	it('parses calendar units +1mo / +1y', () => {
		const ref = new Date('2026-01-15T00:00:00');
		const mo = parseDateExpression('+1mo', { now: ref })!;
		expect(mo.getMonth()).toBe(1);
		const yr = parseDateExpression('+1y', { now: ref })!;
		expect(yr.getFullYear()).toBe(2027);
	});

	it('parses numeric "in 5 minutes"', () => {
		const out = parseDateExpression('in 5 minutes', { now: REF });
		expect(out?.getTime()).toBe(REF.getTime() + 5 * 60 * 1000);
	});

	it('returns null on malformed input', () => {
		expect(parseDateExpression('not-a-date', { now: REF })).toBeNull();
		expect(parseDateExpression('+1zz', { now: REF })).toBeNull();
		expect(parseDateExpression('in many hours', { now: REF })).toBeNull();
		expect(parseDateExpression('+1d garbage', { now: REF })).toBeNull();
	});

	it('returns null for nullish input', () => {
		expect(parseDateExpression(null, { now: REF })).toBeNull();
		expect(parseDateExpression(undefined, { now: REF })).toBeNull();
	});

	it('falls back to native Date for ISO strings', () => {
		const out = parseDateExpression('2026-05-07T08:00:00Z', { now: REF });
		expect(out?.toISOString()).toBe(new Date('2026-05-07T08:00:00Z').toISOString());
	});
});

describe('serviceFnRDateParser security', () => {
	it('source has no eval / new Function / dynamic require', async () => {
		const url = new URL('../../../src/services/serviceFnRDateParser.ts', import.meta.url);
		const fs = await import('node:fs/promises');
		const text = await fs.readFile(url, 'utf8');
		expect(text).not.toMatch(/\beval\s*\(/);
		expect(text).not.toMatch(/new\s+Function\s*\(/);
		expect(text).not.toMatch(/\bimport\s*\(/);
		expect(text).not.toMatch(/\brequire\s*\(/);
	});
});
