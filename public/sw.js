const CACHE_NAME = 'teh-raja-cache-v3';
const urlsToCache = [
    '/',
    '/manifest.json',
    '/favicon.ico',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cache if found, else fetch from network
                return response || fetch(event.request);
            })
    );
});
