document.documentElement.classList.add('js-anim');
window.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => document.body.classList.add('page-loaded'));
});
window.addEventListener('load', () => document.body.classList.add('page-loaded'));

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
        el.style.transitionDelay = `${(i % 4) * 0.08}s`;
    });

    if (!('IntersectionObserver' in window) || targets.length === 0) {
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
