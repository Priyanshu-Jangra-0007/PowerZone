(function () {
    const wrap = document.getElementById("path-wrap");
    if (!wrap) return;

    const rail = wrap.querySelector(".path-rail");
    const line = wrap.querySelector(".path-line");
    const progress = wrap.querySelector(".path-progress");
    const steps = Array.from(wrap.querySelectorAll(".path-step"));
    const dots = Array.from(wrap.querySelectorAll(".path-dot"));

    if (!rail || !line || !progress || steps.length === 0 || dots.length === 0) return;

    let firstDotY = 0;
    let lastDotY = 0;

    function syncLayout() {
        const wrapRect = wrap.getBoundingClientRect();
        const wrapTopAbs = window.scrollY + wrapRect.top;

        steps.forEach((step, index) => {
            const stepRect = step.getBoundingClientRect();
            const stepCenterAbs = window.scrollY + stepRect.top + stepRect.height / 2;
            const center = stepCenterAbs - wrapTopAbs;
            if (dots[index]) dots[index].style.top = `${center - 11}px`;
        });

        firstDotY = (dots[0]?.offsetTop || 0) + 11;
        lastDotY = (dots[dots.length - 1]?.offsetTop || firstDotY) + 11;
        const lineHeight = Math.max(0, lastDotY - firstDotY);

        line.style.top = `${firstDotY}px`;
        line.style.height = `${lineHeight}px`;
        progress.style.top = `${firstDotY}px`;
    }

    function updateOnScroll() {
        const triggerY = window.innerHeight * 0.42;
        let activeIndex = 0;

        steps.forEach((step, idx) => {
            const rect = step.getBoundingClientRect();
            const centerY = rect.top + rect.height / 2;
            if (centerY <= triggerY) activeIndex = idx;
        });

        dots.forEach((dot, idx) => {
            dot.classList.toggle("completed", idx < activeIndex);
            dot.classList.toggle("active", idx === activeIndex);
        });
        steps.forEach((step, idx) => step.classList.toggle("active", idx === activeIndex));

        const wrapRect = wrap.getBoundingClientRect();
        const markerY = triggerY - wrapRect.top;
        const clampedMarker = Math.min(lastDotY, Math.max(firstDotY, markerY));
        const height = Math.max(0, clampedMarker - firstDotY);
        progress.style.height = `${height}px`;
    }

    let ticking = false;
    function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
            updateOnScroll();
            ticking = false;
        });
    }

    function init() {
        syncLayout();
        updateOnScroll();
    }

    window.addEventListener("resize", init);
    window.addEventListener("scroll", onScroll, { passive: true });
    init();
})();
