<script lang="ts">
	type SvarItem = {
		id: string;
		name: string;
		type: string;
		data?: SvarItem[];
	};
	type Listener = (payload: unknown) => void;
	type Api = {
		on: (event: string, cb: Listener) => void;
	};
	type MockState = {
		data: SvarItem[];
		initCalls: number;
		listeners: Map<string, Listener>;
	};
	type SvarGlobal = typeof globalThis & {
		__vaultmanSvarMock?: MockState;
	};

	let {
		data = [],
		init,
	}: {
		data?: SvarItem[];
		init?: (api: Api) => void;
	} = $props();

	function state(): MockState {
		const g = globalThis as SvarGlobal;
		g.__vaultmanSvarMock ??= {
			data: [],
			initCalls: 0,
			listeners: new Map(),
		};
		return g.__vaultmanSvarMock;
	}

	function flatten(items: SvarItem[]): SvarItem[] {
		return items.flatMap((item) => [item, ...flatten(item.data ?? [])]);
	}

	const flatData = $derived(flatten(data));

	$effect(() => {
		const mock = state();
		mock.data = data;
		mock.initCalls += 1;
		mock.listeners.clear();
		init?.({
			on(event, cb) {
				mock.listeners.set(event, cb);
			},
		});
	});
</script>

<div class="svar-filemanager" data-svar-count={flatData.length}>
	{#each flatData as item (item.id)}
		<div class="svar-item" data-id={item.id} data-type={item.type}>{item.name}</div>
	{/each}
</div>
