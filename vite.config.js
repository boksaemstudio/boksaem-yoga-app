import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    port: 5173,
    host: true
  },
  esbuild: {
    drop: ['debugger'],
    pure: ['console.log', 'console.debug'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    // [PERF] Strip console.log and console.debug in production builds
    // console.warn and console.error are preserved for important diagnostics
    rollupOptions: {
      output: {
        // [BUILD-FIX] Appending -v12 to physically force new filenames on every single file
        // This is a last-resort countermeasure against Workbox aggressively caching files
        // and Vite/Rollup failing to change chunk hashes for edited React files.
        chunkFileNames: `assets/[name]-[hash]-v12.js`,
        entryFileNames: `assets/[name]-[hash]-v12.js`,
        assetFileNames: `assets/[name]-[hash]-v12.[ext]`
      }
    }
  }
});
