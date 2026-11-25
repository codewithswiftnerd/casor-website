// ============================================================
//  SITE CONTENT
//  Admin-editable text, no rebuild/redeploy needed. Mirrors
//  site-images.js: an admin edits a field in dashboard.html ->
//  Site Content, and we store the text in Firestore under
//  collection "site_content", doc id = the slot name (e.g.
//  "home-about-p1", "event-kickoff-title").
//
//  Any element on any page tagged with a matching slot picks up
//  that text automatically:
//    <p data-text-slot="home-about-p1">Default paragraph...</p>
//
//  If a slot has no override in Firestore, the element just
//  keeps whatever text is already in the HTML (the bundled
//  default copy) - nothing to configure for that case.
//
//  A saved value may contain line breaks (from a textarea in the
//  dashboard) - those are rendered as <br>. The text itself is
//  HTML-escaped first, so this is safe against markup injection
//  even though it's applied via innerHTML.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    if (typeof db === 'undefined') return; // firebase-config.js didn't load

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    db.collection('site_content').onSnapshot(
        snap => {
            snap.forEach(doc => {
                const data = doc.data();
                if (!data || typeof data.text !== 'string') return;
                const slot = doc.id;
                const html = escapeHtml(data.text).replace(/\n/g, '<br>');

                document.querySelectorAll(`[data-text-slot="${slot}"]`).forEach(el => {
                    el.innerHTML = html;
                });
            });
        },
        err => {
            // Fails silently on the public site - visitors just see the
            // bundled default text, which is a perfectly fine fallback.
            console.warn('Site content did not load, showing defaults:', err.message);
        }
    );
});
