document.addEventListener('DOMContentLoaded', () => {

    // 1. Smooth Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // 2. Intersection Observer for Fade-In Animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('fade-in-visible');
        });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });

    const animatableElements = document.querySelectorAll(
        '.card, .feature-card, .section-desc, h2, .footer-cta, .showcase-item, .testimonial, .b2b-text, .b2b-image, .hero-badge'
    );
    
    animatableElements.forEach(el => {
        el.classList.add('fade-in-hidden');
        observer.observe(el);
    });

    // 3. Counter Animation for Hero Stats
    const counterElements = document.querySelectorAll('.dashboard-stat h3');
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const text = el.textContent;
                const match = text.match(/[\d,.]+/);
                if (match) {
                    const target = parseFloat(match[0].replace(/,/g, ''));
                    const prefix = text.substring(0, text.indexOf(match[0]));
                    const suffix = text.substring(text.indexOf(match[0]) + match[0].length);
                    let current = 0;
                    const step = target / 40;
                    const interval = setInterval(() => {
                        current += step;
                        if (current >= target) {
                            current = target;
                            clearInterval(interval);
                        }
                        el.textContent = prefix + (Number.isInteger(target) ? Math.round(current).toLocaleString() : current.toFixed(1)) + suffix;
                    }, 30);
                }
                counterObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counterElements.forEach(el => counterObserver.observe(el));
});
