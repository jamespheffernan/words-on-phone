import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'generate-netlify-headers',
      closeBundle() {
        const headers = `
/*
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:

/assets/*.js
  Content-Type: application/javascript

/assets/*.css
  Content-Type: text/css

/*.js
  Content-Type: application/javascript

/*.css
  Content-Type: text/css
`;
        const redirects = `
# SPA redirect rule
/*  /index.html  200
`;
        // Ensure the dist directory exists
        const distDir = path.resolve(__dirname, 'dist');
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, { recursive: true });
        }
        
        // Write the _headers file
        fs.writeFileSync(path.resolve(distDir, '_headers'), headers.trim());
        
        // Write the _redirects file
        fs.writeFileSync(path.resolve(distDir, '_redirects'), redirects.trim());
        
        console.log('Generated Netlify _headers and _redirects files');
      }
    }
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/analytics'],
  }
})

