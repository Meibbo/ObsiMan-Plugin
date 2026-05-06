<script lang="ts">
	import type { TFile } from 'obsidian';
	import { translate } from '../../index/i18n/lang';
	import {
		applyBoxSelection,
		applyKeyboardMove,
		applyPointerSelection,
	} from '../../logic/logicKeyboard';
	import { Virtualizer } from '../../services/serviceVirtualizer.svelte';

	type SortColumn = 'name' | 'props' | 'path' | 'date';
	type SortDirection = 'asc' | 'desc';

	interface Props {
		files: TFile[];
		totalCount: number;
		selectedFiles: Set<string>;
		onSelectionChange: (selected: Set<string>) => void;
		onFileClick: (file: TFile) => void;
		onContextMenu: (file: TFile, e: MouseEvent) => void;
		sortColumn: SortColumn;
		sortDirection: SortDirection;
		onSortChange: (col: SortColumn, dir: SortDirection) => void;
		app: import('obsidian').App;
	}

	let {
		files,
		totalCount,
		selectedFiles = $bindable(new Set()),
		onSelectionChange,
		onFileClick,
		onContextMenu,
		sortColumn,
		sortDirection,
		onSortChange,
		app,
	}: Props = $props();

	const v = new Virtualizer<TFile>();
	let outerEl: HTMLDivElement | undefined = $state();
	let selectionAnchorPath = $state<string | null>(null);
	let focusedPath = $state<string | null>(null);
	let dragStart = $state<{ x: number; y: number; pointerId: number } | null>(null);
	let selectionBox = $state<{
		left: number;
		top: number;
		width: number;
		height: number;
	} | null>(null);
	let suppressNextClick = false;

	const totalH = $derived(files.length * v.rowHeight);
	const orderedPaths = $derived(files.map((file) => file.path));

	$effect(() => {
		v.items = files;
	});

	$effect(() => {
		if (!outerEl) return;
		const cs = getComputedStyle(outerEl);
		const rh = parseFloat(cs.getPropertyValue('--vm-file-row-h'));
		if (rh > 0) v.rowHeight = rh;
		v.viewportHeight = outerEl.clientHeight;
		const ro = new ResizeObserver(() => {
			if (outerEl) v.viewportHeight = outerEl.clientHeight;
		});
		ro.observe(outerEl);
		return () => ro.disconnect();
	});

	function onScroll(e: Event) {
		v.scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
	}

	let allSelected = $derived(files.length > 0 && files.every((f) => selectedFiles.has(f.path)));
	let someSelected = $derived(files.some((f) => selectedFiles.has(f.path)) && !allSelected);

	function toggleAll() {
		const next = new Set(selectedFiles);
		if (allSelected) {
			files.forEach((f) => next.delete(f.path));
		} else {
			files.forEach((f) => next.add(f.path));
		}
		commitSelectedPaths(next, null, null);
	}

	function toggleFile(path: string) {
		const next = new Set(selectedFiles);
		if (next.has(path)) {
			next.delete(path);
		} else {
			next.add(path);
		}
		commitSelectedPaths(next, path, path);
	}

	function selectFilePath(path: string, opts: { additive?: boolean; range?: boolean }) {
		const next = applyPointerSelection({
			orderedIds: orderedPaths,
			selectedIds: selectedFiles,
			anchorId: selectionAnchorPath,
			focusedId: focusedPath,
			targetId: path,
			additive: opts.additive,
			range: opts.range,
		});
		commitSelectedPaths(next.ids, next.anchorId, next.focusedId);
	}

	function selectBoxPaths(paths: string[], e: PointerEvent) {
		const next = applyBoxSelection({
			orderedIds: orderedPaths,
			selectedIds: selectedFiles,
			targetIds: paths,
			additive: e.ctrlKey || e.metaKey,
		});
		commitSelectedPaths(next.ids, next.anchorId, next.focusedId);
	}

	function commitSelectedPaths(ids: Set<string>, anchorPath: string | null, nextFocusedPath: string | null) {
		selectedFiles = new Set(ids);
		selectionAnchorPath = anchorPath;
		focusedPath = nextFocusedPath;
		onSelectionChange(selectedFiles);
	}

	function handleRowClick(file: TFile, e: MouseEvent) {
		if (suppressNextClick) {
			suppressNextClick = false;
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		selectFilePath(file.path, {
			additive: e.ctrlKey || e.metaKey,
			range: e.shiftKey,
		});
	}

	function handleRowKeydown(file: TFile, e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const next = applyKeyboardMove({
				orderedIds: orderedPaths,
				selectedIds: selectedFiles,
				anchorId: selectionAnchorPath,
				focusedId: focusedPath ?? file.path,
				direction: e.key === 'ArrowDown' ? 1 : -1,
				additive: e.ctrlKey || e.metaKey,
				range: e.shiftKey,
			});
			commitSelectedPaths(next.ids, next.anchorId, next.focusedId);
			return;
		}
		if (e.key === ' ' || e.key === 'Spacebar') {
			e.preventDefault();
			selectFilePath(file.path, {
				additive: e.ctrlKey || e.metaKey,
				range: e.shiftKey,
			});
			return;
		}
		if (e.key === 'Enter') {
			onFileClick(file);
		}
	}

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0 || !outerEl || shouldIgnoreBoxStart(e.target)) return;
		dragStart = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
		selectionBox = null;
		outerEl.setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragStart || !outerEl || e.pointerId !== dragStart.pointerId) return;
		const dx = e.clientX - dragStart.x;
		const dy = e.clientY - dragStart.y;
		if (!selectionBox && Math.hypot(dx, dy) < 4) return;
		e.preventDefault();
		selectionBox = makeSelectionBox(dragStart.x, dragStart.y, e.clientX, e.clientY);
	}

	function handlePointerUp(e: PointerEvent) {
		if (!dragStart || e.pointerId !== dragStart.pointerId) return;
		const box = selectionBox;
		releasePointer(e.pointerId);
		dragStart = null;
		selectionBox = null;
		if (!box) return;
		const paths = intersectingRowPaths(box);
		suppressNextClick = true;
		if (paths.length > 0) selectBoxPaths(paths, e);
	}

	function handlePointerCancel() {
		if (dragStart) releasePointer(dragStart.pointerId);
		dragStart = null;
		selectionBox = null;
	}

	function releasePointer(pointerId: number) {
		if (!outerEl?.hasPointerCapture(pointerId)) return;
		outerEl.releasePointerCapture(pointerId);
	}

	function shouldIgnoreBoxStart(target: EventTarget | null): boolean {
		const el = target instanceof HTMLElement ? target : null;
		return Boolean(el?.closest('input, textarea, select, button, [role="button"]'));
	}

	function makeSelectionBox(startX: number, startY: number, endX: number, endY: number) {
		const outerRect = outerEl!.getBoundingClientRect();
		const startLeft = startX - outerRect.left + outerEl!.scrollLeft;
		const startTop = startY - outerRect.top + outerEl!.scrollTop;
		const endLeft = endX - outerRect.left + outerEl!.scrollLeft;
		const endTop = endY - outerRect.top + outerEl!.scrollTop;
		return {
			left: Math.min(startLeft, endLeft),
			top: Math.min(startTop, endTop),
			width: Math.abs(endLeft - startLeft),
			height: Math.abs(endTop - startTop),
		};
	}

	function intersectingRowPaths(box: NonNullable<typeof selectionBox>): string[] {
		if (!outerEl) return [];
		const boxRect = selectionBoxViewportRect(box);
		const paths: string[] = [];
		for (const row of outerEl.querySelectorAll<HTMLElement>('.vm-file-row[data-path]')) {
			if (rectsIntersect(boxRect, row.getBoundingClientRect())) {
				const path = row.dataset.path;
				if (path) paths.push(path);
			}
		}
		return paths;
	}

	function selectionBoxViewportRect(box: NonNullable<typeof selectionBox>): DOMRect {
		const outerRect = outerEl!.getBoundingClientRect();
		return new DOMRect(
			outerRect.left + box.left - outerEl!.scrollLeft,
			outerRect.top + box.top - outerEl!.scrollTop,
			box.width,
			box.height,
		);
	}

	function rectsIntersect(a: DOMRect, b: DOMRect): boolean {
		return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
	}

	function handleSort(col: SortColumn) {
		if (sortColumn === col) {
			onSortChange(col, sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			onSortChange(col, 'asc');
		}
	}

	function getPropCount(file: TFile) {
		const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		return Object.keys(fm).filter((k) => k !== 'position').length;
	}

	function indeterminate(el: HTMLInputElement, value: boolean) {
		el.indeterminate = value;
		return {
			update(v: boolean) {
				el.indeterminate = v;
			},
		};
	}
</script>

<div class="vm-files-container">
	<div class="vm-files-header">
		<span class="vm-files-count">
			{translate('files.count', { filtered: files.length, total: totalCount })}
		</span>
	</div>

	<div class="vm-files-col-header">
		<input
			type="checkbox"
			class="vm-file-checkbox"
			checked={allSelected}
			indeterminate={someSelected}
			onchange={toggleAll}
			use:indeterminate={someSelected}
		/>

		<button
			class="vm-col-header"
			class:active={sortColumn === 'name'}
			onclick={() => handleSort('name')}
		>
			{translate('files.col.name')}
			{sortColumn === 'name' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
		</button>

		<button
			class="vm-col-header"
			class:active={sortColumn === 'props'}
			onclick={() => handleSort('props')}
		>
			{translate('files.col.props')}
			{sortColumn === 'props' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
		</button>

		<button
			class="vm-col-header"
			class:active={sortColumn === 'path'}
			onclick={() => handleSort('path')}
		>
			{translate('files.col.path')}
			{sortColumn === 'path' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
		</button>
	</div>

	<div
		bind:this={outerEl}
		class="vm-files-virtual-outer"
		onscroll={onScroll}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerCancel}
		role="grid"
		tabindex="-1"
	>
		<div class="vm-files-virtual-inner" style="height: {totalH}px">
			{#each v.visible as file, i (file.path)}
				{@const absIdx = v.window.startIndex + i}
				{@const isSelected = selectedFiles.has(file.path)}
				{@const isFocused = focusedPath === file.path}
				<div
					class="vm-file-row"
					class:is-selected={isSelected}
					class:is-focused={isFocused}
					style="--vm-file-y: {absIdx * v.rowHeight}px"
					data-path={file.path}
					onclick={(e) => handleRowClick(file, e)}
					oncontextmenu={(e) => onContextMenu(file, e)}
					onkeydown={(e) => handleRowKeydown(file, e)}
					role="row"
					tabindex="0"
					aria-selected={isSelected}
				>
					<input
						type="checkbox"
						class="vm-file-checkbox"
						checked={isSelected}
						onclick={(e) => e.stopPropagation()}
						onchange={() => toggleFile(file.path)}
					/>
					<span class="vm-file-name">{file.basename}</span>
					<span class="vm-file-props">{getPropCount(file)}</span>
					<span class="vm-file-path">{file.parent?.path ?? ''}</span>
				</div>
			{/each}
		</div>
		{#if selectionBox}
			<div
				class="vm-selection-box"
				style="left: {selectionBox.left}px; top: {selectionBox.top}px; width: {selectionBox.width}px; height: {selectionBox.height}px"
			></div>
		{/if}
	</div>
</div>
