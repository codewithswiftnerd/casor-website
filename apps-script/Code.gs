
const FIREBASE_WEB_API_KEY = 'AIzaSyAiACEdrFknfxa43WNubTV8A96YaNKgeyc';
const SITE_URL = 'https://casoruniport.netlify.app';
const FROM_NAME = 'CASOR UNIPORT';
const FROM_EMAIL = 'casoruniportarchive@gmail.com';

function doPost(e) {
    let payload;
    try {
        payload = JSON.parse(e.postData.contents);
    } catch (err) {
        return jsonResponse({ success: false, error: 'Bad request body.' });
    }

    if (payload.action === 'push') {
        return handlePushRequest(payload);
    }
    if (payload.action === 'upload') {
        return handleUploadRequest(payload);
    }
    if (payload.action === 'deleteExco') {
        return handleDeleteExcoRequest(payload);
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
        if (data.users && data.users[0] && data.users[0].email && data.users[0].emailVerified === true) {
            return data.users[0].email;
        }
    } catch (err) {
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

function getFcmAccessToken() {
    return getServiceAccessToken_('https://www.googleapis.com/auth/firebase.messaging');
}

function getServiceAccessToken_(scope) {
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
        scope: scope,
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
        throw new Error('Could not get a Google access token: ' + response.getContentText());
    }
    return { token: data.access_token, projectId: sa.project_id };
}

function handlePushRequest(payload) {
    const { idToken, title, body, link, tokens } = payload;

    if (!idToken) {
        return jsonResponse({ success: false, error: 'Not signed in.' });
    }
    const callerEmail = verifyFirebaseIdToken(idToken);
    if (!callerEmail) {
        return jsonResponse({ success: false, error: 'Your session has expired - please log in again.' });
    }

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
        }
    });

    return jsonResponse({ success: true, sentCount: sent, deadTokens: deadTokens });
}

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
        url: 'https://drive.google.com/file/d/' + id + '/view',
        isImage: isImage,
        viewUrl: 'https://drive.google.com/file/d/' + id + '/view',
        name: safeName
    });
}


function isAdminCaller_(user, idToken) {
    if (getAdminEmails().indexOf(String(user.email).toLowerCase()) !== -1) return true;
    try {
        const url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID +
            '/databases/(default)/documents/excos/' + encodeURIComponent(user.localId);
        const res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + idToken }, muteHttpExceptions: true });
        if (res.getResponseCode() !== 200) return false;
        const f = JSON.parse(res.getContentText()).fields || {};
        return f.status && f.status.stringValue === 'approved' && f.role && f.role.stringValue === 'admin';
    } catch (err) {
        return false;
    }
}

function handleDeleteExcoRequest(payload) {
    const idToken = payload.idToken;
    const uid = payload.uid;
    if (!idToken) return jsonResponse({ success: false, error: 'Not signed in.' });

    const caller = lookupFirebaseUser_(idToken);
    if (!caller) return jsonResponse({ success: false, error: 'Your session has expired - please log in again.' });
    if (!isAdminCaller_(caller, idToken)) return jsonResponse({ success: false, error: 'Only admins can remove EXCOs.' });

    if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
        return jsonResponse({ success: false, error: 'Missing or invalid account id.' });
    }
    if (uid === caller.localId) {
        return jsonResponse({ success: false, error: "You can't remove your own account. Ask another admin." });
    }

    let auth;
    try {
        auth = getServiceAccessToken_('https://www.googleapis.com/auth/cloud-platform');
    } catch (err) {
        return jsonResponse({ success: false, error: err.message });
    }
    const headers = { Authorization: 'Bearer ' + auth.token };
    const projectId = auth.projectId || FIREBASE_PROJECT_ID;

    const del = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/projects/' + projectId + '/accounts:delete', {
        method: 'post',
        contentType: 'application/json',
        headers: headers,
        payload: JSON.stringify({ localId: uid }),
        muteHttpExceptions: true
    });
    const delCode = del.getResponseCode();
    if ((delCode < 200 || delCode >= 300) && del.getContentText().indexOf('USER_NOT_FOUND') === -1) {
        return jsonResponse({ success: false, error: 'Could not delete the login (' + delCode + '): ' + del.getContentText().slice(0, 300) });
    }

    const base = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/';
    ['excos/', 'approval_tokens/'].forEach(function (col) {
        UrlFetchApp.fetch(base + col + encodeURIComponent(uid), { method: 'delete', headers: headers, muteHttpExceptions: true });
    });

    return jsonResponse({ success: true });
}
