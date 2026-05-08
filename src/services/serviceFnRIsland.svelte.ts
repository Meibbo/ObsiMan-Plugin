/* global $state */

/**
 * FnRIslandService — rune-state model for the unified Find & Replace
 * toolbar island. Spec:
 * docs/work/hardening/specs/2026-05-07-multifacet-2/01-fnr-island-templating.md
 *
 * Phase 2 adds:
 *   - Template tokenize+validate cache so the UI can disable submit and
 *     show inline errors while the user types.
 *   - `regex`/`wholeWord` mutual exclusion enforced inside `setFlag`.
 *   - `submit()` resolves tokens once with a context snapshot and
 *     splices the resolved string back into the dispatched payload.
 */

import { tokenize, validate, resolve, type TokenError } from './serviceFnRTemplate';
import type { FnRResolveContext } from './serviceFnRTemplate';
import { PerfMeter } from './perfMeter';

export type FnRIslandMode = 'search' | 'rename' | 'replace' | 'add' | 'add-prop';

export interface FnRIslandFlags {
	matchCase: boolean;
	wholeWord: boolean;
	regex: boolean;
}

export interface FnRIslandSnapshot {
	activeExplorerId: string;
	mode: FnRIslandMode;
	query: string;
	resolvedQuery: string;
	flags: FnRIslandFlags;
	expanded: boolean;
	errors: TokenError[];
	regexError: string | null;
}

export type FnRIslandSubmitPayload = FnRIslandSnapshot;

export type FnRIslandDispatch = (payload: FnRIslandSubmitPayload) => void;

/** Caller-supplied context provider invoked once per submit. */
export type FnRIslandContextProvider = () => FnRResolveContext;

export interface FnRIslandServiceOptions {
	dispatch?: FnRIslandDispatch;
	resolveContext?: FnRIslandContextProvider;
	/**
	 * Initial flag values applied at construction time. Used by the
	 * Settings UI (`fnrRegexDefault`) to seed the `regex` flag. Mutual
	 * exclusion still applies: enabling `regex` clears `wholeWord`.
	 */
	initialFlags?: Partial<FnRIslandFlags>;
}

class FnRIslandState {
	activeExplorerId = $state<string>('');
	mode = $state<FnRIslandMode>('search');
	query = $state<string>('');
	matchCase = $state<boolean>(false);
	wholeWord = $state<boolean>(false);
	regex = $state<boolean>(false);
	expanded = $state<boolean>(false);
}

export class FnRIslandService {
	private readonly state = new FnRIslandState();
	private readonly listeners = new Set<() => void>();
	private readonly dispatch: FnRIslandDispatch | null;
	private readonly resolveContext: FnRIslandContextProvider | null;

	constructor(options: FnRIslandServiceOptions = {}) {
		this.dispatch = options.dispatch ?? null;
		this.resolveContext = options.resolveContext ?? null;
		const init = options.initialFlags;
		if (init) {
			if (init.matchCase === true) this.state.matchCase = true;
			if (init.wholeWord === true) this.state.wholeWord = true;
			if (init.regex === true) {
				this.state.regex = true;
				// Mutual exclusion mirrors `setFlag`.
				this.state.wholeWord = false;
			}
		}
	}

	snapshot(): FnRIslandSnapshot {
		const errors = this.computeTokenErrors();
		const regexError = this.computeRegexError();
		return {
			activeExplorerId: this.state.activeExplorerId,
			mode: this.state.mode,
			query: this.state.query,
			resolvedQuery: this.state.query,
			flags: {
				matchCase: this.state.matchCase,
				wholeWord: this.state.wholeWord,
				regex: this.state.regex,
			},
			expanded: this.state.expanded,
			errors,
			regexError,
		};
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	setActiveExplorer(id: string): void {
		if (this.state.activeExplorerId === id) return;
		this.state.activeExplorerId = id;
		this.notify();
	}

	setMode(mode: FnRIslandMode): void {
		if (this.state.mode === mode) return;
		this.state.mode = mode;
		this.notify();
	}

	setQuery(query: string): void {
		if (this.state.query === query) return;
		this.state.query = query;
		this.notify();
	}

	setFlag(flag: keyof FnRIslandFlags, value: boolean): void {
		if (this.state[flag] === value) return;
		this.state[flag] = value;
		// Mutual exclusion: enabling regex forces wholeWord off so the
		// matcher never sees both flags simultaneously.
		if (flag === 'regex' && value && this.state.wholeWord) {
			this.state.wholeWord = false;
		}
		if (flag === 'wholeWord' && value && this.state.regex) {
			this.state.regex = false;
		}
		this.notify();
	}

	expand(): void {
		if (this.state.expanded) return;
		this.state.expanded = true;
		this.notify();
	}

	collapse(): void {
		if (!this.state.expanded) return;
		this.state.expanded = false;
		this.notify();
	}

	/** Validation hook the UI uses to disable the submit affordance. */
	hasBlockingErrors(): boolean {
		const snap = this.snapshot();
		return snap.errors.length > 0 || snap.regexError !== null;
	}

	submit(): void {
		const trimmed = this.state.query.trim();
		if (trimmed.length === 0) return;
		if (this.hasBlockingErrors()) return;

		PerfMeter.time('fnr:submit', () => {
			const ctx = this.resolveContext ? this.resolveContext() : {};
			const stream = tokenize(this.state.query);
			const resolved = resolve(stream, ctx);

			const base = this.snapshot();
			const payload: FnRIslandSubmitPayload = {
				...base,
				resolvedQuery: resolved,
			};
			this.dispatch?.(payload);
		});

		// Phase 2 keeps phase 1 dispatch ergonomics: only `add` / `add-prop`
		// clear the query; rename/replace keep the query so iteration
		// loops re-resolve per node downstream.
		if (this.state.mode === 'add' || this.state.mode === 'add-prop') {
			this.state.query = '';
		}
		if (this.state.expanded) this.state.expanded = false;
		this.notify();
	}

	private computeTokenErrors(): TokenError[] {
		if (this.state.query.length === 0) return [];
		const stream = tokenize(this.state.query);
		return validate(stream);
	}

	private computeRegexError(): string | null {
		if (!this.state.regex) return null;
		const trimmed = this.state.query.trim();
		if (trimmed.length === 0) return null;
		try {
			// `new RegExp` is a constructor call, not arbitrary code
			// execution. Patterns coming from this surface are scoped
			// to literal regex evaluation downstream.
			new RegExp(trimmed, this.state.matchCase ? '' : 'i');
			return null;
		} catch (error) {
			return error instanceof Error ? error.message : 'Invalid regex';
		}
	}

	private notify(): void {
		for (const listener of this.listeners) listener();
	}
}
