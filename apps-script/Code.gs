/**
 * ============================================================
 * CASOR NEWSLETTER SENDER - Google Apps Script version.
 *
 * WHY THIS EXISTS: sending a newsletter needs *something* running on
 * a server, not just in the visitor's browser - otherwise your Brevo
 * API key would have to sit in public JavaScript anyone can view.
 * Firebase Cloud Functions is the normal way to do that, but it only
 * deploys on the paid Blaze plan (even at zero usage, it needs a
 * billing card on file). Apps Script is Google's other option for
 * "run a bit of server code" and it's genuinely free forever, no card
 * needed at all - so this file does the same job Cloud Functions
 * would have.
 *
 * WHAT IT DOES: receives a POST from the dashboard's Compose
 * Newsletter tab, checks the request is really from a logged-in
 * CASOR admin, then calls Brevo's API to send the email to each
 * subscriber. It never touches Firestore - the dashboard already has
 * the subscriber list (it's an admin, so it can read it) and writes
 * the newsletter history entry itself right after this script
 * reports back success/failure counts.
 *
 * THIS FILE ALSO SENDS WEB PUSH NOTIFICATIONS now (same free
 * approach, same reasoning - see the "WEB PUSH NOTIFICATIONS" block
 * near the bottom of this file for that half, including its own
 * setup steps).
 *
 * SETUP:
 * 1. Go to script.google.com -> New project.
 * 2. Delete the placeholder code, paste in this whole file.
 * 3. Click the gear icon (Project Settings) -> Script Properties ->
 *    add two properties:
 *      BREVO_API_KEY     = your Brevo API key (Brevo dashboard ->
 *                           profile -> "SMTP & API" -> "API Keys" tab
 *                           -> Generate a new API key. This is
 *                           DIFFERENT from the SMTP key/login - Apps
 *                           Script uses Brevo's HTTP API, not SMTP.)
 *      ADMIN_EMAILS       = comma-separated list of exactly the
 *                           email addresses allowed to send a
 *                           newsletter, e.g.
 *                           "igrie318@gmail.com,otheradmin@gmail.com"
 *                           (must match the email each admin actually
 *                           logs into the dashboard with)
 * 4. Deploy -> New deployment -> type "Web app".
 *      Execute as: Me
 *      Who has access: Anyone
 *    Click Deploy, authorize when asked, then copy the URL it gives
 *    you (ends in /exec).
 * 5. Paste that URL into APPS_SCRIPT_URL near the top of
 *    portal/dashboard.html's <script> section.
 * 6. Whenever you edit this file again, you must create a NEW
 *    deployment (Deploy -> Manage deployments -> pencil icon -> New
 *    version) for the change to actually take effect - saving alone
 *    isn't enough.
 * ============================================================
 */

const FIREBASE_WEB_API_KEY = 'AIzaSyAiACEdrFknfxa43WNubTV8A96YaNKgeyc'; // from portal/firebase-config.js - this one is meant to be public, it's not a secret
const SITE_URL = 'https://casoruniport.netlify.app'; // no trailing slash - used to build each unsubscribe link (from the site's canonical URL; change if you move to a custom domain)
const FROM_NAME = 'CASOR UNIPORT';
const FROM_EMAIL = 'casoruniportarchive@gmail.com'; // must be a "verified sender" in your Brevo account (Brevo -> Senders) before sending will work

function doPost(e) {
    let payload;
    try {
        payload = JSON.parse(e.postData.contents);
    } catch (err) {
        return jsonResponse({ success: false, error: 'Bad request body.' });
    }

    // Two jobs share this one Web App URL now: the newsletter (below)
    // and web push notifications (see handlePushRequest near the
    // bottom of this file). The dashboard tells us which one it wants
    // via payload.action - default (no action, or action !== 'push')
    // stays the newsletter, so nothing about the existing newsletter
    // call from dashboard.html needs to change.
    if (payload.action === 'push') {
        return handlePushRequest(payload);
    }
    if (payload.action === 'upload') {
        return handleUploadRequest(payload);
    }
    return handleNewsletterRequest(payload);
}

