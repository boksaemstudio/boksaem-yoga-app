import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // "New content available, click to reload"
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'logo_circle.png', '*.svg'],
      manifest: false, // We handle manifest manually in index.html for dynamic/multi-role support
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        skipWaiting: false, // Wait for user to click "Reload"
        clientsClaim: true,
        // [CRITICAL] Import Firebase Messaging SW to enable Push Notifications
        importScripts: ['/firebase-messaging-sw.js'],
      },
      devOptions: {
        enabled: false // Disable PWA in dev to prevent constant "New version" loops
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 관련 라이브러리를 별도 청크로 분리
          'react-vendor': ['react', 'react-dom'],
          // React Router를 별도 청크로 분리
          'router': ['react-router-dom'],
          // Firebase 관련 라이브러리를 별도 청크로 분리
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/messaging'],
          // 아이콘 라이브러리를 별도 청크로 분리
          'icons': ['@phosphor-icons/react'],
        }
      }
    },
    // 청크 크기 경고 한도를 1MB로 조정 (기본값 500KB)
    // 청크 크기 경고 한도를 1MB로 조정 (기본값 500KB)
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // [SECURITY] Disable source maps in production
    minify: 'esbuild',
  },
  esbuild: {
    drop: ['console', 'debugger'],
  }
})
