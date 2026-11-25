// ============================================================
//  SITE IMAGES
//  Admin-editable images, no Firebase Storage involved (that
//  needs a paid plan). Instead: an admin pastes a Google Drive
//  "Anyone with the link" URL in dashboard.html -> Site Images,
//  we convert it to a hotlinkable image URL, and store that in
//  Firestore under collection "site_images", doc id = the slot
//  name (e.g. "unit-prayer", "hero-about").
//
//  Any element on any page tagged with a matching slot picks up
//  that image automatically:
//    <img data-img-slot="unit-prayer" src="images/prayer.jpg" />
//    <section class="page-hero" data-bg-slot="hero-about">
//
//  If a slot has no override in Firestore, the element just
//  keeps whatever is already in the HTML (the bundled default
//  photo) - nothing to configure for that case.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    if (typeof db === 'undefined') return; // firebase-config.js didn't load

    db.collection('site_images').onSnapshot(
        snap => {
            snap.forEach(doc => {
                const data = doc.data();
                if (!data || !data.url) return;
                const slot = doc.id;

                document.querySelectorAll(`[data-img-slot="${slot}"]`).forEach(el => {
                    el.src = data.url;
                });

                document.querySelectorAll(`[data-bg-slot="${slot}"]`).forEach(el => {
                    el.style.backgroundImage = `url("${data.url}")`;
                });
            });
        },
        err => {
            // Fails silently on the public site - visitors just see the
            // bundled default images, which is a perfectly fine fallback.
            console.warn('Site images did not load, showing defaults:', err.message);
        }
    );
});
