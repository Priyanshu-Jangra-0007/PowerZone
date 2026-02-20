const revealSections = document.querySelectorAll('.reveal');
if (revealSections.length) {
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.18, rootMargin: '0px 0px -35px 0px' });
    revealSections.forEach((section) => revealObserver.observe(section));
}
