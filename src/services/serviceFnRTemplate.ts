/**
 * FnR templating engine. Pure functions only — no `eval`, no `Function`,
 * no dynamic `import`/`require`. Spec:
 * docs/work/hardening/specs/2026-05-07-multifacet-2/01-fnr-island-templating.md
 *
 * Surface:
 *   - `tokenize(query)`: lex `{{name[:arg]}}` placeholders out of a query
 *     into a `TokenStream` of literal/token segments. Single-brace
 *     `{name}` is left untouched as literal text.
 *   - `validate(stream, allowlist?)`: returns `TokenError[]`. Empty array
 *     means the stream is safe to resolve and submit.
 *   - `resolve(stream, ctx)`: collapses the stream back into a string
 *     using the resolution context. Stub tokens that need bundled
 *     parsers (EXIF/ID3/doc/checksum) return an empty string and emit a
 *     warning through the supplied logger so future ops-log surfaces
 *     pick them up without mutating render output.
 */

import { parseDateExpression } from './serviceFnRDateParser';

export type TokenName =
	| 'base'
	| 'filter'
	| 'date'
	| 'counter'
	| 'name'
	| 'ext'
	| 'parent'
	| 'path'
	| 'ctime'
	| 'mtime'
	| 'exif'
	| 'id3'
	| 'doc'
	| 'size'
	| 'checksum';

export interface LiteralSegment {
	kind: 'literal';
	value: string;
}

export interface TokenSegment {
	kind: 'token';
	name: string;
	arg: string | null;
	/** Original `{{...}}` text, preserved for diagnostics. */
	raw: string;
	/** Zero-based offset in the original query. */
	start: number;
	end: number;
}

export type TokenSegmentOrLiteral = LiteralSegment | TokenSegment;
export type TokenStream = TokenSegmentOrLiteral[];

export interface TokenError {
	token: string;
	message: string;
	start: number;
	end: number;
}

export const DEFAULT_ALLOWLIST: ReadonlySet<TokenName> = new Set<TokenName>([
	'base',
	'filter',
	'date',
	'counter',
	'name',
	'ext',
	'parent',
	'path',
	'ctime',
	'mtime',
	'exif',
	'id3',
	'doc',
	'size',
	'checksum',
]);

/** Tokens that require external parsers we do not yet bundle. */
const STUB_TOKENS: ReadonlySet<TokenName> = new Set<TokenName>([
	'exif',
	'id3',
	'doc',
	'checksum',
]);

/** Tokens that require an `arg` payload after the colon. */
const REQUIRES_ARG: ReadonlySet<TokenName> = new Set<TokenName>([
	'exif',
	'id3',
	'doc',
	'checksum',
]);

export interface ResolveLogger {
	warn(message: string, meta?: Record<string, unknown>): void;
}

const DEFAULT_LOGGER: ResolveLogger = {
	warn(message, meta) {
		// Routed to console until the dedicated ops-log channel ships
		// (see specs/2026-05-07-multifacet-2/02-hover-badges-and-ops-log.md).
		console.warn(`[FnRTemplate] ${message}`, meta ?? {});
	},
};

export interface FnRFileMeta {
	name?: string;
	ext?: string;
	parent?: string;
	path?: string;
	ctime?: Date | number | null;
	mtime?: Date | number | null;
	size?: number | null;
}

export interface FnRResolveContext {
	/** Selected node label for rename/replace, or about-to-create label for add. */
	base?: string | null;
	/** Snapshot of the active filter set (already serialised by the caller). */
	filter?: string;
	/** Resolution moment used by `{{date}}` and friends; defaults to `new Date()`. */
	now?: Date;
	/** Active node metadata for `{{name}}`, `{{ext}}`, etc. */
	file?: FnRFileMeta;
	/** Counter starting at 1 by default; resolver injects pad widths per token. */
	counter?: number;
	/** Per-token logger override. */
	logger?: ResolveLogger;
	/** Optional Moment-compatible formatter. Falls back to ISO if absent. */
	formatDate?: (date: Date, format: string | null) => string;
}

const TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*(?::([^}]*))?\}\}/g;

/**
 * Splits the query into literal and token segments. Single-brace `{x}`
 * is left as part of the literal output (no legacy fallback).
 */
export function tokenize(query: string): TokenStream {
	const stream: TokenStream = [];
	if (!query) return stream;
	let cursor = 0;
	TOKEN_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = TOKEN_RE.exec(query)) !== null) {
		const start = match.index;
		const end = start + match[0].length;
		if (start > cursor) {
			stream.push({ kind: 'literal', value: query.slice(cursor, start) });
		}
		const argRaw = match[2];
		stream.push({
			kind: 'token',
			name: match[1].toLowerCase(),
			arg: argRaw == null ? null : argRaw.trim(),
			raw: match[0],
			start,
			end,
		});
		cursor = end;
	}
	if (cursor < query.length) {
		stream.push({ kind: 'literal', value: query.slice(cursor) });
	}
	return stream;
}

