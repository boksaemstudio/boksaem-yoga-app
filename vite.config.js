import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      devOptions: {
        enabled: true
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
        sourcemap: true,
        maximumFileSizeToCacheInBytes: 5000000,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: "요가 출석 및 관리 시스템",
        short_name: "요가출석",
        description: "복샘요가/다솔요가 출석 및 회원 관리 앱",
        theme_color: "#1E1E1E",
        background_color: "#1E1E1E",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/logo192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/logo512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
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
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // [BUILD-FIX] Appending -v8 to physically force new filenames on every single file
        // This is a last-resort countermeasure against Workbox aggressively caching files
        // and Vite/Rollup failing to change chunk hashes for edited React files.
        chunkFileNames: `assets/[name]-[hash]-v10.js`,
        entryFileNames: `assets/[name]-[hash]-v10.js`,
        assetFileNames: `assets/[name]-[hash]-v10.[ext]`
      }
    }
  }
});
