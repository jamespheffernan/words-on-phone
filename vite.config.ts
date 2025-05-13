import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Ensure correct bundling for production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand', 'idb', 'firebase'],
        },
      },
    },
  },
  server: {
    headers: {
      'Content-Type': 'application/javascript',
    },
  },
})
