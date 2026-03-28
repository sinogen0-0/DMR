import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$lib: `${__dirname}/src/lib`,
			$components: `${__dirname}/src/lib/components`,
			$services: `${__dirname}/src/lib/services`,
			$stores: `${__dirname}/src/lib/stores`,
			$types: `${__dirname}/src/lib/types`,
			$utils: `${__dirname}/src/lib/utils`
		}
	},
	server: {
		port: 5173,
		host: true
	}
});