/**
 * Returns one error per offending token. Unknown names and missing
 * required args both surface so the UI can disable submit.
 */
export function validate(
	stream: TokenStream,
	allowlist: ReadonlySet<string> = DEFAULT_ALLOWLIST,
): TokenError[] {
	const errors: TokenError[] = [];
	for (const segment of stream) {
		if (segment.kind !== 'token') continue;
		if (!allowlist.has(segment.name)) {
			errors.push({
				token: segment.raw,
				message: `Unknown token "${segment.name}"`,
				start: segment.start,
				end: segment.end,
			});
			continue;
		}
		if (REQUIRES_ARG.has(segment.name as TokenName) && (segment.arg == null || segment.arg.length === 0)) {
			errors.push({
				token: segment.raw,
				message: `Token "${segment.name}" requires an argument`,
				start: segment.start,
				end: segment.end,
			});
		}
	}
	return errors;
}

/**
 * Collapses the stream into a plain string. Caller must call
 * `validate` first; resolve still treats unknown tokens defensively by
 * emitting them verbatim so partial renders never silently corrupt
 * downstream ops.
 */
export function resolve(stream: TokenStream, ctx: FnRResolveContext = {}): string {
	const logger = ctx.logger ?? DEFAULT_LOGGER;
	const out: string[] = [];
	for (const segment of stream) {
		if (segment.kind === 'literal') {
			out.push(segment.value);
			continue;
		}
		out.push(resolveToken(segment, ctx, logger));
	}
	return out.join('');
}

function resolveToken(
	token: TokenSegment,
	ctx: FnRResolveContext,
	logger: ResolveLogger,
): string {
	const name = token.name as TokenName;
	if (STUB_TOKENS.has(name)) {
		// TODO: wire EXIF (exifr), ID3 (jsmediatags), doc (pdf-parse), and
		// checksum (Web Crypto) parsers once we are ready to take the
		// bundle hit. Until then we emit empty string and warn.
		logger.warn('not supported in this build', {
			token: token.raw,
			name: token.name,
			arg: token.arg,
		});
		return '';
	}
	switch (name) {
		case 'base':
			return ctx.base ?? '';
		case 'filter':
			return ctx.filter ?? '';
		case 'name':
			return ctx.file?.name ?? '';
		case 'ext':
			return ctx.file?.ext ?? '';
		case 'parent':
			return ctx.file?.parent ?? '';
		case 'path':
			return ctx.file?.path ?? '';
		case 'date':
			return resolveDate(token.arg, ctx);
		case 'counter':
			return resolveCounter(token.arg, ctx);
		case 'ctime':
			return resolveTimestamp(ctx.file?.ctime, token.arg, ctx);
		case 'mtime':
			return resolveTimestamp(ctx.file?.mtime, token.arg, ctx);
		case 'size':
			return resolveSize(ctx.file?.size, token.arg);
		default:
			return token.raw;
	}
}

function resolveDate(arg: string | null, ctx: FnRResolveContext): string {
	const reference = ctx.now ? new Date(ctx.now.getTime()) : new Date();
	const expr = arg && arg.length > 0 ? arg : 'now';
	const parsed = parseDateExpression(expr, { now: reference });
	if (!parsed) return '';
	return formatDate(parsed, null, ctx);
}

function resolveTimestamp(
	value: Date | number | null | undefined,
	arg: string | null,
	ctx: FnRResolveContext,
): string {
	if (value == null) return '';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return formatDate(date, arg, ctx);
}

function formatDate(date: Date, format: string | null, ctx: FnRResolveContext): string {
	if (ctx.formatDate) return ctx.formatDate(date, format);
	if (!format) return date.toISOString();
	// Minimal fallback so basic moment tokens still produce something
	// deterministic in unit tests. Real Moment formatting hooks in
	// through `ctx.formatDate` when Obsidian is available.
	return basicFormat(date, format);
}

function basicFormat(date: Date, format: string): string {
	const pad = (n: number, w = 2) => String(n).padStart(w, '0');
	return format
		.replace(/YYYY/g, String(date.getFullYear()))
		.replace(/MM/g, pad(date.getMonth() + 1))
		.replace(/DD/g, pad(date.getDate()))
		.replace(/HH/g, pad(date.getHours()))
		.replace(/mm/g, pad(date.getMinutes()))
		.replace(/ss/g, pad(date.getSeconds()));
}

function resolveCounter(arg: string | null, ctx: FnRResolveContext): string {
	const value = ctx.counter ?? 1;
	if (!arg) return String(value);
	const width = Number(arg);
	if (!Number.isFinite(width) || width <= 0) return String(value);
	return String(value).padStart(width, '0');
}

function resolveSize(size: number | null | undefined, unit: string | null): string {
	if (size == null || !Number.isFinite(size)) return '';
	const u = (unit ?? 'b').toLowerCase();
	const divisors: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
	const div = divisors[u];
	if (!div) return String(size);
	const value = size / div;
	if (u === 'b') return String(Math.round(value));
	return value.toFixed(2);
}

