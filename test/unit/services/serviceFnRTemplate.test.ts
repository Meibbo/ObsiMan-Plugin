import { describe, expect, it } from 'vitest';
import {
	tokenize,
	validate,
	resolve,
	DEFAULT_ALLOWLIST,
	type FnRResolveContext,
	type ResolveLogger,
} from '../../../src/services/serviceFnRTemplate';

describe('serviceFnRTemplate.tokenize', () => {
	it('returns empty stream for empty input', () => {
		expect(tokenize('')).toEqual([]);
	});

	it('treats single-brace as literal text', () => {
		const stream = tokenize('hello {name}');
		expect(stream).toHaveLength(1);
		expect(stream[0]).toEqual({ kind: 'literal', value: 'hello {name}' });
	});

	it('extracts a bare double-brace token', () => {
		const stream = tokenize('{{base}}');
		expect(stream).toHaveLength(1);
		expect(stream[0]).toMatchObject({
			kind: 'token',
			name: 'base',
			arg: null,
			raw: '{{base}}',
			start: 0,
			end: 8,
		});
	});

	it('extracts a token with an argument', () => {
		const stream = tokenize('{{date:+1d}}');
		expect(stream[0]).toMatchObject({ kind: 'token', name: 'date', arg: '+1d' });
	});

	it('mixes literal and token segments', () => {
		const stream = tokenize('a {{base}} b {{counter:3}} c');
		expect(stream).toHaveLength(5);
		expect(stream.map((s) => s.kind)).toEqual([
			'literal',
			'token',
			'literal',
			'token',
			'literal',
		]);
	});

	it('lowercases token names', () => {
		const stream = tokenize('{{BASE}}');
		expect(stream[0]).toMatchObject({ kind: 'token', name: 'base' });
	});
});

describe('serviceFnRTemplate.validate', () => {
	it('returns no errors for an allowlisted token', () => {
		expect(validate(tokenize('{{base}}'))).toEqual([]);
	});

	it('rejects unknown tokens', () => {
		const errors = validate(tokenize('hello {{bogus}}'));
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(/Unknown token "bogus"/);
		expect(errors[0].token).toBe('{{bogus}}');
	});

	it('flags missing required argument', () => {
		const errors = validate(tokenize('{{exif}}'));
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(/requires an argument/);
	});

	it('accepts stub tokens with arg', () => {
		expect(validate(tokenize('{{exif:Make}}'))).toEqual([]);
	});

	it('reports multiple errors', () => {
		const errors = validate(tokenize('{{foo}} {{bar}}'));
		expect(errors).toHaveLength(2);
	});

	it('honors a custom allowlist', () => {
		const errors = validate(tokenize('{{base}}'), new Set<string>([]));
		expect(errors).toHaveLength(1);
	});
});

describe('serviceFnRTemplate.resolve', () => {
	it('passes literals through verbatim', () => {
		expect(resolve(tokenize('hello world'))).toBe('hello world');
	});

	it('resolves base/name/ext/parent/path from ctx.file', () => {
		const ctx: FnRResolveContext = {
			base: 'Note',
			file: { name: 'Note', ext: 'md', parent: 'Inbox', path: 'Inbox/Note.md' },
		};
		expect(resolve(tokenize('{{base}}-{{name}}.{{ext}}'), ctx)).toBe('Note-Note.md');
		expect(resolve(tokenize('{{parent}}/{{path}}'), ctx)).toBe('Inbox/Inbox/Note.md');
	});

	it('returns empty string for missing optional context', () => {
		expect(resolve(tokenize('{{base}}'))).toBe('');
		expect(resolve(tokenize('{{name}}'))).toBe('');
	});

	it('resolves filter snapshot from ctx.filter', () => {
		expect(resolve(tokenize('[{{filter}}]'), { filter: 'snap' })).toBe('[snap]');
	});

	it('resolves counter with default and pad', () => {
		expect(resolve(tokenize('{{counter}}'))).toBe('1');
		expect(resolve(tokenize('{{counter:3}}'), { counter: 7 })).toBe('007');
		expect(resolve(tokenize('{{counter:0}}'), { counter: 5 })).toBe('5');
	});

	it('resolves date with default `now`', () => {
		const now = new Date('2026-05-07T10:00:00Z');
		const out = resolve(tokenize('{{date}}'), { now });
		expect(out).toBe(now.toISOString());
	});

	it('resolves date with `+1d` suffix math', () => {
		const now = new Date('2026-05-07T00:00:00Z');
		const out = resolve(tokenize('{{date:+1d}}'), { now });
		const expected = new Date(now.getTime() + 86_400_000).toISOString();
		expect(out).toBe(expected);
	});

	it('resolves ctime/mtime with basic format fallback', () => {
		const ctime = new Date('2026-01-02T03:04:05Z');
		const ctx: FnRResolveContext = {
			file: { ctime },
			formatDate: undefined,
		};
		const out = resolve(tokenize('{{ctime:YYYY-MM-DD}}'), ctx);
		expect(out).toMatch(/^2026-\d{2}-\d{2}$/);
	});

	it('uses ctx.formatDate when supplied', () => {
		const ctx: FnRResolveContext = {
			file: { mtime: new Date('2026-05-07T00:00:00Z') },
			formatDate: (_d, fmt) => `[${fmt ?? 'iso'}]`,
		};
		expect(resolve(tokenize('{{mtime:LL}}'), ctx)).toBe('[LL]');
	});

	it('resolves size with unit conversions', () => {
		const big: FnRResolveContext = { file: { size: 2048 } };
		expect(resolve(tokenize('{{size}}'), big)).toBe('2048');
		expect(resolve(tokenize('{{size:kb}}'), big)).toBe('2.00');
		expect(resolve(tokenize('{{size:mb}}'), { file: { size: 1024 * 1024 } })).toBe('1.00');
	});

	it('returns empty for missing size', () => {
		expect(resolve(tokenize('{{size}}'))).toBe('');
	});

	it('emits empty + warns for stub tokens (exif/id3/doc/checksum)', () => {
		const warnings: string[] = [];
		const logger: ResolveLogger = { warn: (msg) => warnings.push(msg) };
		const stubs = ['{{exif:Make}}', '{{id3:title}}', '{{doc:author}}', '{{checksum:sha256}}'];
		for (const tpl of stubs) {
			const out = resolve(tokenize(tpl), { logger });
			expect(out).toBe('');
		}
		expect(warnings).toHaveLength(stubs.length);
	});

	it('emits unknown tokens verbatim during resolve (defensive)', () => {
		const stream = tokenize('{{bogus}}');
		expect(resolve(stream)).toBe('{{bogus}}');
	});

	it('default allowlist matches every documented token', () => {
		const expected = [
			'base', 'filter', 'date', 'counter', 'name', 'ext', 'parent',
			'path', 'ctime', 'mtime', 'exif', 'id3', 'doc', 'size', 'checksum',
		];
		for (const name of expected) {
			expect(DEFAULT_ALLOWLIST.has(name as never)).toBe(true);
		}
	});
});

describe('serviceFnRTemplate security', () => {
	it('source has no eval / new Function / dynamic require', async () => {
		const url = new URL('../../../src/services/serviceFnRTemplate.ts', import.meta.url);
		const fs = await import('node:fs/promises');
		const text = await fs.readFile(url, 'utf8');
		expect(text).not.toMatch(/\beval\s*\(/);
		expect(text).not.toMatch(/new\s+Function\s*\(/);
		expect(text).not.toMatch(/\bimport\s*\(/);
		expect(text).not.toMatch(/\brequire\s*\(/);
	});
});
