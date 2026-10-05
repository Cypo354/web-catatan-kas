// sw.js
const CACHE_NAME = 'catatan-kas-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/analytics.html',
  '/settings.html',
  '/style.css',
  '/storage.js',
  '/app-index.js',
  '/app-analytics.js',
  '/app-settings.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js' // CDN Chart.js agar grafik tetap jalan offline
];

// 1. Install Event - Cache semua file penting
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Caching semua file assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activate Event - Bersihkan cache lama
self.addEventListener('activate', (e) => {
  e.waitUntil(
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

// 3. Fetch Event - Prioritaskan Cache (Offline First)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Ambil dari HP jika ada
      }
      return fetch(e.request); // Jika tidak ada di cache, baru ambil dari server/jaringan
    })
  );
});