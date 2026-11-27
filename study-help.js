(function () {
    const root = document.getElementById('study-help');
    if (!root) return;

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    const tabs = root.querySelectorAll('.sh-tab');
    function showTab(id, scroll) {
        tabs.forEach(t => {
            const on = t.dataset.sh === id;
            t.classList.toggle('active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        root.querySelectorAll('.sh-panel').forEach(p => {
            const on = p.id === id;
            p.hidden = !on;
            p.classList.toggle('active', on);
        });
        if (scroll) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.sh)));

    const tutorGrid = document.getElementById('tutorGrid');
    const groupGrid = document.getElementById('groupGrid');
    const tutorSearch = document.getElementById('tutorSearch');
    const groupSearch = document.getElementById('groupSearch');
    const requestForm = document.getElementById('tutorRequestForm');
    const applyForm = document.getElementById('tutorApplyForm');
    const prefNote = document.getElementById('tutorPrefNote');

    let tutors = [], groups = [], preferred = null;

    function renderTutors() {
        const q = norm(tutorSearch.value);
        const list = tutors.filter(t => !q || (t.courses || []).some(c => norm(c).includes(q)) || norm(t.department).includes(q));
        if (!tutors.length) {
            tutorGrid.innerHTML = '<p class="sh-empty">No tutors listed yet. Send a request below and the academic office will find someone for you.</p>';
            return;
        }
        if (!list.length) {
            tutorGrid.innerHTML = '<p class="sh-empty">No tutor listed for that course yet. Send a request below anyway; the academic office can still find someone.</p>';
            return;
        }
        tutorGrid.innerHTML = list.map(t => `
            <article class="sh-card">
                <div class="sh-card-top">
                    <span class="sh-avatar" aria-hidden="true">${esc((t.name || '?').trim().charAt(0).toUpperCase())}</span>
                    <div>
                        <h4>${esc(t.name)}</h4>
                        <p class="sh-meta">${esc([t.level, t.department].filter(Boolean).join(' · '))}</p>
                    </div>
                </div>
                <div class="sh-chips">${(t.courses || []).map(c => `<span>${esc(c)}</span>`).join('')}</div>
                ${t.about ? `<p class="sh-about">${esc(t.about)}</p>` : ''}
                <button type="button" class="btn-pill ghost sh-ask" data-tutor-id="${esc(t.id)}">Ask for ${esc(String(t.name || '').split(' ')[0])}</button>
            </article>`).join('');
    }

    function renderGroups() {
        const q = norm(groupSearch.value);
        const list = groups.filter(g => !q || norm(g.course).includes(q) || norm(g.title).includes(q));
        if (!groups.length) {
            groupGrid.innerHTML = '<p class="sh-empty">No study groups yet. Check back soon, or ask the academic office to start one for your course.</p>';
            return;
        }
        if (!list.length) {
            groupGrid.innerHTML = '<p class="sh-empty">No group for that course yet.</p>';
            return;
        }
        groupGrid.innerHTML = list.map(g => `
            <article class="sh-card sh-group" id="group-${esc(g.id)}">
                <span class="sh-course">${esc(g.course)}</span>
                <h4>${esc(g.title)}</h4>
                <ul class="sh-facts">
                    ${g.schedule ? `<li><i class="fas fa-clock" aria-hidden="true"></i>${esc(g.schedule)}</li>` : ''}
                    ${g.venue ? `<li><i class="fas fa-location-dot" aria-hidden="true"></i>${esc(g.venue)}</li>` : ''}
                </ul>
                ${g.description ? `<p class="sh-about">${esc(g.description)}</p>` : ''}
                <div class="sh-actions">
                    ${g.whatsappLink ? `<a class="btn-pill sh-join" href="${esc(g.whatsappLink)}" target="_blank" rel="noopener"><i class="fab fa-whatsapp" aria-hidden="true"></i> Join on WhatsApp</a>` : ''}
                    ${window.CasorShare ? CasorShare.button('library.html', 'group', g.id, `${g.title} (${g.course}) - CASOR study group`, '', 'icon-only') : ''}
                </div>
            </article>`).join('');
    }

    tutorSearch.addEventListener('input', renderTutors);
    groupSearch.addEventListener('input', renderGroups);

    tutorGrid.addEventListener('click', e => {
        const btn = e.target.closest('[data-tutor-id]');
        if (!btn) return;
        const t = tutors.find(x => x.id === btn.dataset.tutorId);
        if (!t) return;
        preferred = t;
        prefNote.hidden = false;
        prefNote.innerHTML = `You asked for <b>${esc(t.name)}</b>. <button type="button" class="sh-link" id="clearPref">Any tutor is fine</button>`;
        const courseInput = requestForm.elements.course;
        const q = tutorSearch.value.trim();
        if (!courseInput.value && q) courseInput.value = q.toUpperCase();
        requestForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => requestForm.elements.name.focus({ preventScroll: true }), 400);
    });
    prefNote.addEventListener('click', e => {
        if (e.target.id !== 'clearPref') return;
        preferred = null;
        prefNote.hidden = true;
    });

    function cleanPhone(v) {
        return String(v || '').replace(/[^\d+]/g, '');
    }

    function validate(form, fields) {
        for (const f of fields) {
            const el = form.elements[f];
            if (!el.value.trim()) { el.focus(); return 'Please fill in every field marked above.'; }
        }
        const phone = cleanPhone(form.elements.whatsapp.value);
        if (phone.replace('+', '').length < 10 || phone.length > 16) {
            form.elements.whatsapp.focus();
            return 'Enter a valid WhatsApp number.';
        }
        return '';
    }

    function setMsg(form, text, ok) {
        const m = form.querySelector('.sh-msg');
        m.textContent = text;
        m.classList.toggle('ok', !!ok);
    }

    function cooldown(key) {
        try {
            const last = Number(localStorage.getItem(key) || 0);
            if (Date.now() - last < 60 * 1000) return true;
            localStorage.setItem(key, String(Date.now()));
        } catch (e) {}
        return false;
    }

    async function submit(form, collection, data, okText, key) {
        const btn = form.querySelector('button[type="submit"]');
        if (cooldown(key)) { setMsg(form, 'You just sent one. Please wait a minute before sending another.'); return; }
        btn.disabled = true;
        const label = btn.textContent;
        btn.textContent = 'Sending...';
        try {
            await db.collection(collection).add({ ...data, status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            form.reset();
            setMsg(form, okText, true);
            return true;
        } catch (err) {
            try { localStorage.removeItem(key); } catch (e) {}
            setMsg(form, "Couldn't send. Check your network and try again.");
            return false;
        } finally {
            btn.disabled = false;
            btn.textContent = label;
        }
    }

    requestForm.addEventListener('submit', async e => {
        e.preventDefault();
        const err = validate(requestForm, ['name', 'level', 'department', 'course', 'whatsapp']);
        if (err) { setMsg(requestForm, err); return; }
        const f = requestForm.elements;
        const data = {
            name: f.name.value.trim(),
            level: f.level.value,
            department: f.department.value.trim(),
            course: f.course.value.trim().toUpperCase(),
            details: f.details.value.trim(),
            whatsapp: cleanPhone(f.whatsapp.value)
        };
        if (preferred) { data.preferredTutorId = preferred.id; data.preferredTutorName = preferred.name; }
        const ok = await submit(requestForm, 'tutor_requests', data,
            "Request sent! The academic office will message you on WhatsApp once they've matched you with a tutor.", 'casorTutorReq');
        if (ok) { preferred = null; prefNote.hidden = true; }
    });

    applyForm.addEventListener('submit', async e => {
        e.preventDefault();
        const err = validate(applyForm, ['name', 'level', 'department', 'courses', 'whatsapp']);
        if (err) { setMsg(applyForm, err); return; }
        const f = applyForm.elements;
        await submit(applyForm, 'tutor_applications', {
            name: f.name.value.trim(),
            level: f.level.value,
            department: f.department.value.trim(),
            courses: f.courses.value.trim(),
            about: f.about.value.trim(),
            whatsapp: cleanPhone(f.whatsapp.value)
        }, 'Thank you! The academic office will review your offer and reach out on WhatsApp.', 'casorTutorApply');
    });

    function openFromLink() {
        const params = new URLSearchParams(location.search);
        const groupId = params.get('group');
        const hash = location.hash.replace('#', '');
        if (groupId || hash === 'study-groups') {
            showTab('shGroups', true);
            if (groupId && window.CasorShare) {
                const el = document.getElementById('group-' + groupId);
                if (el) CasorShare.flash(el);
            }
        } else if (hash === 'become-a-tutor') {
            showTab('shBecome', true);
        } else if (hash === 'study-help' || hash === 'get-a-tutor') {
            showTab('shTutor', true);
        }
    }

    if (typeof db === 'undefined' || !db) {
        tutorGrid.innerHTML = groupGrid.innerHTML = '<p class="sh-empty">Could not connect. Refresh the page to try again.</p>';
        return;
    }

    db.collection('tutors').where('active', '==', true).onSnapshot(snap => {
        tutors = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => String(a.name).localeCompare(String(b.name)));
        renderTutors();
    }, () => { tutorGrid.innerHTML = '<p class="sh-empty">Tutors could not load right now.</p>'; });

    let linkHandled = false;
    db.collection('study_groups').where('active', '==', true).onSnapshot(snap => {
        groups = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => String(a.course).localeCompare(String(b.course)));
        renderGroups();
        if (!linkHandled) { linkHandled = true; openFromLink(); }
    }, () => {
        groupGrid.innerHTML = '<p class="sh-empty">Study groups could not load right now.</p>';
        if (!linkHandled) { linkHandled = true; openFromLink(); }
    });
})();
