const CACHE_NAME = 'teh-raja-cache-v5';
const STATIC_ASSETS = [
    '/',
    '/pos',
    '/admin',
    '/manifest.json',
    '/favicon.ico',
    '/icon-192.png',
    '/icon-512.png',
];

// Install: cache core pages and assets
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                STATIC_ASSETS.map(url =>
                    cache.add(url).catch(() => {
                        console.warn('[SW] Failed to cache:', url);
                    })
                )
            );
        })
    );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch strategy:
// - Navigation: Network-first with cache fallback
// - Images: Cache-first
// - Others: Stale-while-revalidate (cached + refresh in background)
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;
    // Skip non-http requests (e.g. chrome-extension://)
    if (!event.request.url.startsWith('http')) return;
    // Skip Firebase / external analytics requests
    if (event.request.url.includes('firebaseio.com') ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('mixkit.co')) return;

    const isNavigation = event.request.mode === 'navigate';
    const isImage = event.request.destination === 'image';

    if (isNavigation) {
        // Network-first for pages
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                    return response;
                })
                .catch(() =>
                    caches.match(event.request).then(cached =>
                        cached || caches.match('/')
                    )
                )
        );
    } else if (isImage) {
        // Cache-first for images (product photos, etc.)
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response.ok) {
                        const cloned = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                    }
                    return response;
                }).catch(() => new Response('', { status: 404 }));
            })
        );
    } else {
        // Stale-while-revalidate for JS/CSS/fonts
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                const networkFetch = fetch(event.request).then(response => {
                    if (response.ok) {
                        const cloned = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                    }
                    return response;
                });
                return cachedResponse || networkFetch;
            })
        );
    }
});
