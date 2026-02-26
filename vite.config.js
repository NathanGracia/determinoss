import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  server: {
    proxy: {
      '/seed': 'http://localhost:3000',
      '/stream-proxy': 'http://localhost:3000',
      '^/ws$': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
