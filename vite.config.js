import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // [PERF] 대형 청크(face-api 1.4MB, CheckInPage 등) 제외 → 프리캐시 용량 대폭 축소
        // [FIX] png를 프리캐시에서 제외 — 랜딩페이지 이미지(660~771KB)가 600KB 제한 초과
        globPatterns: ['**/*.{css,html,ico,svg}', 'assets/index-*.js', 'assets/vendor-*.js'],
        // [FIX] Prevent Service Worker from hijacking static HTML pages into React Router SPA
        navigateFallbackDenylist: [/^\/features\.html$/, /^\/home\.html$/, /^\/onboarding_guide\.html$/],
        // [PERF] 600KB 이하 파일만 프리캐시 허용 (vendor-firebase 512KB 수용, CheckInPage 1.4MB 제외)
        maximumFileSizeToCacheInBytes: 600 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // [PERF] Navigation Preload: SW 부팅과 페이지 네트워크 요청을 병렬 실행
        // → 홈 화면 아이콘 터치 시 1st tap 반응 속도 대폭 개선
        navigationPreload: true,
        // [ROOT FIX] Firebase 메시징 핸들러를 workbox SW에 포함
        importScripts: ['/firebase-messaging-sw.js'],
        // [PERF] 프리캐시에서 제외된 대형 JS/이미지는 런타임에 캐시
        runtimeCaching: [
          {
            urlPattern: /\.js$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'js-runtime-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|webp|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-runtime-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }
            }
          }
        ]
      },
      manifest: {
        name: '스튜디오',
        short_name: '스튜디오',
        description: '스튜디오 관리 앱',
        theme_color: '#08080A',
        background_color: '#08080A',
        display: 'standalone',
        start_url: '/',
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
