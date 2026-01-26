/**
 * Kill Switch Service Worker
 * Forces immediate activation and clears all caches to resolve stale PWA issues.
 */
const CACHE_NAMES = ['boksaem-yoga-cache-v1']; // Not used but good practice

self.addEventListener('install', (event) => {
    console.log('[SW] Reset Service Worker Installing...');
    self.skipWaiting(); // Force activation immediately
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Reset Service Worker Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('[SW] Deleting cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log('[SW] All caches deleted.');
            return self.clients.claim(); // Take control of all clients immediately
        })
    );
});

// Pass-through fetch
self.addEventListener('fetch', (event) => {
    // Do nothing, let the browser handle the network request
    // This ensures we get fresh content from the network
});
