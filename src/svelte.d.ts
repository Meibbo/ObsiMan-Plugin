// Type declaration for .svelte file imports.
// esbuild-svelte compiles them; tsc only needs to know the shape.
declare module '*.svelte' {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const component: any;
	export default component;
}