function handleNewsletterRequest(payload) {
    const { idToken, subject, title, content, imageUrl, ctaText, ctaLink, subscribers } = payload;

    if (!idToken) {
        return jsonResponse({ success: false, error: 'Not signed in.' });
    }

    const callerEmail = verifyFirebaseIdToken(idToken);
    if (!callerEmail) {
        return jsonResponse({ success: false, error: 'Your session has expired - please log in again.' });
    }

    const adminEmails = getAdminEmails();
    if (adminEmails.indexOf(callerEmail.toLowerCase()) === -1) {
        return jsonResponse({ success: false, error: 'Only CASOR admins can send a newsletter.' });
    }

    if (!subject || !title || !content) {
        return jsonResponse({ success: false, error: 'Subject, title and content are required.' });
    }
    if (!Array.isArray(subscribers) || subscribers.length === 0) {
        return jsonResponse({ success: true, recipientCount: 0, failedCount: 0 });
    }

    const brevoApiKey = PropertiesService.getScriptProperties().getProperty('BREVO_API_KEY');
    if (!brevoApiKey) {
        return jsonResponse({ success: false, error: 'BREVO_API_KEY is not set in Script Properties yet.' });
    }

    let sent = 0;
    let failed = 0;

    subscribers.forEach(function (sub) {
        const email = sub && sub.email;
        const token = (sub && sub.unsubscribeToken) || '';
        if (!email) { failed += 1; return; }

        const unsubscribeUrl = SITE_URL + '/unsubscribe.html?email=' + encodeURIComponent(email) + '&token=' + encodeURIComponent(token);
        const html = buildNewsletterHtml({ title: title, content: content, imageUrl: imageUrl, ctaText: ctaText, ctaLink: ctaLink, unsubscribeUrl: unsubscribeUrl });

        const ok = sendViaBrevo({
            apiKey: brevoApiKey,
            toEmail: email,
            subject: subject,
            html: html
        });

        if (ok) sent += 1; else failed += 1;
    });

    return jsonResponse({ success: true, recipientCount: sent, failedCount: failed });
}

/** Rejects anything that isn't a genuinely valid, unexpired Firebase sign-in for this project. Returns the verified email, or null. */
function verifyFirebaseIdToken(idToken) {
    const url = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_WEB_API_KEY;
    try {
        const response = UrlFetchApp.fetch(url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({ idToken: idToken }),
            muteHttpExceptions: true
        });
        const data = JSON.parse(response.getContentText());
        // Only trust VERIFIED emails - otherwise someone could register an
        // admin's address before they do and pass the ADMIN_EMAILS check.
        if (data.users && data.users[0] && data.users[0].email && data.users[0].emailVerified === true) {
            return data.users[0].email;
        }
    } catch (err) {
        // falls through to return null below
    }
    return null;
}

function getAdminEmails() {
    const raw = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '';
    return raw.split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
}

function sendViaBrevo(opts) {
    const url = 'https://api.brevo.com/v3/smtp/email';
    const body = {
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: opts.toEmail }],
        subject: opts.subject,
        htmlContent: opts.html
    };
    try {
        const response = UrlFetchApp.fetch(url, {
            method: 'post',
            contentType: 'application/json',
            headers: { 'api-key': opts.apiKey },
            payload: JSON.stringify(body),
            muteHttpExceptions: true
        });
        const code = response.getResponseCode();
        return code >= 200 && code < 300;
    } catch (err) {
        return false;
    }
}

