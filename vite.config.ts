import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { defineConfig } from 'vite';

const polyfills = nodePolyfills({
	globals: {
		Buffer: true,
		global: true,
		process: true
	},
	exclude: ['module']
}).map((plugin) => ({
	...plugin,
	apply: (_config: unknown, env: { isSsrBuild: boolean }) => !env.isSsrBuild
}));

export default defineConfig({
	plugins: [sveltekit({ compilerOptions: { runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true }, adapter: adapter() }), ...polyfills]
});