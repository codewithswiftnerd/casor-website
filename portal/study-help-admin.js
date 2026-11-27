function loadStudyHelpAdmin() {
    const $ = id => document.getElementById(id);
    const esc = s => (typeof escapeHtml === 'function' ? escapeHtml(s == null ? '' : String(s)) : String(s == null ? '' : s));
    const norm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const when = ts => {
        const d = ts && ts.toDate ? ts.toDate() : null;
        return d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
    };
    const stamp = () => firebase.firestore.FieldValue.serverTimestamp();
    const me = () => (auth.currentUser && auth.currentUser.email) || '';
    const audit = (a, c, id, d) => { if (typeof logAudit === 'function') logAudit(a, c, id, d); };

    function waNumber(v) {
        let n = String(v || '').replace(/[^\d]/g, '');
        if (n.startsWith('0') && n.length === 11) n = '234' + n.slice(1);
        return n;
    }
    function waLink(number, text) {
        return 'https://wa.me/' + waNumber(number) + '?text=' + encodeURIComponent(text);
    }

    let requests = [], apps = [], tutors = [], tutorPrivate = {}, groups = [];
    let reqStatus = 'pending';

    function tutorOptions(r) {
        const want = norm(r.course);
        const active = tutors.filter(t => t.active !== false);
        const match = t => (t.courses || []).some(c => norm(c) === want || (want && norm(c).includes(want)));
        const sorted = active.slice().sort((a, b) => {
            const pa = a.id === r.preferredTutorId ? 0 : match(a) ? 1 : 2;
            const pb = b.id === r.preferredTutorId ? 0 : match(b) ? 1 : 2;
            return pa - pb || String(a.name).localeCompare(String(b.name));
        });
        if (!sorted.length) return '<option value="">No tutors yet, approve some offers first</option>';
        return '<option value="">Choose a tutor...</option>' + sorted.map(t => {
            const tag = t.id === r.preferredTutorId ? ' (asked for)' : match(t) ? ' (teaches ' + esc(r.course) + ')' : '';
            return `<option value="${esc(t.id)}">${esc(t.name)}${tag}</option>`;
        }).join('');
    }

    function studentMsg(r, t) {
        const tn = tutorPrivate[t.id] && tutorPrivate[t.id].whatsapp;
        return `Hi ${r.name}, this is the CASOR UNIPORT academic office. We've matched you with ${t.name} for ${r.course}.` +
            (tn ? ` You can reach them on WhatsApp: ${tn}.` : ' They will reach out to you.') + ' God bless your studies!';
    }
    function tutorMsg(r, t) {
        return `Hi ${t.name}, CASOR UNIPORT academic office here. ${r.name} (${[r.level, r.department].filter(Boolean).join(', ')}) needs help with ${r.course}` +
            (r.details ? `: ${r.details}` : '.') + ` Their WhatsApp: ${r.whatsapp}. Please reach out to them. Thank you for serving!`;
    }

    function renderRequests() {
        const counts = { pending: 0, matched: 0, closed: 0 };
        requests.forEach(r => { counts[r.status in counts ? r.status : 'pending']++; });
        $('shCountPending').textContent = counts.pending;
        $('shCountMatched').textContent = counts.matched;
        $('shCountClosed').textContent = counts.closed;
        const list = requests.filter(r => (r.status in counts ? r.status : 'pending') === reqStatus);
        if (!list.length) {
            $('shRequestList').innerHTML = `<p class="admin-empty">${reqStatus === 'pending' ? 'No one is waiting for a tutor right now.' : 'Nothing here yet.'}</p>`;
            return;
        }
        $('shRequestList').innerHTML = list.map(r => {
            const t = r.tutorId && tutors.find(x => x.id === r.tutorId);
            const head = `
                <div class="sh-item-head"><strong>${esc(r.name)}</strong><time>${when(r.createdAt)}</time></div>
                <p><span class="sh-course-chip">${esc(r.course)}</span>${esc([r.level, r.department].filter(Boolean).join(' · '))}</p>
                ${r.details ? `<p>${esc(r.details)}</p>` : ''}
                ${r.preferredTutorName ? `<p>Asked for: <b>${esc(r.preferredTutorName)}</b></p>` : ''}`;
            let actions;
            if ((r.status || 'pending') === 'pending') {
                actions = `
                    <select data-assign-select="${esc(r.id)}">${tutorOptions(r)}</select>
                    <button class="btn" data-assign="${esc(r.id)}">Assign</button>
                    <a class="sh-wa" href="${esc(waLink(r.whatsapp, `Hi ${r.name}, this is the CASOR UNIPORT academic office about your ${r.course} tutor request.`))}" target="_blank" rel="noopener">WhatsApp student</a>
                    <button class="btn-outline btn-danger" data-req-del="${esc(r.id)}">Delete</button>`;
            } else {
                actions = (t ? `
                    <a class="sh-wa" href="${esc(waLink(r.whatsapp, studentMsg(r, t)))}" target="_blank" rel="noopener">WhatsApp student</a>
                    ${tutorPrivate[t.id] ? `<a class="sh-wa" href="${esc(waLink(tutorPrivate[t.id].whatsapp, tutorMsg(r, t)))}" target="_blank" rel="noopener">WhatsApp tutor</a>` : ''}` : '') +
                    (r.status === 'matched'
                        ? `<button class="btn-outline" data-req-done="${esc(r.id)}">Mark done</button>
                           <button class="btn-outline" data-req-reopen="${esc(r.id)}">Change tutor</button>`
                        : `<button class="btn-outline" data-req-reopen="${esc(r.id)}">Reopen</button>`) +
                    `<button class="btn-outline btn-danger" data-req-del="${esc(r.id)}">Delete</button>`;
            }
            return `<div class="sh-item">${head}
                ${r.tutorName && r.status !== 'pending' ? `<div class="sh-matched">Tutor: ${esc(r.tutorName)}${r.matchedBy ? ` · by ${esc(r.matchedBy)}` : ''}</div>` : ''}
                <div class="sh-item-actions">${actions}</div></div>`;
        }).join('');
    }

    function renderApps() {
        $('shAppCount').textContent = apps.length;
        if (!apps.length) { $('shAppList').innerHTML = '<p class="admin-empty">No new offers.</p>'; return; }
        $('shAppList').innerHTML = apps.map(a => `
            <div class="sh-item">
                <div class="sh-item-head"><strong>${esc(a.name)}</strong><time>${when(a.createdAt)}</time></div>
                <p>${esc([a.level, a.department].filter(Boolean).join(' · '))}</p>
                <p>${String(a.courses || '').split(/[,;\n]+/).map(c => c.trim()).filter(Boolean).map(c => `<span class="sh-course-chip">${esc(c)}</span>`).join('')}</p>
                ${a.about ? `<p>${esc(a.about)}</p>` : ''}
                <div class="sh-item-actions">
                    <button class="btn" data-app-approve="${esc(a.id)}">Approve</button>
                    <a class="sh-wa" href="${esc(waLink(a.whatsapp, `Hi ${a.name}, this is the CASOR UNIPORT academic office about your offer to tutor.`))}" target="_blank" rel="noopener">WhatsApp</a>
                    <button class="btn-outline btn-danger" data-app-reject="${esc(a.id)}">Decline</button>
                </div>
            </div>`).join('');
    }

    function renderTutors() {
        if (!tutors.length) { $('shTutorList').innerHTML = '<p class="admin-empty">No tutors yet. Approve an offer above to add one.</p>'; return; }
        $('shTutorList').innerHTML = tutors.map(t => {
            const busy = requests.filter(r => r.tutorId === t.id && r.status === 'matched').length;
            const p = tutorPrivate[t.id];
            return `
            <div class="sh-item">
                <div class="sh-item-head"><strong>${esc(t.name)}${t.active === false ? '<span class="sh-hidden-tag">HIDDEN</span>' : ''}</strong><time>${busy ? busy + ' active student' + (busy > 1 ? 's' : '') : 'free'}</time></div>
                <p>${esc([t.level, t.department].filter(Boolean).join(' · '))}</p>
                <p>${(t.courses || []).map(c => `<span class="sh-course-chip">${esc(c)}</span>`).join('')}</p>
                <div class="sh-item-actions">
                    ${p ? `<a class="sh-wa" href="${esc(waLink(p.whatsapp, `Hi ${t.name}, CASOR UNIPORT academic office here.`))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
                    <button class="btn-outline" data-tutor-toggle="${esc(t.id)}">${t.active === false ? 'Show on site' : 'Hide from site'}</button>
                    <button class="btn-outline btn-danger" data-tutor-del="${esc(t.id)}">Remove</button>
                </div>
            </div>`;
        }).join('');
    }

    function renderGroups() {
        if (!groups.length) { $('shGroupList').innerHTML = '<p class="admin-empty">No study groups yet. Add one above.</p>'; return; }
        $('shGroupList').innerHTML = groups.map(g => `
            <div class="sh-item">
                <div class="sh-item-head"><strong><span class="sh-course-chip">${esc(g.course)}</span>${esc(g.title)}${g.active === false ? '<span class="sh-hidden-tag">HIDDEN</span>' : ''}</strong></div>
                <p>${esc([g.schedule, g.venue].filter(Boolean).join(' · '))}</p>
                ${g.description ? `<p>${esc(g.description)}</p>` : ''}
                <div class="sh-item-actions">
                    <button class="btn-outline" data-group-edit="${esc(g.id)}">Edit</button>
                    <button class="btn-outline" data-group-toggle="${esc(g.id)}">${g.active === false ? 'Show on site' : 'Hide from site'}</button>
                    <button class="btn-outline btn-danger" data-group-del="${esc(g.id)}">Delete</button>
                </div>
            </div>`).join('');
    }

    const sortNew = (a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
    const fail = id => err => { $(id).innerHTML = `<p class="admin-empty">Could not load: ${esc(err.message)}. Have the latest Firestore rules been published?</p>`; };

    db.collection('tutor_requests').onSnapshot(snap => {
        requests = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortNew);
        renderRequests(); renderTutors();
    }, fail('shRequestList'));
    db.collection('tutor_applications').onSnapshot(snap => {
        apps = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortNew);
        renderApps();
    }, fail('shAppList'));
    db.collection('tutors').onSnapshot(snap => {
        tutors = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
        renderTutors(); renderRequests();
    }, fail('shTutorList'));
    db.collection('tutor_private').onSnapshot(snap => {
        tutorPrivate = {};
        snap.forEach(d => { tutorPrivate[d.id] = d.data(); });
        renderTutors(); renderRequests();
    }, () => {});
    db.collection('study_groups').onSnapshot(snap => {
        groups = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.course).localeCompare(String(b.course)));
        renderGroups();
    }, fail('shGroupList'));

    $('shReqFilter').addEventListener('click', e => {
        const b = e.target.closest('[data-status]');
        if (!b) return;
        reqStatus = b.dataset.status;
        $('shReqFilter').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
        renderRequests();
    });

    async function act(btn, fn) {
        btn.disabled = true;
        try { await fn(); } catch (err) { alert('Failed: ' + err.message); btn.disabled = false; }
    }

    $('shRequestList').addEventListener('click', e => {
        const assign = e.target.closest('[data-assign]');
        if (assign) {
            const id = assign.dataset.assign;
            const sel = document.querySelector(`[data-assign-select="${CSS.escape(id)}"]`);
            const t = tutors.find(x => x.id === (sel && sel.value));
            if (!t) { alert('Choose a tutor first.'); return; }
            act(assign, async () => {
                await db.collection('tutor_requests').doc(id).update({ status: 'matched', tutorId: t.id, tutorName: t.name, matchedAt: stamp(), matchedBy: me() });
                audit('tutor.assign', 'tutor_requests', id, t.name);
                reqStatus = 'matched';
                $('shReqFilter').querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.status === 'matched'));
                renderRequests();
            });
            return;
        }
        const done = e.target.closest('[data-req-done]');
        if (done) { act(done, () => db.collection('tutor_requests').doc(done.dataset.reqDone).update({ status: 'closed', closedAt: stamp() })); return; }
        const reopen = e.target.closest('[data-req-reopen]');
        if (reopen) { act(reopen, () => db.collection('tutor_requests').doc(reopen.dataset.reqReopen).update({ status: 'pending' })); return; }
        const del = e.target.closest('[data-req-del]');
        if (del && confirm('Delete this request? The student\'s details will be removed.')) {
            act(del, async () => { await db.collection('tutor_requests').doc(del.dataset.reqDel).delete(); audit('tutor_request.delete', 'tutor_requests', del.dataset.reqDel, ''); });
        }
    });

    $('shAppList').addEventListener('click', e => {
        const ok = e.target.closest('[data-app-approve]');
        if (ok) {
            const a = apps.find(x => x.id === ok.dataset.appApprove);
            if (!a) return;
            act(ok, async () => {
                const courses = String(a.courses || '').split(/[,;\n]+/).map(c => c.trim().toUpperCase()).filter(Boolean).slice(0, 15);
                const ref = db.collection('tutors').doc();
                const batch = db.batch();
                batch.set(ref, { name: a.name, level: a.level || '', department: a.department || '', courses, about: a.about || '', active: true, createdAt: stamp(), approvedBy: me() });
                batch.set(db.collection('tutor_private').doc(ref.id), { whatsapp: a.whatsapp, name: a.name });
                batch.delete(db.collection('tutor_applications').doc(a.id));
                await batch.commit();
                audit('tutor.approve', 'tutors', ref.id, a.name);
            });
            return;
        }
        const no = e.target.closest('[data-app-reject]');
        if (no && confirm('Decline this offer? It will be deleted.')) {
            act(no, async () => { await db.collection('tutor_applications').doc(no.dataset.appReject).delete(); audit('tutor.decline', 'tutor_applications', no.dataset.appReject, ''); });
        }
    });

    $('shTutorList').addEventListener('click', e => {
        const tg = e.target.closest('[data-tutor-toggle]');
        if (tg) {
            const t = tutors.find(x => x.id === tg.dataset.tutorToggle);
            if (t) act(tg, () => db.collection('tutors').doc(t.id).update({ active: t.active === false }));
            return;
        }
        const del = e.target.closest('[data-tutor-del]');
        if (del && confirm('Remove this tutor from the list?')) {
            act(del, async () => {
                const batch = db.batch();
                batch.delete(db.collection('tutors').doc(del.dataset.tutorDel));
                batch.delete(db.collection('tutor_private').doc(del.dataset.tutorDel));
                await batch.commit();
                audit('tutor.remove', 'tutors', del.dataset.tutorDel, '');
            });
        }
    });

    const gf = {
        id: $('shGroupId'), course: $('shGroupCourse'), title: $('shGroupTitle'), schedule: $('shGroupSchedule'),
        venue: $('shGroupVenue'), link: $('shGroupLink'), desc: $('shGroupDesc'),
        save: $('shGroupSave'), cancel: $('shGroupCancel'), fb: $('shGroupFeedback')
    };
    function resetGroupForm() {
        ['id', 'course', 'title', 'schedule', 'venue', 'link', 'desc'].forEach(k => { gf[k].value = ''; });
        gf.save.textContent = 'Add group';
        gf.cancel.hidden = true;
    }
    gf.cancel.addEventListener('click', resetGroupForm);
    gf.save.addEventListener('click', async () => {
        const course = gf.course.value.trim().toUpperCase();
        const title = gf.title.value.trim();
        const link = gf.link.value.trim();
        gf.fb.style.color = '#b3261e';
        if (!course || !title) { gf.fb.textContent = 'Add the course and a group name.'; return; }
        if (link && !/^https:\/\/(chat\.whatsapp\.com|wa\.me|whatsapp\.com)\//i.test(link)) { gf.fb.textContent = 'The link must be a WhatsApp invite link (https://chat.whatsapp.com/...).'; return; }
        const data = { course, title, schedule: gf.schedule.value.trim(), venue: gf.venue.value.trim(), whatsappLink: link, description: gf.desc.value.trim(), updatedAt: stamp() };
        gf.save.disabled = true;
        try {
            if (gf.id.value) {
                await db.collection('study_groups').doc(gf.id.value).update(data);
                audit('study_group.update', 'study_groups', gf.id.value, title);
            } else {
                const ref = await db.collection('study_groups').add({ ...data, active: true, createdAt: stamp() });
                audit('study_group.create', 'study_groups', ref.id, title);
            }
            resetGroupForm();
            gf.fb.style.color = '#0B1F44';
            gf.fb.textContent = 'Saved.';
        } catch (err) {
            gf.fb.textContent = 'Failed: ' + err.message;
        } finally {
            gf.save.disabled = false;
        }
    });

    $('shGroupList').addEventListener('click', e => {
        const ed = e.target.closest('[data-group-edit]');
        if (ed) {
            const g = groups.find(x => x.id === ed.dataset.groupEdit);
            if (!g) return;
            gf.id.value = g.id; gf.course.value = g.course || ''; gf.title.value = g.title || '';
            gf.schedule.value = g.schedule || ''; gf.venue.value = g.venue || ''; gf.link.value = g.whatsappLink || ''; gf.desc.value = g.description || '';
            gf.save.textContent = 'Update group'; gf.cancel.hidden = false; gf.fb.textContent = '';
            gf.course.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        const tg = e.target.closest('[data-group-toggle]');
        if (tg) {
            const g = groups.find(x => x.id === tg.dataset.groupToggle);
            if (g) act(tg, () => db.collection('study_groups').doc(g.id).update({ active: g.active === false }));
            return;
        }
        const del = e.target.closest('[data-group-del]');
        if (del && confirm('Delete this study group?')) {
            act(del, async () => { await db.collection('study_groups').doc(del.dataset.groupDel).delete(); audit('study_group.delete', 'study_groups', del.dataset.groupDel, ''); });
        }
    });
}
