(function () {
    const statusEl = document.getElementById("auth-status");
    const views = document.querySelectorAll(".auth-view");
    const tabs = document.querySelectorAll(".auth-tab");
    const viewButtons = document.querySelectorAll("[data-view-target]");

    function showStatus(message, ok) {
        statusEl.textContent = message || "";
        statusEl.classList.toggle("ok", Boolean(ok));
    }

    function setView(name) {
        views.forEach((v) => v.classList.toggle("active", v.dataset.view === name));
        tabs.forEach((t) => t.classList.toggle("active", t.dataset.viewTarget === name));
        const url = new URL(window.location.href);
        url.searchParams.set("mode", name);
        window.history.replaceState({}, "", url);
    }

    function getModeFromQuery() {
        const mode = new URLSearchParams(window.location.search).get("mode");
        return mode || "login";
    }

    function parseHashParams() {
        const hash = window.location.hash.replace(/^#/, "");
        return new URLSearchParams(hash);
    }

    function validatePasswords(password, confirmPassword) {
        if (password.length < 8) {
            return "Password must be at least 8 characters.";
        }
        if (password !== confirmPassword) {
            return "Passwords do not match.";
        }
        return "";
    }

    viewButtons.forEach((btn) => {
        btn.addEventListener("click", () => setView(btn.dataset.viewTarget));
    });

    document.querySelectorAll(".pw-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
            const input = btn.parentElement.querySelector("input");
            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            btn.textContent = isPassword ? "Hide" : "Show";
        });
    });

    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) {
        showStatus("Supabase is not configured. Add keys in frontend/supabase-config.js.");
        setView(getModeFromQuery());
        return;
    }

    const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

    async function handleRecoveryLink() {
        const hashParams = parseHashParams();
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        const type = hashParams.get("type");
        const error_description = hashParams.get("error_description");

        if (error_description) {
            showStatus(decodeURIComponent(error_description));
            return;
        }

        if (access_token && refresh_token && type === "recovery") {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) {
                showStatus(error.message);
                return;
            }
            setView("reset");
            showStatus("Recovery verified. Set your new password.", true);
            window.history.replaceState({}, "", `${window.location.pathname}?mode=reset`);
        }
    }

    async function prefillSessionState() {
        const rememberEmail = localStorage.getItem("powerzone_remember_email");
        if (rememberEmail) {
            const loginEmail = document.querySelector("#login-form input[name='email']");
            if (loginEmail) loginEmail.value = rememberEmail;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session && getModeFromQuery() === "reset") {
            setView("reset");
            return;
        }
        setView(getModeFromQuery());
    }

    document.getElementById("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        showStatus("Signing in...");

        const form = e.currentTarget;
        const email = form.email.value.trim();
        const password = form.password.value;
        const remember = form.remember.checked;

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            showStatus(error.message);
            return;
        }

        if (remember) {
            localStorage.setItem("powerzone_remember_email", email);
        } else {
            localStorage.removeItem("powerzone_remember_email");
        }

        showStatus("Login successful. Redirecting...", true);
        setTimeout(() => {
            window.location.href = "index.html";
        }, 700);
    });

    document.getElementById("register-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        showStatus("");

        const form = e.currentTarget;
        const fullName = form.fullName.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;
        const terms = form.terms.checked;

        if (!terms) {
            showStatus("Please accept Terms and Privacy Policy.");
            return;
        }

        const validationError = validatePasswords(password, confirmPassword);
        if (validationError) {
            showStatus(validationError);
            return;
        }

        showStatus("Creating account...");
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName },
                emailRedirectTo: `${window.location.origin}${window.location.pathname}?mode=login`
            }
        });

        if (error) {
            showStatus(error.message);
            return;
        }

        if (!data.session) {
            showStatus("Check your email to verify your account, then login.", true);
            setView("login");
            return;
        }

        showStatus("Account created. Redirecting...", true);
        setTimeout(() => {
            window.location.href = "index.html";
        }, 700);
    });

    document.getElementById("forgot-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = e.currentTarget.email.value.trim();
        showStatus("Sending password reset email...");

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}${window.location.pathname}?mode=reset`
        });

        if (error) {
            showStatus(error.message);
            return;
        }

        showStatus("Reset link sent. Check your inbox.", true);
        setView("login");
    });

    document.getElementById("reset-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const password = e.currentTarget.password.value;
        const confirmPassword = e.currentTarget.confirmPassword.value;
        const validationError = validatePasswords(password, confirmPassword);

        if (validationError) {
            showStatus(validationError);
            return;
        }

        showStatus("Updating password...");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            showStatus(error.message);
            return;
        }

        showStatus("Password updated. Login with your new password.", true);
        setView("login");
    });

    handleRecoveryLink().then(prefillSessionState);
})();
