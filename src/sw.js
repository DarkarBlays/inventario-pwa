import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute, setDefaultHandler } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Configuración de caché
const CACHE_NAME = `${import.meta.env.VITE_APP_NAME}-v${import.meta.env.VITE_CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';
const API_CACHE = import.meta.env.VITE_API_CACHE_NAME;
const STATIC_CACHE = import.meta.env.VITE_STATIC_CACHE_NAME;
const AUTH_CACHE = import.meta.env.VITE_AUTH_CACHE_NAME;
const SYNC_TASK_NAME = import.meta.env.VITE_SYNC_TASK_NAME;

// Crear plugin de sincronización en segundo plano
const backgroundSyncPlugin = new BackgroundSyncPlugin(SYNC_TASK_NAME, {
  maxRetentionTime: 24 * 60 // Retener por 24 horas
});

// Recursos a cachear inmediatamente
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/src/assets/css/main.css',
  '/src/assets/logo.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

// Limpiar cachés antiguos
cleanupOutdatedCaches()

// Precache y rutas para archivos del manifest
precacheAndRoute(self.__WB_MANIFEST)

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado')
  self.skipWaiting()
})

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activado')
  event.waitUntil(clients.claim())
})

// Manejo de mensajes
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Cache para recursos estáticos
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: STATIC_CACHE,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60 // 30 días
      })
    ]
  })
);

// Cache para la API con sincronización en segundo plano
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: API_CACHE,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60 // 24 horas
      }),
      backgroundSyncPlugin
    ],
    networkTimeoutSeconds: 3
  })
);

// Cache especial para autenticación
registerRoute(
  ({ url }) => url.pathname.includes('/login') || url.pathname.includes('/registro'),
  new NetworkFirst({
    cacheName: AUTH_CACHE,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 24 * 60 * 60 // 24 horas
      })
    ],
    networkTimeoutSeconds: 5
  })
);

// Manejar sincronización en segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-productos') {
    event.waitUntil(
      caches.open('sync-queue').then((cache) => {
        return cache.keys().then((requests) => {
          return Promise.all(
            requests.map((request) => {
              return cache.match(request).then((response) => {
                return response.json().then((data) => {
                  return fetch(request.url, {
                    method: request.method,
                    body: JSON.stringify(data),
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': request.headers.get('Authorization')
                    }
                  }).then(() => cache.delete(request));
                });
              });
            })
          );
        });
      })
    );
  }
});

async function syncData() {
  try {
    const cache = await caches.open(API_CACHE);
    const requests = await cache.keys();
    
    for (const request of requests) {
      if (request.url.includes('/api/productos')) {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response);
          }
        } catch (error) {
          console.error('Error al sincronizar:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error en sincronización:', error);
  }
}

// Interceptar peticiones fetch
self.addEventListener('fetch', (event) => {
  // Si es una petición de navegación
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Intentar obtener respuesta de la red
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          const cache = await caches.open(STATIC_CACHE);
          
          // Intentar obtener la página del caché
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Si no está en caché, devolver la página offline
          const offlineResponse = await cache.match(OFFLINE_URL);
          if (offlineResponse) {
            return offlineResponse;
          }
          
          // Si todo falla, devolver un error amigable
          return new Response(
            '<html><body><h1>Sin conexión</h1><p>La aplicación está en modo offline.</p></body></html>',
            {
              status: 503,
              headers: { 'Content-Type': 'text/html;charset=utf-8' }
            }
          );
        }
      })()
    );
    return;
  }

  // Para peticiones de autenticación
  if (event.request.url.includes('/login') || event.request.url.includes('/registro')) {
    event.respondWith(
      (async () => {
        // Para peticiones POST, pasar directamente a la red
        if (event.request.method === 'POST') {
          try {
            return await fetch(event.request);
          } catch (error) {
            return new Response(
              JSON.stringify({
                error: 'No se puede conectar al servidor',
                offline: true,
                timestamp: new Date().toISOString()
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
        }

        // Para otras peticiones (GET), usar la estrategia NetworkFirst
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            const cache = await caches.open(AUTH_CACHE);
            await cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }
          throw new Error('Network response was not ok');
        } catch (error) {
          const cache = await caches.open(AUTH_CACHE);
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(
            JSON.stringify({
              error: 'No hay conexión al servidor',
              offline: true,
              timestamp: new Date().toISOString()
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      })()
    );
    return;
  }

  // Para peticiones a la API
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      (async () => {
        // Para peticiones POST, PUT, DELETE ir directamente a la red sin cachear
        if (event.request.method !== 'GET') {
          try {
            const networkResponse = await fetch(event.request);
            return networkResponse;
          } catch (error) {
            return new Response(
              JSON.stringify({
                error: 'No se puede conectar al servidor',
                offline: true,
                timestamp: new Date().toISOString()
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
        }

        // Para peticiones GET usar NetworkFirst
        const cache = await caches.open(API_CACHE);
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            await cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }
          throw new Error('Network response was not ok');
        } catch (error) {
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(
            JSON.stringify({
              error: 'No hay conexión al servidor',
              offline: true,
              timestamp: new Date().toISOString()
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      })()
    );
    return;
  }

  // Para todas las demás peticiones
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cachedResponse = await cache.match(event.request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
      
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        if (event.request.destination === 'image') {
          const defaultImage = await cache.match('/src/assets/offline-image.png');
          if (defaultImage) {
            return defaultImage;
          }
        }
        
        return new Response(
          JSON.stringify({
            error: 'No hay conexión a internet',
            offline: true,
            timestamp: new Date().toISOString()
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    })()
  );
});

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
    icon: '/src/assets/logo.png',
    badge: '/src/assets/badge.png',
    data: {
      timestamp: new Date().getTime()
    }
  };

  event.waitUntil(
    self.registration.showNotification('Inventario PWA', options)
  );
}); 
