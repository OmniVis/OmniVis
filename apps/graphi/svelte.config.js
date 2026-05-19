import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    alias: {
      '$/*': './src/lib/*'
    },
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '404.html',
      precompress: false,
      strict: false
    }),
    csrf: {
      checkOrigin: true
    },
    paths: {
      base: process.env.BASE_PATH ?? '',
      relative: false
    }
  }
};
export default config;
