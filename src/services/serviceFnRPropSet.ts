/**
 * serviceFnRPropSet — helpers for the `set` cmenu action on prop nodes.
 *
 * Spec: docs/work/hardening/specs/2026-05-07-multifacet-2/05-note-binding-and-set.md
 *
 * The flow:
 *   1. cmenu `set` on a prop node calls `prefillPropSetIsland(service, propName)`
 *      which switches the FnR island to mode `add-prop` and writes the
 *      `<propName>: ` literal as the query.
 *   2. On user submit the dispatcher receives the resolved query and
 *      forwards it to `parsePropSetSubmission` to extract the
 *      `{ key, value }` pair, then queues `set_prop` ops over the
 *      filtered files. Existing keys are overwritten per spec.
 */

import type { TFile } from 'obsidian';
import type {
	FnRIslandService,
	FnRIslandSubmitPayload,
} from './serviceFnRIsland.svelte';
import type { PendingChange } from '../types/typeOps';

/**
 * Switch the FnR island to `add-prop` and write the prop-set template.
 * The literal `<propName>: ` (note the trailing space) goes into the
 * query so the user's caret lands ready to type the value.
 */
export function prefillPropSetIsland(service: FnRIslandService, propName: string): void {
	const trimmed = propName.trim();
	if (trimmed.length === 0) return;
	service.setMode('add-prop');
	service.setQuery(`${trimmed}: `);
	service.expand();
}

/**
 * Parse a resolved `add-prop` submit payload into a `{ key, value }` pair.
 * Returns `null` when the payload does not match `key: value`.
 */
export function parsePropSetSubmission(
	payload: FnRIslandSubmitPayload,
): { key: string; value: string } | null {
	if (payload.mode !== 'add-prop') return null;
	const idx = payload.resolvedQuery.indexOf(':');
	if (idx <= 0) return null;
	const key = payload.resolvedQuery.slice(0, idx).trim();
	const value = payload.resolvedQuery.slice(idx + 1).trim();
	if (!key) return null;
	return { key, value };
}

/**
 * Build a `set_prop` PendingChange that overwrites `key` with `value` on
 * every filtered file. Conflict policy per spec: existing keys are
 * overwritten, missing keys are inserted at the top of frontmatter.
 */
export function buildPropSetChange(
	files: TFile[],
	key: string,
	value: string,
): PendingChange | null {
	if (files.length === 0 || !key) return null;
	return {
		type: 'property',
		property: key,
		action: 'set',
		details: `Set ${key}: ${value}`,
		files,
		value,
		customLogic: true,
		logicFunc: () => ({ [key]: value }),
	};
}
