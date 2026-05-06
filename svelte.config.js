import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { sveltePreprocess } = require('svelte-preprocess');

export default {
	preprocess: sveltePreprocess({
		typescript: true,
		scss: true,
	}),
};
