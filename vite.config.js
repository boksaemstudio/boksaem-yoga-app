import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
          'icons': ['@phosphor-icons/react', 'phosphor-react'],
        }
      }
    },
    // 청크 크기 경고 한도를 1MB로 조정 (기본값 500KB)
    chunkSizeWarningLimit: 1000,
  }
})
