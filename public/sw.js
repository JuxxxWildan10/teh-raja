const CACHE_NAME = 'teh-raja-cache-v4';
const urlsToCache = [
    '/',
    '/manifest.json',
    '/favicon.ico',
    '/icon-192.png',
    '/icon-512.png',
];

// Install: cache core assets
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                urlsToCache.map(url => cache.add(url).catch(() => { }))
            );
        })
    );
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: cache-first strategy with network fallback
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;
    // Skip non-http requests (e.g. chrome-extension://)
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return fetch(event.request).catch(() => {
                // Return offline fallback for navigation
                if (event.request.mode === 'navigate') {
                    return caches.match('/');
                }
            });
        })
    );
});