function buildNewsletterHtml(opts) {
    const imageBlock = opts.imageUrl
        ? '<img src="' + escapeHtml_(opts.imageUrl) + '" alt="" style="max-width:100%;border-radius:6px;margin-bottom:20px;">'
        : '';
    const ctaBlock = (opts.ctaText && opts.ctaLink)
        ? '<p style="margin:28px 0;"><a href="' + escapeHtml_(opts.ctaLink) + '" ' +
          'style="background:#FFC72C;color:#0B1F44;padding:12px 24px;border-radius:4px;' +
          'text-decoration:none;font-weight:bold;display:inline-block;">' + escapeHtml_(opts.ctaText) + '</a></p>'
        : '';
    const contentHtml = escapeHtml_(opts.content).replace(/\n/g, '<br>');

    return '' +
        '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222;">' +
        '  <div style="background:#0B1F44;padding:24px 32px;text-align:center;">' +
        '    <h1 style="color:#FFC72C;margin:0;font-size:20px;letter-spacing:1px;">CASOR UNIPORT</h1>' +
        '  </div>' +
        '  <div style="padding:32px;background:#fff;">' +
        '    <h2 style="color:#0B1F44;margin-top:0;">' + escapeHtml_(opts.title) + '</h2>' +
        imageBlock +
        '    <div style="font-size:15px;line-height:1.7;">' + contentHtml + '</div>' +
        ctaBlock +
        '  </div>' +
        '  <div style="background:#F7F3E8;padding:20px 32px;text-align:center;font-size:12px;color:#777;">' +
        '    <p>You are receiving this because you subscribed to CASOR UNIPORT updates.</p>' +
        '    <p><a href="' + escapeHtml_(opts.unsubscribeUrl) + '" style="color:#777;">Unsubscribe</a></p>' +
        '  </div>' +
        '</div>';
}

