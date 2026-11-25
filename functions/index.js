
const crypto = require('crypto');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const nodemailer = require('nodemailer');

initializeApp();

const GMAIL_USER = defineSecret('GMAIL_USER');
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');

const ADMIN_EMAIL = 'igrie318@gmail.com';
const SITE_URL = 'https://casoruniport.netlify.app';
const BOOTSTRAP_ADMIN_EMAILS = ['igrie318@gmail.com'];

const TOKEN_TTL_HOURS = 72;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

const OFFICE_IDS = [
    'president', 'vice-president', 'general-secretary', 'asst-general-secretary',
    'financial-secretary', 'treasurer', 'organizing-secretary', 'asst-organizing-secretary',
    'brothers-leader', 'brothers-welfare-secretary', 'sisters-leader', 'sisters-welfare-secretary',
    'publicity-secretary', 'asst-publicity-secretary', 'public-relations-officer',
    'press-academic-secretary', 'asst-press-academic-secretary', 'followup-secretary',
    'asst-followup-secretary', 'bible-study-secretary', 'asst-bible-study-secretary',
    'evangelism-secretary', 'asst-evangelism-secretary', 'outreach-secretary',
    'asst-outreach-secretary', 'shalom-leader', 'asst-shalom-leader', 'drama-leader',
    'asst-drama-leader', 'prayer-secretary', 'asst-prayer-secretary',
    'male-hostel-coordinator', 'female-hostel-coordinator'
];

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

async function writeAudit(entry) {
    try {
        await getFirestore().collection('audit_logs').add({
            ...entry,
            at: FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error('audit log write failed', err);
    }
}

async function callerIsAdmin(request) {
    if (!request.auth) return false;
    const token = request.auth.token || {};
    if (token.email_verified !== true) return false;
    if (token.email && BOOTSTRAP_ADMIN_EMAILS.includes(token.email)) return true;
    const doc = await getFirestore().collection('excos').doc(request.auth.uid).get();
    if (!doc.exists) return false;
    const data = doc.data();
    return data.status === 'approved' && data.role === 'admin';
}

async function enforceRateLimit(key) {
    const ref = getFirestore().collection('rate_limits').doc(key);
    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const now = Date.now();
        let { windowStart = now, count = 0 } = snap.exists ? snap.data() : {};
        if (now - windowStart > RATE_LIMIT_WINDOW_MS) { windowStart = now; count = 0; }
        if (count >= RATE_LIMIT_MAX) {
            throw new HttpsError('resource-exhausted', 'Too many requests. Please wait a few minutes and try again.');
        }
        tx.set(ref, { windowStart, count: count + 1 });
    });
}

