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

// Background message handler
// Background message handler
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // If notification payload exists, we can customize or let default handle it.
    // We customize to ensure Icon is set.
    if (payload.notification) {
        const title = payload.notification.title;
        const options = {
            body: payload.notification.body,
            icon: '/logo_circle.png',     // Main icon
            badge: '/logo_circle.png',    // Android small icon (alpha mask usually, but using logo for now)
            vibrate: [200, 100, 200],     // Gentle vibration
            data: {
                url: payload.data?.url || '/'
            },
            actions: [
                { action: 'open_url', title: '확인' }
            ]
        };

        return self.registration.showNotification(title, options);
    }
});

self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] Notification click received.');
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.indexOf('/') !== -1 && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
