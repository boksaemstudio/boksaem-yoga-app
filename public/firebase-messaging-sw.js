// [SYNC] Firebase SDK 버전 — package.json의 'firebase' 버전과 반드시 일치시킬 것
const FIREBASE_SDK_VERSION = '12.7.0';

// [ROOT FIX] 이중 초기화 방지 — sw.js의 importScripts로 로드되거나 독립 실행될 때 모두 안전
if (typeof firebase === 'undefined') {
    importScripts(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-compat.js`);
    importScripts(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-messaging-compat.js`);
}

if (!firebase.apps.length) {
    firebase.initializeApp({
        apiKey: "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
        authDomain: "boksaem-yoga.firebaseapp.com",
        projectId: "boksaem-yoga",
        storageBucket: "boksaem-yoga.firebasestorage.app",
        messagingSenderId: "638854766032",
        appId: "1:638854766032:web:db6b919068aaf5808b2dd5"
    });
}

const messaging = firebase.messaging();

// [ROOT FIX] Background message handler
// FCM이 notification 필드가 있는 메시지를 보내면 자동으로 알림을 표시함
// onBackgroundMessage는 data-only 메시지일 때만 수동 표시 필요
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] onBackgroundMessage', payload);

    // [CRITICAL] notification 필드가 있으면 FCM이 이미 자동 표시함 → 중복 방지
    if (payload.notification) {
        console.log('[firebase-messaging-sw.js] notification field exists, skipping (FCM handles it)');
        return;
    }

    // data-only 메시지만 수동으로 표시
    const data = payload.data || {};
    const title = data.title || "내요가";
    const options = {
        body: data.body || "",
        icon: data.icon || '/logo_circle.png',
        badge: '/logo_circle.png',
        tag: data.tag || `msg-${Date.now()}`,
        renotify: true,
        data: { url: data.url || '/' }
    };
    
    return self.registration.showNotification(title, options);
});

// Notification click handler
self.addEventListener('notificationclick', function (event) {
    console.log('[SW] Notification click received.', event.notification);
    event.notification.close();

    const urlFromData = event.notification.data?.url;
    const targetUrl = urlFromData
        ? new URL(urlFromData, self.location.origin).href
        : new URL('/', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.navigate(targetUrl).then(c => c?.focus());
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Handle skip waiting
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
