(function () {
    const section = document.getElementById('anthem');
    if (!section) return;

    const flash = document.getElementById('anthemFlash');
    const scrollBox = document.getElementById('anthemScroll');
    const playBtn = document.getElementById('anthemPlay');
    const nextBtn = document.getElementById('anthemNext');
    const readBtn = document.getElementById('anthemRead');
    const audio = document.getElementById('anthemAudio');
    const titleEl = document.getElementById('anthemTitle');
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const FALLBACK_TITLE = 'The CASOR Anthem';
    const FALLBACK_LINES = [
        'Ambassadors for Christ, we are called to declare',
        'His wonders to men, night or day,',
        'We stand for Him alone, to fulfil His commands,',
        'We can make it, we believe, we reconcile men unto God,',
        'We are the ambassadors for Christ.',
        'There is no time, no time to waste, for souls are aching to hear,',
        "Reach the world now by His word divine, we'll never give up,",
        'We can make it, we believe, once a CASORite,',
        'Always be,',
        'Ambassadors for Christ we stand.'
    ];
    const HIGHLIGHT = /^(christ|him|his|god|ambassadors?|casorite|divine)[.,!?;:]*$/i;

    let lines = FALLBACK_LINES.slice();
    let phrases = [];
    let index = 0;

    function buildPhrases() {
        phrases = [];
        lines.forEach(line => {
            line.split(/,\s*/).map(p => p.replace(/[.,;:]+$/, '').trim()).filter(Boolean).forEach(p => {
                const last = phrases[phrases.length - 1];
                if (last && p.split(' ').length <= 2 && last.split(' ').length <= 3) phrases[phrases.length - 1] = last + ', ' + p;
                else phrases.push(p);
            });
        });
        if (!phrases.length) phrases = lines.slice();
    }
    let timer = null;
    let inView = false;

    function esc(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function renderFlash(text) {
        let delay = 0;
        flash.innerHTML = text.split(/\s+/).filter(Boolean).map(word => {
            const chars = Array.from(word).map(ch => {
                const html = `<span class="ch" style="animation-delay:${reduced ? 0 : delay.toFixed(3)}s">${esc(ch)}</span>`;
                delay += 0.028;
                return html;
            }).join('');
            delay += 0.05;
            return `<span class="w">${chars}</span>`;
        }).join('');
        flash.setAttribute('aria-label', text + '. Tap for the next line.');
    }

    function showLine(i) {
        index = (i + phrases.length) % phrases.length;
        if (reduced) { renderFlash(phrases[index]); return; }
        flash.classList.add('out');
        setTimeout(() => {
            flash.classList.remove('out');
            renderFlash(phrases[index]);
        }, flash.children.length ? 260 : 0);
    }

    function lineDuration() {
        if (!audio.paused && isFinite(audio.duration) && audio.duration > 0) {
            return Math.max(1600, (audio.duration * 1000) / phrases.length);
        }
        return 2800;
    }

    function startCycle() {
        stopCycle();
        if (reduced || !inView) return;
        timer = setTimeout(function tick() {
            showLine(index + 1);
            timer = setTimeout(tick, lineDuration());
        }, lineDuration());
    }
    function stopCycle() { if (timer) clearTimeout(timer); timer = null; }

    function next() { showLine(index + 1); startCycle(); }

    flash.addEventListener('click', next);
    flash.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });
    nextBtn.addEventListener('click', next);
    readBtn.addEventListener('click', () => scrollBox.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }));

    let words = [];
    let lineEls = [];
    function renderScroll() {
        scrollBox.innerHTML = lines.map(line =>
            `<p class="anthem-line">${line.split(/\s+/).filter(Boolean).map(w =>
                `<span class="sw${HIGHLIGHT.test(w) ? ' hl' : ''}">${esc(w)}</span>`).join(' ')}</p>`
        ).join('');
        words = Array.from(scrollBox.querySelectorAll('.sw'));
        lineEls = Array.from(scrollBox.querySelectorAll('.anthem-line'));
        updateScroll();
    }

    let ticking = false;
    function updateScroll() {
        ticking = false;
        if (!words.length) return;
        if (reduced) { words.forEach(w => w.classList.add('lit')); return; }
        const rect = scrollBox.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const start = vh * 0.8;
        const end = vh * 0.4;
        const progress = (start - rect.top) / Math.max(1, (rect.height + start - end));
        const lit = Math.max(0, Math.min(words.length, Math.round(progress * words.length)));
        for (let i = 0; i < words.length; i++) words[i].classList.toggle('lit', i < lit);
        let activeLine = -1;
        if (lit > 0 && lit < words.length) {
            const w = words[lit - 1];
            activeLine = lineEls.indexOf(w.parentElement);
        }
        lineEls.forEach((el, i) => el.classList.toggle('active', i === activeLine));
    }
    window.addEventListener('scroll', () => {
        if (!ticking) { ticking = true; requestAnimationFrame(updateScroll); }
    }, { passive: true });
    window.addEventListener('resize', updateScroll);

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
            inView = entries[0].isIntersecting;
            if (inView) startCycle(); else stopCycle();
        }, { threshold: 0.25 }).observe(flash);
    } else {
        inView = true;
    }

    function driveDirect(url) {
        const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : url;
    }
    function setAudio(url) {
        if (!url || !/^https:\/\//i.test(url)) { playBtn.hidden = true; return; }
        audio.src = driveDirect(url.trim());
        playBtn.hidden = false;
    }
    playBtn.addEventListener('click', async () => {
        try {
            if (audio.paused) {
                await audio.play();
            } else {
                audio.pause();
            }
        } catch (err) {
            playBtn.hidden = true;
            console.warn('Anthem audio could not play:', err.message);
        }
    });
    audio.addEventListener('play', () => {
        section.classList.add('playing');
        playBtn.querySelector('span').textContent = 'Pause';
        playBtn.querySelector('i').className = 'fas fa-pause';
        showLine(0); startCycle();
    });
    audio.addEventListener('pause', () => {
        section.classList.remove('playing');
        playBtn.querySelector('span').textContent = 'Play the anthem';
        playBtn.querySelector('i').className = 'fas fa-play';
    });
    audio.addEventListener('error', () => { playBtn.hidden = true; });

    function applyLines(text, title) {
        const parsed = String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        if (parsed.length) {
            lines = parsed;
            if (title) titleEl.textContent = title;
        } else {
            lines = FALLBACK_LINES.slice();
            titleEl.textContent = FALLBACK_TITLE;
        }
        buildPhrases();
        index = 0;
        renderFlash(phrases[0]);
        renderScroll();
        startCycle();
    }

    applyLines('', '');

    if (typeof db === 'undefined') return;
    Promise.all(['home-anthem', 'home-anthem-title', 'home-anthem-audio'].map(id =>
        db.collection('site_content').doc(id).get().then(d => (d.exists && typeof d.data().text === 'string') ? d.data().text : '').catch(() => '')
    )).then(([text, title, audioUrl]) => {
        applyLines(text, title);
        setAudio(audioUrl);
    });
})();
