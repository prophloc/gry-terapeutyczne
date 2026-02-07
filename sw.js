// Service Worker dla aplikacji Zwierzęta
const CACHE_NAME = 'zwierzeta-v1';
const urlsToCache = [
  '/index.html',
  '/css/styles.css',
  '/js/01-player-voice.js',
  '/js/02-voice-wav.js',
  '/js/03-tabs.js',
  '/js/04-drawing.js',
  '/js/05-learning-game.js',
  '/js/06-games.js',
  '/js/07-gitara.js',
  '/js/08-kolorowanki.js',
  '/js/09-memory.js',
  '/img/pies.png',
  '/img/kot.png',
  '/img/krowa.png',
  '/img/swinia.png',
  '/img/kura.png',
  '/img/kon.png',
  '/img/owca.png',
  '/img/pszczolka_maja.png',
  '/img/kaczka.png',
  '/img/krolik.png',
  '/img/mysz.png',
  '/img/zaba.png',
  '/img/brush-cursor.png'
];

// Install - cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
