// [SELF-DESTRUCTING SERVICE WORKER]
// This SW replaces the old Workbox-powered SW that was aggressively caching everything.
// When the browser detects this new SW script (different content = new version),
// it will install and activate it. On activation, it:
// 1. Deletes ALL CacheStorage entries
// 2. Unregisters itself
// 3. Forces all open tabs to reload with fresh content from the network

self.addEventListener('install', function() {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('[SW-NUKE] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('[SW-NUKE] All caches destroyed. Unregistering self...');
      return self.registration.unregister();
    }).then(function() {
      // Force all clients (tabs) to reload
      return self.clients.matchAll();
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.navigate(client.url);
      });
    })
  );
});

// Do NOT cache anything - pass all requests straight through to network
self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});
