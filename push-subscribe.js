// ============================================================
// PUSH NOTIFICATIONS - visitor opt-in.
// Loaded on every public page (after portal/firebase-config.js, which
// already calls firebase.initializeApp()). Shows a small bottom banner
// asking for permission; on "Allow" it registers the service worker,
// gets an FCM token for this device, and saves it to Firestore in
// push_subscribers/{token}. That's ALL this file does - it does not
// and cannot send notifications itself (see the Cloud Function in
// /functions, which is the piece that actually sends).
//
// SETUP REQUIRED before this does anything:
// 1. Firebase Console -> Project Settings -> Cloud Messaging -> Web
//    Push certificates -> Generate key pair. Copy the "Key pair"
//    value and paste it below as VAPID_KEY.
// 2. Deploy the Cloud Function in /functions (see SETUP-GUIDE.md) -
//    that's the part that actually sends a push when News/Programs
//    are posted. Until that's deployed, visitors can subscribe but
//    will never receive anything.
// ============================================================
const VAPID_KEY = 'BIpu4YwUwmw17exjgs1p1_MQmjFNsPulwDIEXrcVOlNkSgJXR-Pfb4CTRSEMtDsaRsC7V0X3uMBY4UIlDIclocU';

(function () {
    // Silently do nothing on unsupported browsers (older Safari, etc.)
    // or if the VAPID key hasn't been set up yet - never break the page.
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!VAPID_KEY || VAPID_KEY.indexOf('PASTE_') === 0) return;
    if (typeof firebase === 'undefined' || !firebase.messaging) return;

    const DISMISSED_KEY = 'casor-push-banner-dismissed';
    const SUBSCRIBED_KEY = 'casor-push-subscribed';

    function showBanner() {
        if (localStorage.getItem(DISMISSED_KEY) || localStorage.getItem(SUBSCRIBED_KEY)) return;
        if (Notification.permission === 'denied') return;
        if (document.getElementById('pushBanner')) return;

        const banner = document.createElement('div');
        banner.id = 'pushBanner';
        banner.style.cssText = [
            'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:9999',
            'background:#0B1F44', 'color:#fff', 'padding:14px 6%',
            'display:flex', 'align-items:center', 'justify-content:space-between',
            'gap:16px', 'flex-wrap:wrap',
            "font-family:'Poppins',sans-serif", 'font-size:14px',
            'box-shadow:0 -2px 12px rgba(0,0,0,0.25)'
        ].join(';');
        banner.innerHTML =
            '<span>Get notified when CASOR posts news or events?</span>' +
            '<span style="display:flex;gap:8px;">' +
            '<button id="pushAllowBtn" style="background:#FFC72C;color:#0B1F44;border:none;' +
            'padding:8px 18px;border-radius:20px;font-weight:700;cursor:pointer;">Allow</button>' +
            '<button id="pushDismissBtn" style="background:none;color:#cfd6e4;border:1px solid #cfd6e4;' +
            'padding:8px 18px;border-radius:20px;cursor:pointer;">Not now</button>' +
            '</span>';
        document.body.appendChild(banner);

        document.getElementById('pushDismissBtn').addEventListener('click', () => {
            localStorage.setItem(DISMISSED_KEY, '1');
            banner.remove();
        });
        document.getElementById('pushAllowBtn').addEventListener('click', async () => {
            banner.remove();
            await subscribe();
        });
    }

    async function subscribe() {
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            const messaging = firebase.messaging();
            const token = await messaging.getToken({
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
            });
            if (!token) return;

            // Doc ID = the token itself, so re-subscribing on the same
            // device just overwrites the same doc instead of piling up
            // duplicates.
            await db.collection('push_subscribers').doc(token).set({
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                page: location.pathname
            });
            localStorage.setItem(SUBSCRIBED_KEY, '1');
        } catch (err) {
            console.error('Push subscribe failed:', err);
        }
    }

    // Wait a few seconds after load rather than demanding a decision
    // the instant the page opens.
    // Wait for the homepage intro animation (if it's playing) to finish first.
    window.addEventListener('load', () => setTimeout(showBanner, document.getElementById('appSplash') ? 14000 : 4000));
})();
