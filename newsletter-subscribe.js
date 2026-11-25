// ============================================================
// NEWSLETTER SUBSCRIBE - visitor-facing.
// Loaded on every public page (after portal/firebase-config.js, which
// already calls firebase.initializeApp()). Wires up the "Stay
// Connected" form already sitting in every page's footer
// (#newsletterForm / #newsletterEmail / #newsletterFeedback) to write
// a real subscriber record to Firestore.
//
// Doc shape (collection: "subscribers", one doc per email, the email
// itself - lowercased - IS the doc ID):
//   { email, subscribedAt, status: 'active', unsubscribeToken }
//
// Using the email as the doc ID is what makes duplicate prevention
// automatic: Firestore treats a write to an ID that already exists as
// an "update", and the security rules only allow ADMINS to update
// this collection (see SETUP-GUIDE.md) - so a second signup with the
// same address is rejected by the rules themselves, not just by a
// client-side check that someone could bypass.
//
// unsubscribeToken is a random string generated here in the browser
// and saved with the record. It gets embedded in every newsletter's
// unsubscribe link so a stranger can't unsubscribe someone else just
// by knowing their email - see functions/index.js's unsubscribe
// endpoint, which checks this token before touching the record.
// ============================================================

(function () {
    if (typeof firebase === 'undefined' || !firebase.firestore) return;

    const form = document.getElementById('newsletterForm');
    const emailInput = document.getElementById('newsletterEmail');
    const feedback = document.getElementById('newsletterFeedback');
    if (!form || !emailInput || !feedback) return;

    const db = firebase.firestore();

    function showFeedback(message, isError) {
        feedback.textContent = message;
        feedback.style.color = isError ? '#ff6b6b' : '#FFC72C';
        feedback.style.display = 'block';
    }

    function isValidEmail(email) {
        // Deliberately simple - good enough to catch typos without
        // rejecting real addresses. Firestore/the send step is the
        // real gate against genuinely bad input.
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function randomToken() {
        const bytes = new Uint8Array(24);
        (window.crypto || window.msCrypto).getRandomValues(bytes);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }

    let submitting = false;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (submitting) return;

        const email = emailInput.value.trim().toLowerCase();

        if (!email) {
            showFeedback('Please enter your email address.', true);
            return;
        }
        if (!isValidEmail(email)) {
            showFeedback('Please enter a valid email address.', true);
            return;
        }

        submitting = true;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Subscribing...';
        }

        try {
            await db.collection('subscribers').doc(email).set({
                email: email,
                subscribedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active',
                unsubscribeToken: randomToken()
            });
            // .set() with no {merge:true} only succeeds as a "create" per
            // the security rules - if this address already has a
            // document, the rules reject it as an "update" (permission
            // denied), which we treat below as "already subscribed".

            showFeedback("You're subscribed! Watch your inbox for CASOR updates.", false);
            emailInput.value = '';
        } catch (err) {
            if (err && err.code === 'permission-denied') {
                showFeedback("That email is already subscribed.", true);
            } else {
                showFeedback('Something went wrong. Please try again.', true);
            }
        } finally {
            submitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    });
})();
