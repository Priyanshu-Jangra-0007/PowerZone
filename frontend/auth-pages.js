(function () {
    const page = document.body.dataset.authPage;
    const statusEl = document.getElementById("auth-status");
    const hasSupabase = Boolean(window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
    const defaultRedirect = "client.html";
    const DISPLAY_NAME_KEY = "powerzone-display-name";
    const AVATAR_URL_KEY = "powerzone-avatar-url";
    const PROFILE_CACHE_KEY = "powerzone-profile-cache";

    function setStatus(message, ok) {
        if (!statusEl) return;
        statusEl.textContent = message || "";
        statusEl.classList.toggle("ok", Boolean(ok));
    }

    function formatAuthError(error) {
        const rawMessage = String(error && error.message ? error.message : "").toLowerCase();
        if (rawMessage.includes("email not confirmed") || rawMessage.includes("email not verified")) {
            return "Email not verified. Check your inbox and confirm your account before logging in.";
        }
        return error && error.message ? error.message : "Authentication failed.";
    }

    function getRedirectTarget() {
        const rawTarget = new URLSearchParams(window.location.search).get("redirect");
        if (!rawTarget) return defaultRedirect;
        if (/^(https?:)?\/\//i.test(rawTarget)) return defaultRedirect;
        return rawTarget.startsWith("/") ? rawTarget.slice(1) : rawTarget;
    }

    function saveDisplayName(name) {
        const trimmed = String(name || "").trim();
        if (!trimmed) return;
        try {
            localStorage.setItem(DISPLAY_NAME_KEY, trimmed);
        } catch (_error) {
            // Ignore storage failures.
        }
    }

    function readProfileCache() {
        try {
            const raw = localStorage.getItem(PROFILE_CACHE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (_error) {
            return {};
        }
    }

    function saveProfileCache(cache) {
        try {
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
        } catch (_error) {
            // Ignore storage failures.
        }
    }

    function cacheProfile(email, name, avatarUrl) {
        const normalizedEmail = String(email || "").trim().toLowerCase();
        if (!normalizedEmail) return;
        const cache = readProfileCache();
        cache[normalizedEmail] = {
            name: String(name || "").trim(),
            avatarUrl: String(avatarUrl || "").trim()
        };
        saveProfileCache(cache);
    }

    function saveAvatarUrl(user) {
        const metadata = user && typeof user === "object" ? (user.user_metadata || {}) : {};
        const avatarUrl = [metadata.avatar_url, metadata.picture, metadata.photo_url]
            .find((value) => typeof value === "string" && value.trim());
        try {
            if (avatarUrl) {
                localStorage.setItem(AVATAR_URL_KEY, avatarUrl.trim());
            } else {
                localStorage.removeItem(AVATAR_URL_KEY);
            }
        } catch (_error) {
            // Ignore storage failures.
        }
    }

    function clearStoredProfile() {
        try {
            localStorage.removeItem(DISPLAY_NAME_KEY);
            localStorage.removeItem(AVATAR_URL_KEY);
        } catch (_error) {
            // Ignore storage failures.
        }
    }

    function deriveDisplayName(user, fallbackName) {
        const metadata = user && typeof user === "object" ? (user.user_metadata || {}) : {};
        const identityData = Array.isArray(user && user.identities)
            ? user.identities
                .map((identity) => identity && identity.identity_data ? identity.identity_data : null)
                .find((value) => value && typeof value === "object")
            : null;
        const normalizedEmail = String(user && user.email ? user.email : "").trim().toLowerCase();
        const cachedProfile = normalizedEmail ? readProfileCache()[normalizedEmail] : null;
        const candidates = [
            fallbackName,
            cachedProfile && cachedProfile.name,
            metadata.full_name,
            metadata.display_name,
            metadata.name,
            metadata.user_name,
            identityData && identityData.full_name,
            identityData && identityData.name,
            identityData && identityData.user_name,
            user && user.email
        ];
        for (const candidate of candidates) {
            if (typeof candidate === "string" && candidate.trim()) {
                return candidate.includes("@") ? candidate.split("@")[0] : candidate.trim();
            }
        }
        return "";
    }

    function isEmailLikeName(name) {
        return typeof name === "string" && name.includes("@");
    }

    async function syncUserDisplayName(user, fallbackName) {
        if (!supabase || !user) {
            return user;
        }

        const metadata = user && typeof user === "object" ? (user.user_metadata || {}) : {};
        const resolvedName = deriveDisplayName(user, fallbackName);
        if (!resolvedName || isEmailLikeName(resolvedName) || metadata.full_name === resolvedName) {
            return user;
        }

        const { data, error } = await supabase.auth.updateUser({
            data: {
                ...metadata,
                full_name: resolvedName
            }
        });

        return error ? user : (data.user || user);
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
        const searchParams = new URLSearchParams(window.location.search);
        const redirectTarget = getRedirectTarget();

        if (searchParams.get("logout") === "1") {
            clearStoredProfile();
            if (hasSupabase) {
                supabase.auth.signOut().finally(() => {
                    setStatus("Logged out successfully.", true);
                });
            } else {
                setStatus("Logged out successfully.", true);
            }
        }

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
                setStatus(formatAuthError(error));
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
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setStatus(formatAuthError(error));
                return;
            }
            if (!data.user?.email_confirmed_at) {
                await supabase.auth.signOut();
                clearStoredProfile();
                setStatus("Verify your email before accessing the client page.");
                return;
            }
            const syncedUser = await syncUserDisplayName(data.user);
            const displayName = deriveDisplayName(syncedUser);
            const metadata = syncedUser && typeof syncedUser === "object" ? (syncedUser.user_metadata || {}) : {};
            const avatarUrl = [metadata.avatar_url, metadata.picture, metadata.photo_url]
                .find((value) => typeof value === "string" && value.trim()) || "";
            saveDisplayName(displayName);
            saveAvatarUrl(syncedUser);
            cacheProfile(email, displayName, avatarUrl);
            setStatus("Login successful. Redirecting...", true);
            setTimeout(() => {
                window.location.href = redirectTarget;
            }, 700);
        });
    }

    if (page === "register") {
        const registerForm = document.getElementById("register-form");
        const redirectTarget = getRedirectTarget();

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
                setStatus(formatAuthError(error));
                return;
            }

            if (!data.session?.user?.email_confirmed_at) {
                cacheProfile(email, fullName, "");
                setStatus("Account created. Verify from email, then login.", true);
                return;
            }

            const syncedUser = await syncUserDisplayName(data.session.user, fullName);
            const displayName = deriveDisplayName(syncedUser, fullName);
            const metadata = syncedUser && typeof syncedUser === "object" ? (syncedUser.user_metadata || {}) : {};
            const avatarUrl = [metadata.avatar_url, metadata.picture, metadata.photo_url]
                .find((value) => typeof value === "string" && value.trim()) || "";
            saveDisplayName(displayName);
            saveAvatarUrl(syncedUser);
            cacheProfile(email, displayName, avatarUrl);
            setStatus("Account created. Redirecting...", true);
            setTimeout(() => {
                window.location.href = redirectTarget;
            }, 700);
        });
    }
})();
