import { createVirtualizer } from '@tanstack/svelte-virtual';

const rows = [{ id: 'alpha' }, { id: 'beta' }];
const outerEl = null as HTMLDivElement | null;
const rowVirtualizer = {
	setOptions(_options: unknown) {},
};

createVirtualizer({
	count: rows.length,
	getScrollElement: () => outerEl,
	estimateSize: () => 32,
});

createVirtualizer({
	count: rows.length,
	getScrollElement: () => outerEl,
	getItemKey: (index) => rows[index]?.id ?? index,
	estimateSize: () => 32,
});

rowVirtualizer.setOptions({
	count: rows.length,
	getScrollElement: () => outerEl,
	estimateSize: () => 32,
});

rowVirtualizer.setOptions({
	count: rows.length,
	getScrollElement: () => outerEl,
	getItemKey: (index) => rows[index]?.id ?? index,
	estimateSize: () => 32,
});

rowVirtualizer.setOptions({
	debug: true,
});
