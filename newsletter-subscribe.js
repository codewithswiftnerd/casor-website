
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
