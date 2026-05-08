import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    // Slang's WASM loader uses top-level await.
    target: 'esnext',
  },
  optimizeDeps: {
    // Slang ships several .wasm files referenced via `new URL('./x.wasm', import.meta.url)`.
    // Pre-bundling rewrites those URLs and drops most of the wasm assets, so we serve it as-is.
    exclude: ['@nomicfoundation/slang'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
});
