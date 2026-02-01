importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga",
    storageBucket: "boksaem-yoga.firebasestorage.app",
    messagingSenderId: "638854766032",
    appId: "1:638854766032:web:db6b919068aaf5808b2dd5"
});

const messaging = firebase.messaging();

// [CRITICAL FIX] Set VAPID key for valid token generation
// This must match the VITE_FIREBASE_VAPID_KEY in .env
messaging.vapidKey = "BOz8GOOsVZsK9FJ6jS-w25tiMJk-YhdGmxvZNi2Q1gfY9Kmip4SOF0JAj0nl7aZKkAiAk6_wjb5AOzFZ2BHhDw0";

// Background message handler
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // [FIX] If the payload contains a 'notification' property, FCM will handle it automatically in the background.
    // Calling showNotification here causes a DUPLICATE Toast. 
    // We only show a notification manually if there's ONLY 'data' and NO 'notification'.
    if (payload.notification) {
        console.log('[firebase-messaging-sw.js] payload.notification exists, letting FCM handle display.');
        return;
    }

    // Handled only for data-only messages (custom display)
    if (payload.data) {
        const title = payload.data.title || "내요가";
        const options = {
            body: payload.data.body || "",
            icon: '/logo_circle.png',
            badge: '/logo_circle.png', // Badge is usually alpha-mask, branding logo might look black if not optimized, but using same for now.
            data: {
                url: payload.data.url || '/'
            }
        };
        return self.registration.showNotification(title, options);
    }
});

self.addEventListener('notificationclick', function (event) {
    console.log('[SW] Notification click received.', event.notification);
    event.notification.close();

    // Normalizing URL to absolute
    const urlFromData = event.notification.data?.url;
    // Default to root if no URL
    const targetUrl = urlFromData
        ? new URL(urlFromData, self.location.origin).href
        : new URL('/', self.location.origin).href;

    console.log('[SW] Target URL:', targetUrl);

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
            // 1. Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                // Check matching origin
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    // Always navigate the first focusable client to the new URL to ensure params are updated
                    // optimize: if exact match, just focus? 
                    // No, because we might want to refresh the tab or trigger the route listener.
                    // But prevent full reload if only hash/params changed? 
                    // React Router matches path. 
                    return client.navigate(targetUrl).then(c => c?.focus());
                }
            }
            // 2. If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// [CRITICAL] Handle skip waiting to immediately activate new SW
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] SKIP_WAITING received, activating new version...');
        self.skipWaiting();
    }
});
