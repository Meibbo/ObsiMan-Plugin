<script lang="ts" generics="TNode extends NodeBase = NodeBase">
	import { untrack } from 'svelte';
	import {
		createTable,
		functionalUpdate,
		getCoreRowModel,
		getSortedRowModel,
		type Column,
		type RowSelectionState,
		type SortingState,
		type TableOptionsResolved,
	} from '@tanstack/table-core';
	import { createVirtualizer, type Rect, type Virtualizer } from '@tanstack/svelte-virtual';
	import type { NodeBase } from '../../types/typeContracts';
	import type { ViewColumn, ViewRow } from '../../types/typeViews';
	import { buildNodeTableColumnDefs } from '../../services/serviceViewTableAdapter';
	import {
		NODE_MOUSE_GESTURE_CONFIG,
		NODE_MOUSE_IGNORE_SELECTOR,
		createMouseGestureService,
		mergeMouseGestureConfig,
		type MouseGestureConfig,
	} from '../../services/serviceMouse';

	const TABLE_ROW_HEIGHT = 32;
	const TABLE_OVERSCAN = 8;
	const TABLE_FALLBACK_WIDTH = 640;
	const TABLE_FALLBACK_HEIGHT = 360;
	const EMPTY_SELECTED_IDS: ReadonlySet<string> = new Set();
	type ScrollTarget = { id: string; serial: number };

	interface Props<TNode extends NodeBase = NodeBase> {
		rows: ViewRow<TNode>[];
		columns: ViewColumn<TNode>[];
		selectedIds?: ReadonlySet<string>;
		focusedId?: string | null;
		activeId?: string | null;
		onRowClick: (id: string, e: MouseEvent) => void;
		onPrimaryAction?: (id: string, e: MouseEvent) => void;
		onSecondaryAction?: (id: string, e: MouseEvent) => void;
		onTertiaryAction?: (id: string, e: MouseEvent) => void;
		onContextMenu: (id: string, e: MouseEvent) => void;
		onRowKeydown?: (id: string, e: KeyboardEvent) => void;
		onSelectAll?: (ids: string[], e: Event) => void;
		scrollTarget?: ScrollTarget | null;
		mouseGestureConfig?: MouseGestureConfig;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	}

	let {
		rows,
		columns,
		selectedIds = EMPTY_SELECTED_IDS,
		focusedId = null,
		activeId = null,
		onRowClick,
		onPrimaryAction: _onPrimaryAction,
		onSecondaryAction,
		onTertiaryAction,
		onContextMenu,
		onRowKeydown,
		onSelectAll,
		scrollTarget = null,
		mouseGestureConfig,
		icon,
	}: Props<TNode> = $props();

	let outerEl: HTMLDivElement | undefined = $state();
	let sorting: SortingState = $state([]);
	const mouse = createMouseGestureService();
	const nodeMouseConfig = $derived(
		mergeMouseGestureConfig(NODE_MOUSE_GESTURE_CONFIG, mouseGestureConfig),
	);

	$effect(() => () => mouse.cancelAll());

	const columnDefs = $derived(buildNodeTableColumnDefs(columns));
	const rowSelection = $derived.by(() => {
		const out: RowSelectionState = {};
		for (const id of selectedIds) out[id] = true;
		return out;
	});
	const table = $derived.by(() =>
		createTable<ViewRow<TNode>>({
			data: rows,
			columns: columnDefs,
			getCoreRowModel: getCoreRowModel(),
			getSortedRowModel: getSortedRowModel(),
			getRowId: (row) => row.id,
			enableRowSelection: true,
			state: { sorting, rowSelection, columnPinning: { left: [], right: [] } },
			onSortingChange: (updater) => {
				sorting = functionalUpdate(updater, sorting);
			},
			onRowSelectionChange: () => {},
			onStateChange: () => {},
			renderFallbackValue: '',
		} as TableOptionsResolved<ViewRow<TNode>>),
	);
	const tableRows = $derived(table.getRowModel().rows);
	const columnTemplate = $derived(
		columns
			.map((column) => `minmax(${column.minWidth ?? 120}px, ${column.width ?? 1}fr)`)
			.join(' '),
	);
	const rowVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => outerEl ?? null,
		estimateSize: () => TABLE_ROW_HEIGHT,
		observeElementRect: observeTableRect,
		overscan: TABLE_OVERSCAN,
		initialRect: { width: TABLE_FALLBACK_WIDTH, height: TABLE_FALLBACK_HEIGHT },
	});
	const virtualRows = $derived($rowVirtualizer.getVirtualItems());
	const renderedRows = $derived.by(() => {
		const visibleRows = virtualRows
			.filter((row) => row.index < tableRows.length)
			.map((row) => ({ key: row.key, index: row.index, start: row.start }));
		if (visibleRows.length > 0 || tableRows.length === 0) return visibleRows;
		return tableRows.map((row, index) => ({
			key: row.id,
			index,
			start: index * TABLE_ROW_HEIGHT,
		}));
	});
	const totalHeight = $derived(
		Math.max($rowVirtualizer.getTotalSize(), tableRows.length * TABLE_ROW_HEIGHT),
	);

	$effect(() => {
		const count = tableRows.length;
		const scrollElement = outerEl;
		untrack(() =>
			$rowVirtualizer.setOptions({
				count,
				getScrollElement: () => scrollElement ?? null,
				estimateSize: () => TABLE_ROW_HEIGHT,
				observeElementRect: observeTableRect,
				overscan: TABLE_OVERSCAN,
				initialRect: { width: TABLE_FALLBACK_WIDTH, height: TABLE_FALLBACK_HEIGHT },
			}),
		);
	});

	$effect(() => {
		const target = scrollTarget;
		if (!target || !outerEl) return;
		const rowIndex = tableRows.findIndex((row) => row.id === target.id);
		if (rowIndex >= 0) scrollTableRowIntoView(rowIndex);
	});

	function handleHeaderClick(column: Column<ViewRow<TNode>, unknown>) {
		if (!column.getCanSort()) return;
		column.toggleSorting(column.getIsSorted() === 'asc');
	}

	function scrollTableRowIntoView(rowIndex: number): void {
		if (!outerEl) return;
		const viewportHeight = outerEl.clientHeight || TABLE_FALLBACK_HEIGHT;
		const currentTop = outerEl.scrollTop;
		const rowTop = rowIndex * TABLE_ROW_HEIGHT;
		const rowBottom = rowTop + TABLE_ROW_HEIGHT;
		const currentBottom = currentTop + viewportHeight;
		if (rowTop >= currentTop && rowBottom <= currentBottom) return;

		const nextTop = rowTop < currentTop ? rowTop : Math.max(0, rowBottom - viewportHeight);
		$rowVirtualizer.scrollToIndex(rowIndex, { align: rowTop < currentTop ? 'start' : 'end' });
		outerEl.scrollTop = nextTop;
		outerEl.dispatchEvent(new Event('scroll'));
	}

	function observeTableRect(
		_: Virtualizer<HTMLDivElement, HTMLDivElement>,
		cb: (rect: Rect) => void,
	): () => void {
		const emit = () => {
			cb({
				width: outerEl?.clientWidth || TABLE_FALLBACK_WIDTH,
				height: outerEl?.clientHeight || TABLE_FALLBACK_HEIGHT,
			});
		};
		emit();
		if (!outerEl || typeof ResizeObserver === 'undefined') return () => {};
		const ro = new ResizeObserver(emit);
		ro.observe(outerEl);
		return () => ro.disconnect();
	}

	function handleRowClick(id: string, e: MouseEvent) {
		mouse.handleClick(
			{ key: `table:${id}`, eventTarget: e.target, ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR },
			e,
			{
				primary: (event) => onRowClick(id, event),
				secondary: (event) => onSecondaryAction?.(id, event),
				tertiary: (event) => onTertiaryAction?.(id, event),
			},
			nodeMouseConfig,
		);
	}

	function handleRowAuxClick(id: string, e: MouseEvent) {
		mouse.handleAuxClick(
			{ key: `table:${id}`, eventTarget: e.target, ignoreSelector: NODE_MOUSE_IGNORE_SELECTOR },
			e,
			{ tertiary: (event) => onTertiaryAction?.(id, event) },
			nodeMouseConfig,
		);
	}

	function handleTableKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
			e.preventDefault();
			onSelectAll?.(
				tableRows.map((row) => row.id),
				e,
			);
		}
	}

	function cellDataId(row: ViewRow<TNode>, columnId: string): string {
		return row.cells.find((cell) => cell.columnId === columnId)?.id ?? `${row.id}:${columnId}`;
	}

	function cellDisplay(row: ViewRow<TNode>, columnId: string, fallback: unknown): string {
		const cell = row.cells.find((item) => item.columnId === columnId);
		return cell?.display ?? (fallback == null ? '' : String(fallback));
	}
