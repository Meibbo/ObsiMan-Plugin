/* global $state */
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type {
	INodeSelectionService,
	NodeSelectionSnapshot,
	SelectionBoxModifierState,
	SelectionModifierState,
	SelectionMoveDirection,
} from '../types/typeSelection';

class ExplorerSelectionState {
	readonly ids = new SvelteSet<string>();
	anchorId = $state<string | null>(null);
	focusedId = $state<string | null>(null);
	hoveredId = $state<string | null>(null);
}

export class NodeSelectionService implements INodeSelectionService {
	private readonly states = new SvelteMap<string, ExplorerSelectionState>();

	snapshot(explorerId: string): NodeSelectionSnapshot {
		const state = this.states.get(explorerId);
		return state ? snapshotOf(state) : emptySnapshot();
	}

	selectPointer(
		explorerId: string,
		orderedIds: readonly string[],
		targetId: string,
		modifiers: SelectionModifierState = {},
	): NodeSelectionSnapshot {
		const state = this.stateFor(explorerId);
		const additive = modifiers.additive === true;
		const range = modifiers.range === true;

		if (range) {
			const anchorId = additive
				? (knownId(orderedIds, state.focusedId) ??
					knownId(orderedIds, state.anchorId) ??
					targetId)
				: (knownId(orderedIds, state.anchorId) ?? targetId);
			const rangeIds = idsInRange(orderedIds, anchorId, targetId);
			replaceIds(state.ids, additive ? unionIds(state.ids, rangeIds) : rangeIds);
			if (!additive || !knownId(orderedIds, state.anchorId)) state.anchorId = anchorId;
			state.focusedId = targetId;
			return snapshotOf(state);
		}

		if (additive) {
			if (state.ids.has(targetId)) state.ids.delete(targetId);
			else state.ids.add(targetId);
		} else {
			replaceIds(state.ids, [targetId]);
		}

		state.anchorId = targetId;
		state.focusedId = targetId;
		return snapshotOf(state);
	}

	selectBox(
		explorerId: string,
		orderedIds: readonly string[],
		targetIds: readonly string[],
		modifiers: SelectionBoxModifierState = {},
	): NodeSelectionSnapshot {
		const state = this.stateFor(explorerId);
		const targetSet = new Set(targetIds);
		const orderedTargets = orderedIds.filter((id) => targetSet.has(id));
		const nextIds = modifiers.additive === true ? unionIds(state.ids, orderedTargets) : orderedTargets;
		const focusedId = orderedTargets.at(-1) ?? null;

		replaceIds(state.ids, nextIds);
		state.anchorId = focusedId;
		state.focusedId = focusedId;
		return snapshotOf(state);
	}

	moveFocus(
		explorerId: string,
		orderedIds: readonly string[],
		direction: SelectionMoveDirection,
		modifiers: SelectionModifierState = {},
	): NodeSelectionSnapshot {
		const state = this.stateFor(explorerId);
		const previousFocusId = knownId(orderedIds, state.focusedId);
		const focusedId = nextFocusedId(orderedIds, previousFocusId, direction);

		state.focusedId = focusedId;
		if (!focusedId) return snapshotOf(state);

		if (modifiers.range === true) {
			const anchorId = knownId(orderedIds, state.anchorId) ?? previousFocusId ?? focusedId;
			const rangeIds = idsInRange(orderedIds, anchorId, focusedId);
			replaceIds(
				state.ids,
				modifiers.additive === true ? unionIds(state.ids, rangeIds) : rangeIds,
			);
			state.anchorId = anchorId;
		}

		return snapshotOf(state);
	}

