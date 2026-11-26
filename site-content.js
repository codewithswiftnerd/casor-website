
document.addEventListener('DOMContentLoaded', () => {
    if (typeof db === 'undefined') return;

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
            console.warn('Site content did not load, showing defaults:', err.message);
        }
    );
});
