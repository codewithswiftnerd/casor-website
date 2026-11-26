(function () {
    const form = document.getElementById('regForm');
    if (!form) return;
    const $ = id => document.getElementById(id);
    const err = $('regError');
    const btn = $('regSubmit');

    function fail(msg, field) {
        err.textContent = msg;
        err.hidden = false;
        if (field) field.focus();
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        err.hidden = true;
        if ($('regWebsite').value) return;

        const name = $('regName').value.trim().replace(/\s+/g, ' ');
        const phone = $('regPhone').value.trim();
        const email = $('regEmail').value.trim().toLowerCase();
        const digits = phone.replace(/\D/g, '');

        if (name.length < 3) return fail('Please enter your full name.', $('regName'));
        if (digits.length < 10 || digits.length > 15) return fail('Please enter a valid phone number.', $('regPhone'));
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('That email address doesn’t look right.', $('regEmail'));
        if (!$('regConsent').checked) return fail('Please tick the box to agree before registering.', $('regConsent'));

        try {
            const last = +localStorage.getItem('casorRegisteredAt') || 0;
            if (Date.now() - last < 24 * 3600 * 1000) {
                form.hidden = true; $('regDone').hidden = false; return;
            }
        } catch (_) {}

        if (typeof db === 'undefined') return fail('Couldn’t connect. Check your network and try again.');

        btn.disabled = true;
        btn.textContent = 'Registering...';
        try {
            await db.collection('members').add({
                name,
                phone,
                email,
                gender: $('regGender').value,
                level: $('regLevel').value,
                dept: $('regDept').value.trim(),
                unit: $('regUnit').value,
                dob: $('regDob').value,
                address: $('regAddress').value.trim(),
                source: 'self',
                status: 'new',
                consent: true,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            try { localStorage.setItem('casorRegisteredAt', String(Date.now())); } catch (_) {}
            form.hidden = true;
            $('regDone').hidden = false;
            $('regDone').scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e2) {
            console.error('Registration failed:', e2);
            fail('Sorry, that didn’t go through. Please try again in a moment.');
            btn.disabled = false;
            btn.textContent = 'Register';
        }
    });
})();
