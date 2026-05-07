/**
 * Hand-rolled date expression parser for FnR templating.
 *
 * Spec: docs/work/hardening/specs/2026-05-07-multifacet-2/01-fnr-island-templating.md
 *
 * Supports the following inputs (case-insensitive, trimmed):
 *   - `now` / empty            → current instant
 *   - `today`                  → start of today (00:00:00 local)
 *   - `tomorrow`               → start of tomorrow
 *   - `yesterday`              → start of yesterday
 *   - `in two hours`           → relative natural language ("in <count> <unit>")
 *   - `<count> <unit> ago`     → past natural language
 *   - `+1d`, `-2h`, `+1mo`     → datejs-style suffix math (chainable: `+1d+2h`)
 *   - moment-style absolutes   → forwarded to `Date(string)` and validated
 *
 * Units: `s` second, `m`/`min` minute, `h` hour, `d` day, `w` week,
 * `mo` month, `y` year. The two-letter `mo` is intentional so it never
 * collides with `m` (minute).
 *
 * No `eval`, no `new Function`, no dynamic imports. The parser is plain
 * pattern matching plus calendar arithmetic.
 */

export interface DateParseOptions {
	/** Reference instant; defaults to a fresh `new Date()` per call. */
	now?: Date;
}

const UNIT_SECONDS: Record<string, number> = {
	s: 1,
	sec: 1,
	second: 1,
	seconds: 1,
	m: 60,
	min: 60,
	minute: 60,
	minutes: 60,
	h: 3600,
	hr: 3600,
	hour: 3600,
	hours: 3600,
	d: 86_400,
	day: 86_400,
	days: 86_400,
	w: 604_800,
	week: 604_800,
	weeks: 604_800,
};

const CALENDAR_UNITS = new Set(['mo', 'month', 'months', 'y', 'yr', 'year', 'years']);

const NUMBER_WORDS: Record<string, number> = {
	zero: 0,
	one: 1,
	two: 2,
	three: 3,
	four: 4,
	five: 5,
	six: 6,
	seven: 7,
	eight: 8,
	nine: 9,
	ten: 10,
	eleven: 11,
	twelve: 12,
};

/**
 * Parses a date expression. Returns a `Date` instance on success or
 * `null` for malformed input.
 */
export function parseDateExpression(
	expression: string | null | undefined,
	options: DateParseOptions = {},
): Date | null {
	if (expression == null) return null;
	const raw = expression.trim();
	const reference = options.now ? new Date(options.now.getTime()) : new Date();
	if (raw.length === 0 || raw.toLowerCase() === 'now') return reference;

	const lower = raw.toLowerCase();
	if (lower === 'today') return startOfDay(reference);
	if (lower === 'tomorrow') return addDays(startOfDay(reference), 1);
	if (lower === 'yesterday') return addDays(startOfDay(reference), -1);

	const natural = parseNaturalRelative(lower, reference);
	if (natural) return natural;

	const suffix = parseSuffixMath(lower, reference);
	if (suffix) return suffix;

	// Fallback to native Date parsing for moment-style absolute strings.
	const fallback = new Date(raw);
	if (Number.isNaN(fallback.getTime())) return null;
	return fallback;
}

function parseNaturalRelative(input: string, reference: Date): Date | null {
	// "in <count> <unit>" or "<count> <unit> ago"
	const inMatch = input.match(/^in\s+([a-z0-9]+)\s+([a-z]+)$/);
	if (inMatch) {
		const count = parseCount(inMatch[1]);
		if (count == null) return null;
		return applyDelta(reference, count, inMatch[2]);
	}
	const agoMatch = input.match(/^([a-z0-9]+)\s+([a-z]+)\s+ago$/);
	if (agoMatch) {
		const count = parseCount(agoMatch[1]);
		if (count == null) return null;
		return applyDelta(reference, -count, agoMatch[2]);
	}
	return null;
}

function parseSuffixMath(input: string, reference: Date): Date | null {
	// `+1d`, `-2h`, optionally chained: `+1d+2h-30m`. The whole string must
	// match end-to-end so we never accept partially malformed expressions.
	if (!/^[+-]/.test(input)) return null;
	const tokenRe = /([+-])(\d+)([a-z]+)/g;
	let cursor = 0;
	let date: Date = reference;
	let match: RegExpExecArray | null;
	while ((match = tokenRe.exec(input)) !== null) {
		if (match.index !== cursor) return null;
		const sign = match[1] === '-' ? -1 : 1;
		const count = Number(match[2]);
		if (!Number.isFinite(count)) return null;
		const unit = match[3];
		const next = applyDelta(date, sign * count, unit);
		if (!next) return null;
		date = next;
		cursor = tokenRe.lastIndex;
	}
	if (cursor !== input.length) return null;
	return date;
}

function parseCount(token: string): number | null {
	if (token in NUMBER_WORDS) return NUMBER_WORDS[token];
	const numeric = Number(token);
	return Number.isFinite(numeric) ? numeric : null;
}

function applyDelta(base: Date, count: number, unit: string): Date | null {
	const seconds = UNIT_SECONDS[unit];
	if (seconds != null) {
		return new Date(base.getTime() + count * seconds * 1000);
	}
	if (CALENDAR_UNITS.has(unit)) {
		const next = new Date(base.getTime());
		if (unit === 'mo' || unit === 'month' || unit === 'months') {
			next.setMonth(next.getMonth() + count);
		} else {
			next.setFullYear(next.getFullYear() + count);
		}
		return next;
	}
	return null;
}

function startOfDay(date: Date): Date {
	const next = new Date(date.getTime());
	next.setHours(0, 0, 0, 0);
	return next;
}

function addDays(date: Date, count: number): Date {
	return new Date(date.getTime() + count * 86_400_000);
}