function escapeHtml_(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function jsonResponse(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * ============================================================
 * WEB PUSH NOTIFICATIONS - Google Apps Script version.
 *
 * WHY THIS EXISTS: same reasoning as the newsletter above. Sending a
 * push needs Firebase's private service-account credentials, which
 * can never sit in browser JS - normally that means Cloud Functions,
 * but those require the paid Blaze plan just to deploy, even at zero
 * usage. This reuses the same free Apps Script Web App instead.
 *
 * WHEN IT RUNS: called directly from portal/dashboard.html the
 * instant a NEW News post or Statutory Program is saved (not on
 * edits) - not on a timer, so there's no Firestore trigger needed
 * (Apps Script has no equivalent of one anyway).
 *
 * SETUP:
 * 1. Firebase Console -> Project Settings -> Service Accounts ->
 *    Generate new private key. This downloads a JSON file - open it,
 *    copy its ENTIRE contents.
 * 2. Script Properties (same place as BREVO_API_KEY / ADMIN_EMAILS
 *    above) -> add a property:
 *      FCM_SERVICE_ACCOUNT_JSON = <paste the whole JSON file content>
 * 3. Create a NEW deployment version (Deploy -> Manage deployments ->
 *    pencil icon -> New version) so this code actually goes live -
 *    the same URL already pasted into dashboard.html's APPS_SCRIPT_URL
 *    keeps working, nothing to change there.
 * 4. In Firestore rules, change push_subscribers' `allow read: if
 *    false;` to `allow read: if isAdmin();` and redeploy rules -
 *    dashboard.html needs to read the subscriber token list to pass
 *    along here. See the updated rules block in SETUP-GUIDE.md.
 * ============================================================
 */

/** Exchanges the service account's private key for a short-lived FCM OAuth token, by hand-signing a JWT - no external library needed. */
function getFcmAccessToken() {
    const raw = PropertiesService.getScriptProperties().getProperty('FCM_SERVICE_ACCOUNT_JSON');
    if (!raw) {
        throw new Error('FCM_SERVICE_ACCOUNT_JSON is not set in Script Properties yet.');
    }
    const sa = JSON.parse(raw);
    const now = Math.floor(Date.now() / 1000);

    const base64url = (obj) => Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    };
    const toSign = base64url(header) + '.' + base64url(claimSet);
    const signatureBytes = Utilities.computeRsaSha256Signature(toSign, sa.private_key);
    const signature = Utilities.base64EncodeWebSafe(signatureBytes).replace(/=+$/, '');
    const jwt = toSign + '.' + signature;

    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
        method: 'post',
        contentType: 'application/x-www-form-urlencoded',
        payload: {
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        },
        muteHttpExceptions: true
    });
    const data = JSON.parse(response.getContentText());
    if (!data.access_token) {
        throw new Error('Could not get an FCM access token: ' + response.getContentText());
    }
    return { token: data.access_token, projectId: sa.project_id };
}

/**
 * Sends one push per token via FCM's HTTP v1 API and reports back
 * which tokens are dead (uninstalled / permission revoked) so
 * dashboard.html can prune them from push_subscribers.
 */
function handlePushRequest(payload) {
    const { idToken, title, body, link, tokens } = payload;

    if (!idToken) {
        return jsonResponse({ success: false, error: 'Not signed in.' });
    }
    const callerEmail = verifyFirebaseIdToken(idToken);
    if (!callerEmail) {
        return jsonResponse({ success: false, error: 'Your session has expired - please log in again.' });
    }

    // Same admin gate as handleNewsletterRequest above. Without this,
    // ANY signed-in Firebase user - including someone who just self-
    // registered on signup.html a moment ago, unverified and
    // unapproved - could call this Web App URL directly (it's public,
    // "Who has access: Anyone") and push an arbitrary title/body/link
    // notification to every subscribed device. Sending push is an
    // admin-only action in the dashboard's UI; it must also be
    // admin-only here, since the UI can't enforce anything once
    // someone calls this URL themselves.
    const adminEmails = getAdminEmails();
    if (adminEmails.indexOf(callerEmail.toLowerCase()) === -1) {
        return jsonResponse({ success: false, error: 'Only CASOR admins can send push notifications.' });
    }

    if (!title || !Array.isArray(tokens) || tokens.length === 0) {
        return jsonResponse({ success: true, sentCount: 0, deadTokens: [] });
    }

    let accessToken, projectId;
    try {
        const auth = getFcmAccessToken();
        accessToken = auth.token;
        projectId = auth.projectId;
    } catch (err) {
        return jsonResponse({ success: false, error: err.message });
    }

    const url = 'https://fcm.googleapis.com/v1/projects/' + projectId + '/messages:send';
    let sent = 0;
    const deadTokens = [];

    tokens.forEach(function (t) {
        const message = {
            message: {
                token: t,
                notification: { title: title, body: body || '' },
                webpush: { fcm_options: { link: link || 'https://casoruniport.netlify.app/' } }
            }
        };
        try {
            const response = UrlFetchApp.fetch(url, {
                method: 'post',
                contentType: 'application/json',
                headers: { Authorization: 'Bearer ' + accessToken },
                payload: JSON.stringify(message),
                muteHttpExceptions: true
            });
            const code = response.getResponseCode();
            if (code >= 200 && code < 300) {
                sent += 1;
            } else {
                const errText = response.getContentText();
                if (errText.indexOf('UNREGISTERED') !== -1
                    || errText.indexOf('NOT_FOUND') !== -1
                    || errText.indexOf('INVALID_ARGUMENT') !== -1) {
                    deadTokens.push(t);
                }
            }
        } catch (err) {
            // Network hiccup on this one token - leave it alone rather
            // than treating a transient failure as a dead token.
        }
    });

    return jsonResponse({ success: true, sentCount: sent, deadTokens: deadTokens });
}


/**
 * ============================================================
 * FILE UPLOADS (free - no Firebase Storage / Blaze plan needed)
 *
 * The dashboard's "Upload from device" buttons send the chosen file here.
 * This script saves it into a "CASOR Website Uploads" folder in the
 * Google Drive of the account that deployed this script, makes it
 * viewable by anyone with the link, and returns a link the website can
 * use straight away. Nobody has to open Google Drive by hand.
 *
 * Who may upload: a signed-in, email-verified user who is either in
 * ADMIN_EMAILS or has an APPROVED excos/{uid} record in Firestore. The
 * approval check reads Firestore with the user's own ID token, so the
 * normal security rules decide - no extra secret needed.
 *
 * Limits: about 20 MB per file (images are shrunk in the browser first).
 * Google Drive gives 15 GB free per Google account.
 *
 * SETUP: after pasting this file, Deploy -> Manage deployments -> edit ->
 * New version, and accept the new Google Drive permission when asked.
 * ============================================================
 */
const FIREBASE_PROJECT_ID = 'casorwebsite';
const UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
const UPLOAD_ALLOWED = /^(image\/(jpeg|png|webp|gif)|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|application\/vnd\.ms-(excel|powerpoint)|text\/plain|audio\/(mpeg|mp4|x-m4a|aac|wav)|video\/mp4)$/;

function lookupFirebaseUser_(idToken) {
    try {
        const res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_WEB_API_KEY, {
            method: 'post', contentType: 'application/json',
            payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
        });
        const u = (JSON.parse(res.getContentText()).users || [])[0];
        if (u && u.email && u.emailVerified === true) return u;
    } catch (err) {}
    return null;
}

function isApprovedExco_(uid, idToken) {
    try {
        const url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID +
            '/databases/(default)/documents/excos/' + encodeURIComponent(uid);
        const res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + idToken }, muteHttpExceptions: true });
        if (res.getResponseCode() !== 200) return false;
        const f = JSON.parse(res.getContentText()).fields || {};
        return f.status && f.status.stringValue === 'approved';
    } catch (err) {
        return false;
    }
}

function uploadFolder_(kind) {
    const rootName = 'CASOR Website Uploads';
    const roots = DriveApp.getFoldersByName(rootName);
    const root = roots.hasNext() ? roots.next() : DriveApp.createFolder(rootName);
    const sub = String(kind || 'general').replace(/[^a-z0-9-]/gi, '').slice(0, 30) || 'general';
    const subs = root.getFoldersByName(sub);
    return subs.hasNext() ? subs.next() : root.createFolder(sub);
}

function handleUploadRequest(payload) {
    const { idToken, fileName, mimeType, dataBase64, kind } = payload;
    if (!idToken) return jsonResponse({ success: false, error: 'Not signed in.' });
    const user = lookupFirebaseUser_(idToken);
    if (!user) return jsonResponse({ success: false, error: 'Your session has expired - please log in again.' });

    const isAdmin = getAdminEmails().indexOf(String(user.email).toLowerCase()) !== -1;
    if (!isAdmin && !isApprovedExco_(user.localId, idToken)) {
        return jsonResponse({ success: false, error: 'Only approved CASOR EXCOs can upload files.' });
    }
    if (!dataBase64 || !mimeType || !UPLOAD_ALLOWED.test(mimeType)) {
        return jsonResponse({ success: false, error: 'That file type isn\'t allowed. Use a photo, PDF, Word, Excel, PowerPoint, audio or MP4 file.' });
    }
    const bytes = Utilities.base64Decode(dataBase64);
    if (bytes.length > UPLOAD_MAX_BYTES) {
        return jsonResponse({ success: false, error: 'That file is too big (max 20 MB).' });
    }
    const safeName = String(fileName || 'upload').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120);
    const stamp = Utilities.formatDate(new Date(), 'Africa/Lagos', 'yyyyMMdd-HHmmss');
    const file = uploadFolder_(kind).createFile(Utilities.newBlob(bytes, mimeType, stamp + '_' + safeName));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    file.setDescription('Uploaded by ' + user.email + ' via the CASOR dashboard');
    const id = file.getId();
    const isImage = mimeType.indexOf('image/') === 0;
    return jsonResponse({
        success: true,
        id: id,
        // A normal Drive link - every part of the site already knows how to
        // turn it into an image or a preview.
        url: 'https://drive.google.com/file/d/' + id + '/view',
        isImage: isImage,
        viewUrl: 'https://drive.google.com/file/d/' + id + '/view',
        name: safeName
    });
}
