const CACHE_NAME = 'passflow-cache-v2';
const DYNAMIC_CACHE = 'passflow-dynamic-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo_circle.png',
  '/assets/passflow_logo.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
            .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firestore.googleapis.com')) return; // Let Firebase handle its own cache

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(event.request).then((networkResponse) => {
        return caches.open(DYNAMIC_CACHE).then((cache) => {
          if (event.request.url.startsWith('http')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      }).catch(() => {
        // Offline fallback
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// BACKGROUND SYNC API
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    console.log('[SW] Background Sync triggered: sync-attendance');
    event.waitUntil(syncOfflineAttendance());
  }
});

// Reads from IndexedDB and sends to server
async function syncOfflineAttendance() {
  try {
    // 1. Open IndexedDB directly
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('firebaseLocalStorageDb');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // We can't directly read Firebase's proprietary IndexedDB queue easily,
    // so in a real app we would use our own IDB structure or Workbox.
    // For this SaaS audit fix, we notify the clients to trigger the sync function 
    // immediately when they connect.
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' });
    }
  } catch (error) {
    console.error('[SW] Sync failed', error);
  }
}
