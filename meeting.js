(function () {
    const statusEl = document.getElementById('mbStatus');
    const listEl = document.getElementById('mbList');
    const toolbar = document.getElementById('mbToolbar');
    const search = document.getElementById('mbSearch');
    const reader = document.getElementById('mbReader');
    const frame = document.getElementById('mbReaderFrame');

    let meetings = [];
    let docs = [];
    let typeFilter = 'all';
    let gotMeetings = false, gotDocs = false;
    let locked = false, everUnlocked = false, docsUnsub = null;
    const lockEl = document.getElementById('mbLock');
    const lockInput = document.getElementById('mbLockInput');
    const lockBtn = document.getElementById('mbLockBtn');
    const lockErr = document.getElementById('mbLockErr');
    const lockMsg = document.getElementById('mbLockMsg');

    const ORDER = (typeof OFFICE_DOCS !== 'undefined') ? OFFICE_DOCS.map(o => o.id) : [];
    const TYPE_ICON = { 'Minutes': 'fa-file-lines', 'Agenda': 'fa-list-check', 'Proposed Semester Calendar': 'fa-calendar-days', 'Vision Statement': 'fa-eye', 'Report': 'fa-chart-column', 'Handover Note': 'fa-handshake', 'Other': 'fa-folder-open' };

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function driveId(url) {
        const m = String(url || '').match(/\/(?:file|document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/) || String(url || '').match(/[?&]id=([a-zA-Z0-9_-]+)/);
        return m ? m[1] : null;
    }
    function previewUrl(url) {
        const u = String(url || '');
        const kind = (u.match(/docs\.google\.com\/(document|spreadsheets|presentation)\//) || [])[1];
        const id = driveId(u);
        if (kind && id) return `https://docs.google.com/${kind}/d/${id}/preview`;
        if (id && u.includes('drive.google.com')) return `https://drive.google.com/file/d/${id}/preview`;
        return null;
    }

    function render() {
        if (!gotMeetings || (!gotDocs && !locked)) return;
        const live = meetings;
        lockEl.hidden = true;
        if (!live.length) {
            statusEl.innerHTML = '<span class="mb-state">No meeting in session</span>';
            toolbar.hidden = true;
            listEl.innerHTML = `<div class="state"><i class="fas fa-mug-hot" aria-hidden="true"></i>
                <strong>Nothing on the board right now.</strong><br>
                Documents appear here when the next General Meeting starts. Pull down or refresh during the meeting.</div>`;
            return;
        }

        const liveIds = new Set(live.map(m => m.id));
        const titles = live.map(m => `<strong>${esc(m.title)}</strong>${m.date ? ' &middot; ' + esc(new Date(m.date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })) : ''}`).join('<br>');
        statusEl.innerHTML = `<span class="mb-state">Now in session</span><div class="mb-meeting-title">${titles}</div>`;
        if (locked) {
            toolbar.hidden = true;
            listEl.innerHTML = '';
            lockEl.hidden = false;
            return;
        }
        toolbar.hidden = false;

        const term = (search.value || '').trim().toLowerCase();
        const shown = docs
            .filter(d => liveIds.has(d.meetingId))
            .filter(d => typeFilter === 'all' || d.type === typeFilter)
            .filter(d => !term || (d.title || '').toLowerCase().includes(term) || (d.officeName || '').toLowerCase().includes(term));

        if (!shown.length) {
            listEl.innerHTML = `<div class="state"><i class="fas fa-hourglass-half" aria-hidden="true"></i>${docs.some(d => liveIds.has(d.meetingId))
                ? 'No documents match that filter.'
                : 'The meeting is in session, but no office has presented a document yet. This page updates by itself.'}</div>`;
            return;
        }

        const groups = {};
        shown.forEach(d => { (groups[d.office] = groups[d.office] || []).push(d); });
        const officeIds = Object.keys(groups).sort((a, b) => {
            const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
            return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
        });

        listEl.innerHTML = officeIds.map(id => {
            const items = groups[id];
            return `<div class="mb-group">
                <h2 class="mb-office">${esc(items[0].officeName || id)}</h2>
                <div class="mb-grid">${items.map(d => `
                    <button type="button" class="mb-doc" data-doc-id="${esc(d.id)}">
                        <span class="mb-doc-icon"><i class="fas ${TYPE_ICON[d.type] || 'fa-file'}" aria-hidden="true"></i></span>
                        <span class="mb-doc-text">
                            <span class="mb-doc-type">${esc(d.type)}</span>
                            <span class="mb-doc-title">${esc(d.title)}</span>
                        </span>
                    </button>`).join('')}
                </div>
            </div>`;
        }).join('');

        listEl.querySelectorAll('[data-doc-id]').forEach(btn => btn.addEventListener('click', () => openDoc(btn.dataset.docId)));

        if (!sharedDocDone && window.CasorShare) {
            sharedDocDone = true;
            const id = CasorShare.param('doc');
            const d = id && docs.find(x => x.id === id && liveIds.has(x.meetingId));
            if (d) {
                const card = listEl.querySelector('[data-doc-id="' + CSS.escape(id) + '"]');
                if (card) CasorShare.flash(card);
                openDoc(id);
            }
        }
    }
    let sharedDocDone = false;

    let lastFocus = null, openId = null;
    document.getElementById('mbReaderShare').addEventListener('click', () => {
        const d = docs.find(x => x.id === openId);
        if (d && window.CasorShare) CasorShare.open({ title: d.title + ' - CASOR Meeting Board', url: CasorShare.link('meeting.html', 'doc', d.id) });
    });
    function openDoc(id) {
        const d = docs.find(x => x.id === id);
        if (!d) return;
        openId = id;
        const prev = previewUrl(d.fileUrl);
        if (!prev) { window.open(d.fileUrl, '_blank', 'noopener'); return; }
        lastFocus = document.activeElement;
        document.getElementById('mbReaderTitle').textContent = d.title;
        document.getElementById('mbReaderSub').textContent = `${d.officeName || ''} · ${d.type}`;
        document.getElementById('mbReaderOpen').href = d.fileUrl;
        frame.src = prev;
        reader.hidden = false;
        document.body.style.overflow = 'hidden';
        document.getElementById('mbReaderClose').focus();
        history.pushState({ mbReader: true }, '');
    }
    function closeDoc(fromPop) {
        if (reader.hidden) return;
        reader.hidden = true;
        frame.src = 'about:blank';
        document.body.style.overflow = '';
        if (lastFocus) lastFocus.focus();
        if (!fromPop && history.state && history.state.mbReader) history.back();
    }
    document.getElementById('mbReaderClose').addEventListener('click', () => closeDoc(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDoc(false); });
    window.addEventListener('popstate', () => closeDoc(true));

    document.querySelectorAll('.mb-filters .filter-pill').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('.mb-filters .filter-pill').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        typeFilter = btn.dataset.type;
        render();
    }));
    search.addEventListener('input', render);

    if (typeof db === 'undefined') {
        statusEl.innerHTML = '';
        listEl.innerHTML = '<div class="state">The board could not load. Check your connection and refresh.</div>';
        return;
    }
    function fail(err) {
        console.error('Meeting board failed to load:', err);
        statusEl.innerHTML = '';
        listEl.innerHTML = `<div class="state"><i class="fas fa-wifi" aria-hidden="true"></i>Couldn't load the board. Check your network, then refresh.</div>`;
    }
    db.collection('meetings').where('status', '==', 'live').onSnapshot(snap => {
        meetings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        gotMeetings = true;
        render();
    }, fail);
    function normalizeKey(pw) {
        return String(pw || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    function lock(message) {
        locked = true;
        gotDocs = false;
        docs = [];
        if (message) lockMsg.textContent = message;
        render();
    }

    function subscribeDocs() {
        if (docsUnsub) docsUnsub();
        docsUnsub = db.collection('meeting_docs').where('visible', '==', true).onSnapshot(snap => {
            locked = false;
            everUnlocked = true;
            docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.addedAt?.toMillis?.() || 0) - (b.addedAt?.toMillis?.() || 0));
            gotDocs = true;
            render();
        }, err => {
            docsUnsub = null;
            if (err && err.code === 'permission-denied') {
                if (!reader.hidden) closeDoc(false);
                lock(everUnlocked ? 'The board password has changed. Enter the new one to keep reading.' : null);
            } else {
                fail(err);
            }
        });
    }

    document.getElementById('mbLockEye').addEventListener('click', () => {
        const show = lockInput.type === 'password';
        lockInput.type = show ? 'text' : 'password';
        document.getElementById('mbLockEye').innerHTML = `<i class="fas ${show ? 'fa-eye-slash' : 'fa-eye'}" aria-hidden="true"></i>`;
    });

    lockEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const key = normalizeKey(lockInput.value);
        if (!key) { lockErr.textContent = 'Type the password first.'; return; }
        lockErr.textContent = '';
        lockBtn.disabled = true;
        lockBtn.textContent = 'Checking...';
        try {
            if (!auth.currentUser) await auth.signInAnonymously();
            await db.collection('board_access').doc(auth.currentUser.uid).set({
                key, at: firebase.firestore.FieldValue.serverTimestamp()
            });
            lockInput.value = '';
            subscribeDocs();
        } catch (err) {
            if (err && err.code === 'permission-denied') lockErr.textContent = "That password isn't right. Check it and try again.";
            else if (err && /operation-not-allowed|admin-restricted/.test(err.code || '')) lockErr.textContent = "The board isn't ready for passwords yet. Please tell an admin.";
            else lockErr.textContent = "Couldn't check the password. Check your network and try again.";
        } finally {
            lockBtn.disabled = false;
            lockBtn.textContent = 'Open the board';
        }
    });

    if (typeof auth === 'undefined' || !auth) {
        lock('The board could not load. Refresh the page and try again.');
    } else {
        let firstAuth = true;
        auth.onAuthStateChanged(user => {
            if (!firstAuth) return;
            firstAuth = false;
            if (user) subscribeDocs();
            else lock();
        });
    }
})();
