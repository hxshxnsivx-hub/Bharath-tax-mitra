import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' mode: the SW waits in the 'waiting' state; the app (main.tsx)
      // shows a banner and calls wb.messageSkipWaiting() only when the user
      // confirms — satisfying design constraint MEDIUM-6.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bharat Tax Mitra',
        short_name: 'Tax Mitra',
        description: 'Offline-first income tax filing assistant for Indian taxpayers',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Precache app shell assets (HTML, CSS, JS)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,eot}'],

        // Don't precache the on-demand Indic fonts (OPT-UI.7) — a Tamil user
        // shouldn't download Bengali/Gujarati/Telugu/Devanagari at install.
        // They're fetched per active language (i18n/fonts.ts) and then held by
        // the runtime CacheFirst 'fonts' rule below, so a language works offline
        // once used. Inter + Playfair (the base UI faces) stay precached.
        globIgnores: ['**/noto-sans-*'],

        // Clean up outdated caches
        cleanupOutdatedCaches: true,
        
        // Cache versioning - increment to force cache refresh
        cacheId: 'bharat-tax-mitra-v1',
        
        runtimeCaching: [
          // API Calls: Network-first with 10s timeout, fallback to cache
          {
            urlPattern: /^https:\/\/api\.bharattaxmitra\.in\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-responses',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 86400, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          
          // Tax Rules: Cache-first with background update (24h refresh)
          {
            urlPattern: /^https:\/\/api\.bharattaxmitra\.in\/tax-rules\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'tax-rules',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 86400, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          
          // Static Assets: Cache-first with stale-while-revalidate
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 604800, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          
          // Fonts: Cache-first for fonts
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot|otf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: {
                // Each Indic family emits ~7 subset woff2/woff files; keep enough
                // headroom that a user who has opened several languages keeps them
                // all available offline (OPT-UI.7 on-demand fonts land here).
                maxEntries: 60,
                maxAgeSeconds: 604800, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          
          // App Shell: Cache-first for core application assets
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-shell',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 604800, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          
          // External CDN Resources: Stale-while-revalidate
          {
            urlPattern: /^https:\/\/cdn\..*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cdn-resources',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 604800, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        
        // DESIGN CONSTRAINT: Do NOT skip waiting automatically.
        // A user-confirmation banner (see main.tsx onNeedRefresh) asks the user
        // to refresh, protecting in-progress tax filing sessions.
        skipWaiting: false,

        // DESIGN CONSTRAINT: Do NOT claim clients aggressively on activation.
        // Pages opened before the SW update should not be silently taken over.
        clientsClaim: false,

        // Serve cached index.html for navigation requests when offline
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /\.(?:json|xml|txt)$/],
      },
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true,
    // Warn (and fail CI) when any chunk exceeds 500 KB — Tier-2/3 network budget
    chunkSizeWarningLimit: 500,
    // Show Brotli/gzip compressed sizes in the build output
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — loaded on every route
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // i18n is large (~150 KB); defer until language selection is needed
          'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // Charts only appear on the results screen — load lazily
          'charts': ['recharts'],
          // Icon set kept separate so tree-shaking can strip unused icons
          'ui-vendor': ['lucide-react'],
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
