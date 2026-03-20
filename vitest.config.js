import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // jsdom: React 컴포넌트/훅 + 유틸 모두 안전하게 동작
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', 'functions'],
    setupFiles: ['./src/test/setup.js'],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