exports.notifyAdminOnSignup = onDocumentCreated(
    { document: 'excos/{uid}', secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] },
    async (event) => {
        const data = event.data && event.data.data();
        if (!data || data.status !== 'pending') return;

        const uid = event.params.uid;
        const db = getFirestore();
        const token = crypto.randomBytes(32).toString('hex');

        await db.collection('approval_tokens').doc(uid).set({
            hash: sha256(token),
            used: false,
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: Timestamp.fromMillis(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000)
        });

        const reviewUrl = `${SITE_URL}/portal/approve.html?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;
        const requested = data.requestedOffice ? escapeHtml(data.requestedOffice) : '(not given)';

        const html = `
            <p>A new EXCO Portal signup is waiting for review.</p>
            <p><strong>Name:</strong> ${escapeHtml(data.name || '(not given)')}<br>
               <strong>Email:</strong> ${escapeHtml(data.email || '(unknown)')}<br>
               <strong>Requested position:</strong> ${requested}</p>
            <p style="margin:24px 0;">
                <a href="${reviewUrl}"
                   style="background:#0B1F44;color:#fff;padding:12px 22px;border-radius:12px;
                          text-decoration:none;font-weight:bold;">
                   Review this signup
                </a>
            </p>
            <p style="color:#888;font-size:12px;">
                Opening this link does not approve anyone. You will be asked to sign in as an
                admin and confirm. The link expires in ${TOKEN_TTL_HOURS} hours and works once.
                You can always approve from the dashboard's Approvals tab instead.
            </p>`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: GMAIL_USER.value(), pass: GMAIL_APP_PASSWORD.value() }
        });
        await transporter.sendMail({
            from: `"CASOR EXCO Portal" <${GMAIL_USER.value()}>`,
            to: ADMIN_EMAIL,
            subject: `Review signup: ${data.name || data.email} - CASOR EXCO Portal`,
            html
        });
    }
);

exports.reviewSignup = onCall(async (request) => {
    if (!(await callerIsAdmin(request))) {
        throw new HttpsError('permission-denied', 'Only a signed-in, verified admin can review signups.');
    }
    await enforceRateLimit(`review_${request.auth.uid}`);

    const { uid, token, decision, role, office } = request.data || {};
    if (!uid || typeof uid !== 'string') throw new HttpsError('invalid-argument', 'Missing applicant id.');
    if (!['approve', 'reject'].includes(decision)) throw new HttpsError('invalid-argument', 'Decision must be approve or reject.');
    if (decision === 'approve' && !['exco', 'admin'].includes(role)) throw new HttpsError('invalid-argument', 'Role must be exco or admin.');
    if (office && !OFFICE_IDS.includes(office)) throw new HttpsError('invalid-argument', 'Unknown office.');
    if (uid === request.auth.uid) throw new HttpsError('failed-precondition', "You can't review your own account.");

    const db = getFirestore();
    const excoRef = db.collection('excos').doc(uid);
    const tokenRef = db.collection('approval_tokens').doc(uid);

    const result = await db.runTransaction(async (tx) => {
        const [excoSnap, tokenSnap] = await Promise.all([tx.get(excoRef), tx.get(tokenRef)]);
        if (!excoSnap.exists) throw new HttpsError('not-found', 'This signup no longer exists.');
        const exco = excoSnap.data();
        if (exco.status !== 'pending') {
            throw new HttpsError('already-exists', `This signup was already ${exco.status}.`);
        }

        if (token) {
            if (!tokenSnap.exists) throw new HttpsError('permission-denied', 'This review link is not valid.');
            const t = tokenSnap.data();
            if (t.used) throw new HttpsError('permission-denied', 'This review link has already been used.');
            if (t.expiresAt && t.expiresAt.toMillis() < Date.now()) {
                throw new HttpsError('deadline-exceeded', 'This review link has expired. Use the dashboard instead.');
            }
            const a = Buffer.from(sha256(token)), b = Buffer.from(String(t.hash || ''));
            if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
                throw new HttpsError('permission-denied', 'This review link is not valid.');
            }
        }

        const update = decision === 'approve'
            ? { status: 'approved', role, ...(office ? { office } : {}) }
            : { status: 'rejected' };
        tx.update(excoRef, {
            ...update,
            reviewedBy: request.auth.token.email || request.auth.uid,
            reviewedAt: FieldValue.serverTimestamp(),
            approveToken: FieldValue.delete()
        });
        if (tokenSnap.exists) tx.update(tokenRef, { used: true, usedAt: FieldValue.serverTimestamp() });
        return { email: exco.email, name: exco.name };
    });

    await writeAudit({
        actorUid: request.auth.uid,
        actorEmail: request.auth.token.email || null,
        action: decision === 'approve' ? `signup.approve.${role}` : 'signup.reject',
        collection: 'excos',
        targetId: uid,
        details: `${result.name || ''} <${result.email || ''}>${office ? ' office=' + office : ''}`.slice(0, 500)
    });

    return { success: true, decision, email: result.email };
});

exports.approveSignup = onRequest((req, res) => {
    const uid = typeof req.query.uid === 'string' ? req.query.uid : '';
    res.redirect(302, `${SITE_URL}/portal/approve.html${uid ? '?uid=' + encodeURIComponent(uid) : ''}`);
});

exports.deleteExco = onCall(async (request) => {
    if (!(await callerIsAdmin(request))) {
        throw new HttpsError('permission-denied', 'Only admins can remove EXCOs.');
    }
    await enforceRateLimit(`delete_${request.auth.uid}`);

    const uid = request.data && request.data.uid;
    if (!uid || typeof uid !== 'string') throw new HttpsError('invalid-argument', 'Missing uid.');
    if (uid === request.auth.uid) {
        throw new HttpsError('failed-precondition', "You can't remove your own account. Ask another admin.");
    }

    const db = getFirestore();
    const snap = await db.collection('excos').doc(uid).get();
    const before = snap.exists ? snap.data() : {};
    await db.collection('excos').doc(uid).delete();
    await db.collection('approval_tokens').doc(uid).delete().catch(() => {});
    try {
        await getAuth().deleteUser(uid);
    } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err;
    }

    await writeAudit({
        actorUid: request.auth.uid,
        actorEmail: request.auth.token.email || null,
        action: 'exco.remove',
        collection: 'excos',
        targetId: uid,
        details: `${before.name || ''} <${before.email || ''}>`.slice(0, 500)
    });
    return { success: true };
});
