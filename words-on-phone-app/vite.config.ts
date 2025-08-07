/// <reference types="vitest" />
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore - Dynamic import for version generation
import generateVersion from './scripts/generate-version.js'

// Generate version info at build time
const versionInfo = generateVersion();

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(versionInfo.version),
    __APP_VERSION_INFO__: JSON.stringify(versionInfo),
  },
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    injectRegister: false,

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'words-on-phone-app',
      short_name: 'words-on-phone-app',
      description: 'words-on-phone',
      theme_color: '#ffffff',
    },

    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit for large phrase data
    },

    devOptions: {
      enabled: false,
      navigateFallback: 'index.html',
      suppressWarnings: true,
      type: 'module',
    },
  })],
  worker: {
    format: 'es',
    plugins: () => [], // Remove React plugin from workers - workers don't need React
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Ensure worker files get .js extension
          if (assetInfo.name && assetInfo.name.includes('Worker')) {
            return 'assets/[name]-[hash].js';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/setupTests.ts'],
    globals: true,
  },
})