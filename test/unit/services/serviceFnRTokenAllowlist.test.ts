import { describe, expect, it } from 'vitest';
import {
	tokenize,
	validate,
	resolve,
	DEFAULT_ALLOWLIST,
	type FnRResolveContext,
	type ResolveLogger,
	type TokenName,
} from '../../../src/services/serviceFnRTemplate';

const REF = new Date('2026-05-07T00:00:00Z');

const fullCtx: FnRResolveContext = {
	base: 'Base',
	filter: 'FILTERSNAP',
	now: REF,
	counter: 1,
	file: {
		name: 'Note',
		ext: 'md',
		parent: 'Inbox',
		path: 'Inbox/Note.md',
		ctime: REF,
		mtime: REF,
		size: 2048,
	},
};

const STUBS = new Set<TokenName>(['exif', 'id3', 'doc', 'checksum']);

const TOKEN_SAMPLES: Record<TokenName, string> = {
	base: '{{base}}',
	filter: '{{filter}}',
	date: '{{date}}',
	counter: '{{counter}}',
	name: '{{name}}',
	ext: '{{ext}}',
	parent: '{{parent}}',
	path: '{{path}}',
	ctime: '{{ctime}}',
	mtime: '{{mtime}}',
	size: '{{size}}',
	exif: '{{exif:Make}}',
	id3: '{{id3:title}}',
	doc: '{{doc:author}}',
	checksum: '{{checksum:sha256}}',
};

describe('serviceFnR token allowlist coverage', () => {
	it('every spec token is in the default allowlist', () => {
		for (const name of Object.keys(TOKEN_SAMPLES)) {
			expect(DEFAULT_ALLOWLIST.has(name as TokenName)).toBe(true);
		}
	});

	it('every allowlisted token validates clean with a non-empty arg', () => {
		for (const [name, tpl] of Object.entries(TOKEN_SAMPLES)) {
			const errors = validate(tokenize(tpl));
			expect(errors, `validate ${name}: ${tpl}`).toEqual([]);
		}
	});

	it('non-stub tokens resolve to a non-empty string with full ctx', () => {
		const logger: ResolveLogger = { warn: () => {} };
		for (const [name, tpl] of Object.entries(TOKEN_SAMPLES)) {
			if (STUBS.has(name as TokenName)) continue;
			const out = resolve(tokenize(tpl), { ...fullCtx, logger });
			expect(out, `resolve ${name}: ${tpl}`).not.toBe('');
		}
	});

	it('stub tokens resolve to empty string and emit a logger.warn', () => {
		for (const name of STUBS) {
			const warnings: string[] = [];
			const logger: ResolveLogger = { warn: (msg) => warnings.push(msg) };
			const out = resolve(tokenize(TOKEN_SAMPLES[name]), { ...fullCtx, logger });
			expect(out, `stub ${name} resolve`).toBe('');
			expect(warnings.length, `stub ${name} warn`).toBe(1);
		}
	});

	it('rejects an unknown token name', () => {
		const errors = validate(tokenize('{{definitely_not_a_token}}'));
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(/Unknown token/);
	});

	it('stub tokens without an argument fail validation', () => {
		for (const name of STUBS) {
			const errors = validate(tokenize(`{{${name}}}`));
			expect(errors.length, `${name} bare`).toBeGreaterThan(0);
		}
	});
});