	toggleFocused(
		explorerId: string,
		orderedIds: readonly string[],
		modifiers: SelectionModifierState = {},
	): NodeSelectionSnapshot {
		const state = this.stateFor(explorerId);
		const focusedId = knownId(orderedIds, state.focusedId);
		if (!focusedId) return snapshotOf(state);

		if (modifiers.range === true) {
			const anchorId = knownId(orderedIds, state.anchorId) ?? focusedId;
			const rangeIds = idsInRange(orderedIds, anchorId, focusedId);
			replaceIds(
				state.ids,
				modifiers.additive === true ? unionIds(state.ids, rangeIds) : rangeIds,
			);
			state.anchorId = anchorId;
			return snapshotOf(state);
		}

		if (state.ids.has(focusedId)) state.ids.delete(focusedId);
		else state.ids.add(focusedId);
		state.anchorId = focusedId;
		return snapshotOf(state);
	}

	setFocused(explorerId: string, id: string | null): NodeSelectionSnapshot {
		const state = this.stateFor(explorerId);
		state.focusedId = id;
		return snapshotOf(state);
	}

	setHovered(explorerId: string, id: string | null): NodeSelectionSnapshot {
		const state = this.stateFor(explorerId);
		state.hoveredId = id;
		return snapshotOf(state);
	}

	clear(explorerId: string): NodeSelectionSnapshot {
		const state = this.stateFor(explorerId);
		state.ids.clear();
		state.anchorId = null;
		state.focusedId = null;
		state.hoveredId = null;
		return snapshotOf(state);
	}

	prune(explorerId: string, orderedIds: readonly string[]): NodeSelectionSnapshot {
		const state = this.stateFor(explorerId);
		const visibleIds = new Set(orderedIds);
		for (const id of state.ids) {
			if (!visibleIds.has(id)) state.ids.delete(id);
		}
		if (state.anchorId && !visibleIds.has(state.anchorId)) state.anchorId = null;
		if (state.focusedId && !visibleIds.has(state.focusedId)) state.focusedId = null;
		if (state.hoveredId && !visibleIds.has(state.hoveredId)) state.hoveredId = null;
		return snapshotOf(state);
	}

	private stateFor(explorerId: string): ExplorerSelectionState {
		let state = this.states.get(explorerId);
		if (!state) {
			state = new ExplorerSelectionState();
			this.states.set(explorerId, state);
		}
		return state;
	}
}

function snapshotOf(state: ExplorerSelectionState): NodeSelectionSnapshot {
	return {
		ids: new Set(state.ids),
		anchorId: state.anchorId,
		focusedId: state.focusedId,
		hoveredId: state.hoveredId,
		activeId: state.focusedId ?? state.hoveredId,
	};
}

function emptySnapshot(): NodeSelectionSnapshot {
	return {
		ids: new Set(),
		anchorId: null,
		focusedId: null,
		hoveredId: null,
		activeId: null,
	};
}

function replaceIds(target: SvelteSet<string>, ids: Iterable<string>): void {
	target.clear();
	for (const id of ids) target.add(id);
}

function idsInRange(orderedIds: readonly string[], fromId: string, toId: string): Set<string> {
	const fromIndex = orderedIds.indexOf(fromId);
	const toIndex = orderedIds.indexOf(toId);
	if (fromIndex === -1 || toIndex === -1) return new Set([toId]);
	const start = Math.min(fromIndex, toIndex);
	const end = Math.max(fromIndex, toIndex);
	return new Set(orderedIds.slice(start, end + 1));
}

function unionIds(left: Iterable<string>, right: Iterable<string>): Set<string> {
	const out = new Set(left);
	for (const id of right) out.add(id);
	return out;
}

function knownId(orderedIds: readonly string[], id: string | null): string | null {
	return id && orderedIds.includes(id) ? id : null;
}

function nextFocusedId(
	orderedIds: readonly string[],
	currentId: string | null,
	direction: SelectionMoveDirection,
): string | null {
	if (orderedIds.length === 0) return null;
	const currentIndex = currentId ? orderedIds.indexOf(currentId) : -1;
	const fallbackIndex = direction > 0 ? 0 : orderedIds.length - 1;
	const nextIndex = clamp(
		currentIndex === -1 ? fallbackIndex : currentIndex + direction,
		0,
		orderedIds.length - 1,
	);
	return orderedIds[nextIndex] ?? null;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
