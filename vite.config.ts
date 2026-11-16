import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Relative paths, so the app works at https://<you>.github.io/<repo>/ without extra config.
  base: './',
  plugins: [
    react(),
    VitePWA({
      // The service worker updates itself whenever a new version is deployed.
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Calories',
        short_name: 'Calories',
        description: 'Personal calorie and macro tracker',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#DBF2FC',
        theme_color: '#DBF2FC',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Pre-cache the app itself so it opens offline.
        // woff2 = the fonts of all six themes, so switching theme also works offline.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // ...except the label reader (about 4 MB). It is only fetched on the first label scan.
        globIgnores: ['tesseract/**'],
        // Keep product photos from Open Food Facts so they also show offline.
        runtimeCaching: [
          // The label reader's worker and engine: keep them after the first download so label
          // scanning works offline. (Tesseract stores the language data itself, in IndexedDB.)
          {
            urlPattern: /\/tesseract\/[^/]+\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'tesseract' },
          },
          {
            urlPattern: /^https:\/\/images\.openfoodfacts\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'product-images',
              expiration: { maxEntries: 500 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
