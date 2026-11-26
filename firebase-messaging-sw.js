
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

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
