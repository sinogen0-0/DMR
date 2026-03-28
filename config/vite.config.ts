import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Adjust path since this config is in the config/ subfolder
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$lib: `${projectRoot}/src/lib`,
			$components: `${projectRoot}/src/lib/components`,
			$features: `${projectRoot}/src/lib/features`,
			$services: `${projectRoot}/src/lib/services`,
			$stores: `${projectRoot}/src/lib/stores`,
			$types: `${projectRoot}/src/lib/types`,
			$utils: `${projectRoot}/src/lib/utils`
		}
	},
	server: {
		port: 5173,
		host: true
	}
});
