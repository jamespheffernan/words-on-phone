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
      name: 'Words on Phone',
      short_name: 'Words on Phone',
      description: 'A fun party game for teams to guess phrases before the timer runs out. Play offline with customizable settings and categories.',
      theme_color: '#667eea',
      background_color: '#667eea',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      lang: 'en',
      orientation: 'portrait',
      categories: ['games', 'entertainment'],
      icons: [
        {
          src: 'icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'icon-192x192-maskable.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: 'icon-512x512-maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },

    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
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