// sw.js
const CACHE_NAME = 'catatan-kas-v4';

// Gunakan path relatif (tanpa garis miring diawal '/') agar cocok di Vercel
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './analytics.html',
  './settings.html',
  './style.css',
  './storage.js',
  './app-index.js',
  './app-analytics.js',
  './app-settings.js',
  './manifest.json',
  'icon/logo.svg',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// 1. Install & Simpan ke Cache Storage HP
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching file assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Bersihkan Cache Lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Strategi Offline-First: Ambil dari Cache Dulu, Baru Network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Gunakan file offline HP
      }
      return fetch(event.request).then((networkResponse) => {
        // Jika ada request baru, simpan otomatis ke cache
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Fallback jika offline total dan file tidak di-cache
      return caches.match('./index.html');
    })
  );
});