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

(function () {
    const form = document.getElementById("contact");
    const status = document.getElementById("contact-status");
    if (!form || !status) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const supabaseClient = typeof window.getPowerzoneSupabaseClient === "function"
        ? window.getPowerzoneSupabaseClient()
        : null;

    function setStatus(message, tone) {
        status.textContent = message;
        status.classList.remove("is-success", "is-error");
        if (tone === "success") status.classList.add("is-success");
        if (tone === "error") status.classList.add("is-error");
    }

    function getTrimmedValue(name) {
        const field = form.elements.namedItem(name);
        return field && "value" in field ? String(field.value || "").trim() : "";
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {
            full_name: getTrimmedValue("fullName"),
            phone_number: getTrimmedValue("phoneNumber"),
            email: getTrimmedValue("email"),
            city: getTrimmedValue("city"),
            gym_name: getTrimmedValue("gymName"),
            gym_area_sqft: Number(getTrimmedValue("gymAreaSqft")),
            current_setup: getTrimmedValue("currentSetup"),
        };

        if (!payload.full_name || !payload.phone_number || !payload.email || !payload.city || !payload.gym_name || !payload.gym_area_sqft) {
            setStatus("Please fill in all required fields before submitting.", "error");
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
        setStatus("Submitting your application...");

        try {
            if (!supabaseClient) {
                throw new Error("Supabase is not configured on this page.");
            }

            const { error } = await supabaseClient
                .from("franchise_applications")
                .insert([payload]);

            if (error) {
                throw new Error(error.message || "We could not submit your application right now. Please try again.");
            }

            form.reset();
            setStatus("Application submitted successfully. Our team will contact you soon.", "success");
        } catch (error) {
            setStatus(error.message || "Something went wrong while sending your application.", "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Submit Application";
        }
    });
})();
