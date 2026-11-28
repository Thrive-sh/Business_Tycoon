/* ==========================================================================
   BUSINESS TYCOON TAP - SERVICE WORKER (OFFLINE CACHE-FIRST)
   ========================================================================== */

const CACHE_NAME = 'business-tycoon-tap-v74';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/aistudio/IMG_20261125_195255_669b1aec.png',
  './assets/styles/base.css',
  './assets/styles/preview.css',
  './assets/styles/responsive.css',
  './assets/utils/dom.js',
  './assets/utils/format.js',
  './assets/data/assets.js',
  './assets/core/config.js',
  './assets/core/firebase.js',
  './assets/core/state.js',
  './assets/core/main.js',
  './assets/components/feedback.js',
  './assets/components/badges.js',
  './assets/components/milestones.js',
  './assets/components/preview.js',
  './assets/tabs/earnings/earnings.css',
  './assets/tabs/earnings/earnings.js',
  './assets/tabs/investing/investing.css',
  './assets/tabs/investing/crypto-forex.js',
  './assets/tabs/investing/detail-chart.js',
  './assets/tabs/investing/investing.js',
  './assets/tabs/business/business.css',
  './assets/tabs/business/business.js',
  './assets/tabs/items/items.js',
  './assets/tabs/profile/profile.css',
  './assets/tabs/profile/profile.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(
        CORE_ASSETS.map(function (assetUrl) {
          return new Request(assetUrl, { cache: 'reload' });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then(function (networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, cloned);
            });
          }
          return networkResponse;
        })
        .catch(function () {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
