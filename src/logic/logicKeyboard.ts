export interface SelectionGestureInput {
	orderedIds: readonly string[];
	selectedIds: ReadonlySet<string>;
	anchorId?: string | null;
	targetId: string;
	additive?: boolean;
	range?: boolean;
}

export interface KeyboardMoveInput {
	orderedIds: readonly string[];
	selectedIds: ReadonlySet<string>;
	anchorId?: string | null;
	focusedId?: string | null;
	direction: -1 | 1;
	range?: boolean;
}

export interface SelectionGestureResult {
	ids: Set<string>;
	anchorId: string | null;
	focusedId: string | null;
}

export function applyPointerSelection(input: SelectionGestureInput): SelectionGestureResult {
	const anchorId = input.anchorId && input.orderedIds.includes(input.anchorId)
		? input.anchorId
		: input.targetId;

	if (input.range) {
		return {
			ids: idsInRange(input.orderedIds, anchorId, input.targetId),
			anchorId,
			focusedId: input.targetId,
		};
	}

	if (input.additive) {
		const ids = new Set(input.selectedIds);
		if (ids.has(input.targetId)) ids.delete(input.targetId);
		else ids.add(input.targetId);
		return {
			ids,
			anchorId: input.targetId,
			focusedId: input.targetId,
		};
	}

	return {
		ids: new Set([input.targetId]),
		anchorId: input.targetId,
		focusedId: input.targetId,
	};
}

export function applyKeyboardMove(input: KeyboardMoveInput): SelectionGestureResult {
	const currentIndex = input.focusedId ? input.orderedIds.indexOf(input.focusedId) : -1;
	const fallbackIndex = input.direction > 0 ? 0 : input.orderedIds.length - 1;
	const nextIndex = clamp(
		currentIndex === -1 ? fallbackIndex : currentIndex + input.direction,
		0,
		Math.max(input.orderedIds.length - 1, 0),
	);
	const focusedId = input.orderedIds[nextIndex] ?? null;
	if (!focusedId) return { ids: new Set(input.selectedIds), anchorId: input.anchorId ?? null, focusedId: null };

	const anchorId = input.anchorId && input.orderedIds.includes(input.anchorId)
		? input.anchorId
		: focusedId;
	if (input.range) {
		return {
			ids: idsInRange(input.orderedIds, anchorId, focusedId),
			anchorId,
			focusedId,
		};
	}

	return {
		ids: new Set([focusedId]),
		anchorId: focusedId,
		focusedId,
	};
}

function idsInRange(orderedIds: readonly string[], a: string, b: string): Set<string> {
	const aIndex = orderedIds.indexOf(a);
	const bIndex = orderedIds.indexOf(b);
	if (aIndex === -1 || bIndex === -1) return new Set([b]);
	const start = Math.min(aIndex, bIndex);
	const end = Math.max(aIndex, bIndex);
	return new Set(orderedIds.slice(start, end + 1));
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