</script>

<div
	class="vm-node-table"
	bind:this={outerEl}
	role="grid"
	aria-multiselectable="true"
	tabindex="0"
	onkeydown={handleTableKeydown}
	style:--vm-node-table-columns={columnTemplate}
>
	{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
		<div class="vm-node-table-header" role="row">
			{#each headerGroup.headers as header (header.id)}
				<button
					type="button"
					class="vm-node-table-header-cell"
					data-vm-table-header={header.column.id}
					role="columnheader"
					aria-sort={header.column.getIsSorted() === 'asc'
						? 'ascending'
						: header.column.getIsSorted() === 'desc'
							? 'descending'
							: 'none'}
					disabled={!header.column.getCanSort()}
					onclick={() => handleHeaderClick(header.column)}
				>
					<span>{header.column.columnDef.header}</span>
					{#if header.column.getIsSorted()}
						<span class="vm-node-table-sort" data-vm-table-sort={header.column.id}>
							{header.column.getIsSorted()}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	{/each}
	<div
		class="vm-node-table-inner"
		style:--vm-node-table-total-h={`${totalHeight}px`}
	>
		{#each renderedRows as virtualRow (virtualRow.key)}
			{@const row = tableRows[virtualRow.index]}
			{#if row}
				{@const id = row.id}
				{@const isSelected = selectedIds.has(id)}
				{@const isFocused = focusedId === id}
				{@const isActive = activeId === id}
				<div
					class="vm-node-table-row {row.original.cls ?? ''}"
					class:is-selected={isSelected}
					class:is-focused={isFocused}
					class:is-active-node={isActive}
					data-id={id}
					role="row"
					tabindex="0"
					aria-selected={isSelected}
					onclick={(e) => handleRowClick(id, e)}
					onauxclick={(e) => handleRowAuxClick(id, e)}
					oncontextmenu={(e) => onContextMenu(id, e)}
					onkeydown={(e) => onRowKeydown?.(id, e)}
					style:--vm-node-table-y={`${virtualRow.start}px`}
				>
					{#each row.getVisibleCells() as tableCell (tableCell.id)}
						{@const dataCellId = cellDataId(row.original, tableCell.column.id)}
						{@const display = cellDisplay(
							row.original,
							tableCell.column.id,
							tableCell.getValue(),
						)}
						<div
							class="vm-node-table-cell"
							role="gridcell"
							data-vm-table-cell={dataCellId}
						>
							{#if tableCell.column.id === 'label'}
								{#if row.original.icon}
									<span class="vm-node-table-icon" use:icon={row.original.icon}></span>
								{/if}
								<span class="vm-node-table-primary" data-vm-table-primary>
									{display}
								</span>
							{:else}
								{display}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{/each}
	</div>
</div>
