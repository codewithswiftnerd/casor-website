// ============================================================
//  ADD TO HOME SCREEN - custom install banner
//  Chrome (desktop + Android) fires "beforeinstallprompt" once
//  the manifest.json + a registered service worker are in place.
//  We capture that event instead of letting Chrome show its own
//  mini-bar, and show a small banner that matches the site.
//
//  On the homepage this waits for the app-splash intro to finish
//  first, so it never competes with it. On every other page it
//  shows up after a short, friendlier delay.
//
//  Not shown: inside an already-installed/standalone app, or for
//  14 days after someone dismisses it.
// ============================================================
(function () {
    var deferredPrompt = null;
    var DISMISS_KEY = 'casorInstallDismissedAt';
    var DISMISS_DAYS = 14;

    function isStandalone() {
        return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
            window.navigator.standalone === true;
    }

    function recentlyDismissed() {
        try {
            var ts = localStorage.getItem(DISMISS_KEY);
            if (!ts) return false;
            return (Date.now() - Number(ts)) / 86400000 < DISMISS_DAYS;
        } catch (e) {
            return false;
        }
    }

    function buildBanner() {
        if (document.getElementById('installBanner')) return;

        var el = document.createElement('div');
        el.id = 'installBanner';
        el.className = 'install-banner';
        el.innerHTML =
            '<img src="images/logo.png" alt="" class="install-banner-logo" data-img-slot="logo" />' +
            '<div class="install-banner-text">' +
                '<strong>Add CASOR to your Home Screen</strong>' +
                '<span>Quick access, right from your phone - like an app.</span>' +
            '</div>' +
            '<button class="install-banner-btn" id="installBannerGo" type="button">Add</button>' +
            '<button class="install-banner-close" id="installBannerClose" type="button" aria-label="Dismiss">&times;</button>';
        document.body.appendChild(el);

        requestAnimationFrame(function () {
            el.classList.add('install-banner--show');
        });

        function dismiss(remember) {
            el.classList.remove('install-banner--show');
            if (remember) {
                try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
            }
            setTimeout(function () { el.remove(); }, 350);
        }

        document.getElementById('installBannerGo').addEventListener('click', async function () {
            if (!deferredPrompt) { dismiss(false); return; }
            dismiss(false);
            deferredPrompt.prompt();
            try { await deferredPrompt.userChoice; } catch (e) {}
            deferredPrompt = null;
        });

        document.getElementById('installBannerClose').addEventListener('click', function () {
            dismiss(true);
        });
    }

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;

        if (isStandalone() || recentlyDismissed()) return;

        // Give the homepage's app-splash intro room to finish first.
        var delay = document.getElementById('appSplash') ? 13500 : 1500;
        setTimeout(function () {
            if (deferredPrompt) buildBanner();
        }, delay);
    });

    window.addEventListener('appinstalled', function () {
        deferredPrompt = null;
        var el = document.getElementById('installBanner');
        if (el) el.remove();
    });
})();
