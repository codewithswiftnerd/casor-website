
document.addEventListener('DOMContentLoaded', () => {
    if (typeof db === 'undefined') return;

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
            console.warn('Site images did not load, showing defaults:', err.message);
        }
    );
});
