(function () {
    function absUrl(u) {
        try { return new URL(u || location.href, location.href).href; }
        catch (e) { return location.href; }
    }

    var sheet = null, current = null, lastFocus = null;

    function build() {
        sheet = document.createElement('div');
        sheet.className = 'share-sheet';
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.setAttribute('aria-labelledby', 'shareSheetTitle');
        sheet.hidden = true;
        sheet.innerHTML =
            '<div class="share-card">' +
                '<p class="share-eyebrow">Share</p>' +
                '<h3 id="shareSheetTitle"></h3>' +
                '<p class="share-url" id="shareSheetUrl"></p>' +
                '<div class="share-actions">' +
                    '<a class="share-act share-wa" id="shareWa" target="_blank" rel="noopener"><i class="fab fa-whatsapp" aria-hidden="true"></i><span>WhatsApp</span></a>' +
                    '<button type="button" class="share-act" id="shareCopy"><i class="fas fa-link" aria-hidden="true"></i><span>Copy link</span></button>' +
                    '<button type="button" class="share-act" id="shareMore" hidden><i class="fas fa-share-nodes" aria-hidden="true"></i><span>More</span></button>' +
                '</div>' +
                '<button type="button" class="share-close" id="shareClose">Close</button>' +
            '</div>';
        document.body.appendChild(sheet);

        sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
        sheet.querySelector('#shareClose').addEventListener('click', close);
        sheet.querySelector('#shareCopy').addEventListener('click', copy);
        sheet.querySelector('#shareMore').addEventListener('click', function () {
            if (!current || !navigator.share) return;
            navigator.share({ title: current.title, text: current.title, url: current.url }).then(close).catch(function () {});
        });
        sheet.querySelector('#shareWa').addEventListener('click', function () { setTimeout(close, 300); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) close(); });
    }

    function copy() {
        if (!current) return;
        var btn = sheet.querySelector('#shareCopy');
        var label = btn.querySelector('span');
        function done() {
            btn.classList.add('copied');
            label.textContent = 'Link copied';
            btn.querySelector('i').className = 'fas fa-check';
            setTimeout(function () {
                btn.classList.remove('copied');
                label.textContent = 'Copy link';
                btn.querySelector('i').className = 'fas fa-link';
            }, 1800);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(current.url).then(done, fallback);
        } else { fallback(); }
        function fallback() {
            var ta = document.createElement('textarea');
            ta.value = current.url;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); } catch (e) {}
            ta.remove();
        }
    }

    function open(opts) {
        if (!sheet) build();
        current = { title: (opts && opts.title) || document.title, url: absUrl(opts && opts.url) };
        lastFocus = document.activeElement;
        sheet.querySelector('#shareSheetTitle').textContent = current.title;
        sheet.querySelector('#shareSheetUrl').textContent = current.url;
        sheet.querySelector('#shareWa').href = 'https://wa.me/?text=' + encodeURIComponent(current.title + '\n' + current.url);
        sheet.querySelector('#shareMore').hidden = !navigator.share;
        sheet.hidden = false;
        document.documentElement.classList.add('share-open');
        requestAnimationFrame(function () { sheet.classList.add('on'); });
        sheet.querySelector('#shareCopy').focus();
    }

    function close() {
        if (!sheet || sheet.hidden) return;
        sheet.classList.remove('on');
        document.documentElement.classList.remove('share-open');
        setTimeout(function () { sheet.hidden = true; }, 200);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-share]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        open({ title: btn.getAttribute('data-share-title'), url: btn.getAttribute('data-share-url') });
    });

    window.CasorShare = { open: open, close: close };
})();
