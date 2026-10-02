import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 600, // three.js alone is ~520 kB (≈135 kB gzipped)
    // three.js changes far less often than game code: its own chunk stays cached across deploys.
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
});
