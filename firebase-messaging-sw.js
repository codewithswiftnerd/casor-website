// ============================================================
// PUSH NOTIFICATION SERVICE WORKER
// This has to live at the SITE ROOT (not in /portal) so its scope
// covers every page - a service worker can only control pages at or
// below the folder it's served from.
//
// It handles notifications that arrive while the site tab is closed
// or backgrounded. Foreground notifications (tab open and focused)
// aren't shown by design - FCM's default behavior there is to hand
// the message to your page's JS instead, and this site doesn't need
// an in-tab popup on top of everything else, just the background/
// closed-tab case, which is the whole point of push.
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Same config as portal/firebase-config.js. Duplicated here on purpose -
// a service worker can't import that file directly, and this project
// intentionally avoids a build step, so keeping both in sync by hand is
// the trade-off. If you ever rotate/replace the Firebase project, update
// both files together.
firebase.initializeApp({
    apiKey: "AIzaSyAiACEdrFknfxa43WNubTV8A96YaNKgeyc",
    authDomain: "casorwebsite.firebaseapp.com",
    projectId: "casorwebsite",
    storageBucket: "casorwebsite.appspot.com",
    messagingSenderId: "408409784355",
    appId: "1:408409784355:web:9080641fc27a2e5ecc7196"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || 'CASOR UNIPORT';
    const body = (payload.notification && payload.notification.body) || '';
    const link = (payload.fcmOptions && payload.fcmOptions.link)
        || (payload.data && payload.data.link)
        || '/index.html';

    self.registration.showNotification(title, {
        body,
        icon: '/images/logo.png',
        badge: '/images/logo.png',
        data: { link }
    });
});

// Tapping the notification opens (or focuses) the linked page.
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const link = (event.notification.data && event.notification.data.link) || '/index.html';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(link) && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(link);
        })
    );
});
