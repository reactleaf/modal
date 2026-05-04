import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteBasePath } from './gh-pages-base';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: viteBasePath(),
  plugins: [react()],
  resolve: {
    alias: {
      '@reactleaf/modal': path.resolve(dirname, '../src/index.ts'),
    },
  },
});
