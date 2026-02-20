(function () {
    const page = document.body.dataset.authPage;
    const statusEl = document.getElementById("auth-status");
    const hasSupabase = Boolean(window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY);

    function setStatus(message, ok) {
        if (!statusEl) return;
        statusEl.textContent = message || "";
        statusEl.classList.toggle("ok", Boolean(ok));
    }

    if (!hasSupabase) {
        setStatus("Supabase not configured. Add keys in supabase-config.js.");
    }

    const supabase = hasSupabase
        ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
        : null;

    if (page === "login") {
        const loginForm = document.getElementById("login-form");
        const forgotToggle = document.getElementById("forgot-toggle");
        const forgotRow = document.getElementById("forgot-row");
        const forgotSubmit = document.getElementById("forgot-submit");
        const forgotEmail = document.getElementById("forgot-email");

        forgotToggle.addEventListener("click", () => {
            forgotRow.classList.toggle("active");
            if (!forgotEmail.value && loginForm.email.value) {
                forgotEmail.value = loginForm.email.value;
            }
        });

        forgotSubmit.addEventListener("click", async () => {
            if (!hasSupabase) return;
            const email = forgotEmail.value.trim();
            if (!email) {
                setStatus("Enter email for reset.");
                return;
            }
            setStatus("Sending reset link...");
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth.html?mode=reset`
            });
            if (error) {
                setStatus(error.message);
                return;
            }
            setStatus("Reset link sent. Check your inbox.", true);
        });

        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!hasSupabase) return;
            const email = loginForm.email.value.trim();
            const password = loginForm.password.value;

            setStatus("Signing in...");
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setStatus(error.message);
                return;
            }
            setStatus("Login successful. Redirecting...", true);
            setTimeout(() => {
                window.location.href = "client.html";
            }, 700);
        });
    }

    if (page === "register") {
        const registerForm = document.getElementById("register-form");

        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!hasSupabase) return;

            const fullName = registerForm.fullName.value.trim();
            const email = registerForm.email.value.trim();
            const password = registerForm.password.value;
            const confirmPassword = registerForm.confirmPassword.value;
            const terms = registerForm.terms.checked;

            if (password.length < 8) {
                setStatus("Password must be at least 8 characters.");
                return;
            }
            if (password !== confirmPassword) {
                setStatus("Passwords do not match.");
                return;
            }
            if (!terms) {
                setStatus("Please accept Terms and Privacy Policy.");
                return;
            }

            setStatus("Creating account...");
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName },
                    emailRedirectTo: `${window.location.origin}/login.html`
                }
            });

            if (error) {
                setStatus(error.message);
                return;
            }

            if (!data.session) {
                const loginAttempt = await supabase.auth.signInWithPassword({ email, password });
                if (loginAttempt.error) {
                    setStatus("Account created. Verify from email, then login.", true);
                    return;
                }
            }

            setStatus("Account created. Redirecting...", true);
            setTimeout(() => {
                window.location.href = "client.html";
            }, 700);
        });
    }
})();
