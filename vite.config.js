import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'chrome >= 59', 'safari >= 11', 'ios >= 11', 'android >= 5'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // [PERF] 대형 청크(face-api 1.4MB, CheckInPage 등) 제외 → 프리캐시 용량 대폭 축소
        // [FIX] png를 프리캐시에서 제외 — 랜딩페이지 이미지(660~771KB)가 600KB 제한 초과
        globPatterns: ['**/*.{css,html,ico,svg}', 'assets/index-*.js', 'assets/vendor-*.js'],
        // [FIX] Prevent Service Worker from hijacking static HTML pages into React Router SPA
        navigateFallbackDenylist: [/^\/features\.html$/, /^\/home\.html$/, /^\/onboarding_guide\.html$/],
        // [PERF] 레거시 번들이 분리되면서 vendor-firebase-legacy가 971KB를 초과하므로 3MB로 상향 조치
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
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
        theme_color: '#000000',
        background_color: '#000000',
        display: 'fullscreen',
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
    target: 'chrome60'
  },
  build: {
    target: ['es2015', 'chrome60', 'safari12'],
    cssTarget: 'chrome61',
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
