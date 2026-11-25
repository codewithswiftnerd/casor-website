// ===== PAGE LOAD FADE-IN =====
// Whole page fades in once the DOM is ready, instead of just snapping into view.
document.documentElement.classList.add('js-anim');
window.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => document.body.classList.add('page-loaded'));
});
// Safety net: if DOMContentLoaded already fired before this script ran, or
// something blocks it, still reveal the page on full load.
window.addEventListener('load', () => document.body.classList.add('page-loaded'));

// ===== SCROLL FADE IN / OUT =====
// Tags common content blocks with `.reveal` and toggles `.is-visible` as
// they cross the viewport - fading (and gently sliding) in on the way in,
// and back out if scrolled past - so the page feels interactive rather
// than static. Done from JS (rather than baked into every page) so every
// page picks up the same behaviour automatically.
document.addEventListener('DOMContentLoaded', () => {
    const selectors = [
        '.hero-inner', '.hero-photo',
        '.section-head',
        '.place-card',
        '.wh-media', '.wh-content',
        '.event-card-2',
        '.see-you-content',
        '.page-hero-inner',
        '.unit-full-card', '.arm-card', '.exco-card', '.cov-item',
        '.leadership-card',
        '.two-col > *',
        '.contact-info', '.contact-form',
        '.gallery-grid .torn-photo',
        '.newsletter-row',
        '.footer-grid > div'
    ];

    const targets = Array.from(document.querySelectorAll(selectors.join(',')));

    targets.forEach((el, i) => {
        el.classList.add('reveal');
        // Small stagger so grids of cards don't all pop at once.
        el.style.transitionDelay = `${(i % 4) * 0.08}s`;
    });

    if (!('IntersectionObserver' in window) || targets.length === 0) {
        // No support (or nothing to animate) - just show everything.
        targets.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
    });

    targets.forEach(el => observer.observe(el));
});

// ===== HEADER + MENU POLISH (theme.css) =====
// Adds a hairline under the sticky header once the page scrolls, lets the
// hamburger work from the keyboard, and keeps aria-expanded in sync.
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');
    if (header) {
        const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }
    const toggle = document.getElementById('menuToggle');
    const nav = document.getElementById('mainNav');
    if (toggle && nav) {
        toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); }
        });
        new MutationObserver(() => {
            const open = nav.classList.contains('active');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            document.body.style.overflow = open ? 'hidden' : '';
        }).observe(nav, { attributes: true, attributeFilter: ['class'] });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('active')) toggle.click();
        });
    }
});
