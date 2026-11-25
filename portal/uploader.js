// ============================================================
//  "UPLOAD FROM DEVICE" for every link box in the dashboard.
//
//  Next to every link field (photos, documents, reports...) this adds an
//  Upload button. Tap it, pick a file from your phone or computer, and it
//  is saved automatically to the CASOR Google Drive via the free Apps
//  Script backend (apps-script/Code.gs -> handleUploadRequest). The link
//  is then filled in for you. No Firebase Storage, no Blaze plan, and
//  nobody has to open Google Drive by hand.
//
//  Needs: APPS_SCRIPT_URL (dashboard.html) and the signed-in user.
// ============================================================
(function () {
    const MAX_BYTES = 20 * 1024 * 1024;
    const IMG_MAX_SIDE = 1800;
    const DOC_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.mp3,.m4a,.wav,.mp4';

    function looksLikeImageField(input) {
        const hint = ((input.id || '') + ' ' + (input.className || '') + ' ' + (input.placeholder || '')).toLowerCase();
        return /photo|image|img|cover|picture|slot/.test(hint) && !/report|file|document|doc\b|library|resource/.test(hint);
    }
    function kindFor(input) {
        const panel = input.closest('.panel, .modal-overlay');
        return (panel && panel.id ? panel.id.replace(/Panel|Overlay/i, '') : 'general').toLowerCase();
    }

    function toBase64(blob) {
        return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result).split(',')[1]);
            r.onerror = () => rej(new Error('Could not read the file.'));
            r.readAsDataURL(blob);
        });
    }

    // Shrinks big photos in the browser so uploads stay quick on mobile data.
    async function shrinkImage(file) {
        if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 700 * 1024) return file;
        const url = URL.createObjectURL(file);
        try {
            const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
            const scale = Math.min(1, IMG_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
            const c = document.createElement('canvas');
            c.width = Math.round(img.naturalWidth * scale);
            c.height = Math.round(img.naturalHeight * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
            if (!blob || blob.size >= file.size) return file;
            return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
        } catch (e) {
            return file;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async function upload(file, input, status) {
        if (typeof APPS_SCRIPT_URL === 'undefined' || !APPS_SCRIPT_URL || APPS_SCRIPT_URL.indexOf('PASTE_') === 0) {
            throw new Error('Uploads are not set up yet (APPS_SCRIPT_URL is missing).');
        }
        if (!auth.currentUser) throw new Error('Please sign in again.');
        const f = await shrinkImage(file);
        if (f.size > MAX_BYTES) throw new Error('That file is too big (max 20 MB).');
        status.textContent = 'Uploading...';
        const body = JSON.stringify({
            action: 'upload',
            idToken: await auth.currentUser.getIdToken(),
            fileName: f.name,
            mimeType: f.type || 'application/octet-stream',
            dataBase64: await toBase64(f),
            kind: kindFor(input)
        });
        const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
        let out;
        try { out = await res.json(); } catch (e) { throw new Error('The upload service did not answer properly. Has the new Apps Script version been deployed?'); }
        if (!out.success) throw new Error(out.error || 'Upload failed.');
        return out;
    }

    function enhance(input) {
        if (input.dataset.uploadReady) return;
        input.dataset.uploadReady = '1';
        const imageOnly = looksLikeImageField(input);

        const wrap = document.createElement('div');
        wrap.className = 'upl-row';
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = imageOnly ? 'image/*' : DOC_ACCEPT;
        picker.hidden = true;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'upl-btn';
        btn.innerHTML = '<i class="fas fa-upload" aria-hidden="true"></i> ' + (imageOnly ? 'Upload photo' : 'Upload file');
        const status = document.createElement('span');
        status.className = 'upl-status';
        status.setAttribute('role', 'status');

        input.insertAdjacentElement('afterend', wrap);
        wrap.append(btn, status, picker);
        if (!input.placeholder || /google drive/i.test(input.placeholder)) {
            input.placeholder = (imageOnly ? 'Upload a photo below, or paste a link' : 'Upload a file below, or paste a link');
        }

        btn.addEventListener('click', () => picker.click());
        picker.addEventListener('change', async () => {
            const file = picker.files && picker.files[0];
            picker.value = '';
            if (!file) return;
            btn.disabled = true;
            status.className = 'upl-status';
            try {
                const out = await upload(file, input, status);
                input.value = out.url;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                status.textContent = 'Uploaded: ' + out.name + '. Now press Save.';
                status.classList.add('ok');
            } catch (err) {
                status.textContent = err.message;
                status.classList.add('err');
            } finally {
                btn.disabled = false;
            }
        });
    }

    function scan(root) {
        (root.querySelectorAll ? root.querySelectorAll('input[type="url"]') : []).forEach(enhance);
    }
    document.addEventListener('DOMContentLoaded', () => {
        scan(document);
        new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n); })))
            .observe(document.body, { childList: true, subtree: true });
    });
})();
