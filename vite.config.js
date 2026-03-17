import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // [FIX] 자동 업데이트 — 새 SW 설치 즉시 활성화 (prompt 방식은 업데이트 버튼 버그 시 이전 버전 고착 위험)
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      manifest: {
        name: '복샘요가',
        short_name: '복샘요가',
        description: '복샘요가 관리 앱',
        theme_color: '#08080A',
        background_color: '#08080A',
        display: 'standalone',
        icons: [
          {
            src: 'logo_circle.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo_circle.png',
            sizes: '512x512',
            type: 'image/png'
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
  esbuild: {
    drop: ['debugger'],
    pure: ['console.log', 'console.debug'],
  },
  build: {
    outDir: 'dist',
    // [PERF] 'hidden' = 소스맵 생성하되 번들에서 참조 제거 → 에러 추적 가능 + 빌드 속도 약간 향상
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 1500,
    // [PERF] Strip console.log and console.debug in production builds
    // console.warn and console.error are preserved for important diagnostics
    rollupOptions: {
      output: {
        // [BUILD-FIX] Appending -v12 to physically force new filenames on every single file
        chunkFileNames: `assets/[name]-[hash]-v12.js`,
        entryFileNames: `assets/[name]-[hash]-v12.js`,
        assetFileNames: `assets/[name]-[hash]-v12.[ext]`,
        // [PERF] 대형 라이브러리를 별도 청크로 분리 → 캐싱 효율 + 빌드 속도
        manualChunks: {
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/messaging'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  }
});
