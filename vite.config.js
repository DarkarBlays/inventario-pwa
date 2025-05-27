import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      vue(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html'
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          sourcemap: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\..*\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: env.VITE_API_CACHE_NAME || 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 24 * 60 * 60 // 24 horas
                },
                networkTimeoutSeconds: 10
              }
            },
            {
              urlPattern: /\.(js|css|png|jpg|jpeg|svg|ico)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: env.VITE_STATIC_CACHE_NAME || 'assets-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 24 * 60 * 60
                }
              }
            }
          ]
        },
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png'
        ],
        manifest: {
          name: env.VITE_APP_NAME || 'Inventario PWA',
          short_name: env.VITE_APP_SHORT_NAME || 'Inventario',
          description: env.VITE_APP_DESCRIPTION || 'Sistema de Inventario PWA Profesional',
          theme_color: env.VITE_APP_THEME_COLOR || '#4f46e5',
          background_color: env.VITE_APP_BACKGROUND_COLOR || '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          orientation: 'portrait-primary',
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
              purpose: 'any'
            }
          ],
          shortcuts: [
            {
              name: 'Inventario',
              url: '/inventory',
              description: 'Ver inventario'
            }
          ],
          related_applications: [],
          prefer_related_applications: false
        }
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 5173,
      strictPort: true,
      host: true
    }
  }
})
