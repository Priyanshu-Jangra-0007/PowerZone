(function () {
    const THEME_KEY = "powerzone-theme";
    const root = document.documentElement;

    function readTheme() {
        try {
            return localStorage.getItem(THEME_KEY) || "light";
        } catch (_error) {
            return "light";
        }
    }

    function writeTheme(theme) {
        try {
            localStorage.setItem(THEME_KEY, theme);
        } catch (_error) {
            // Ignore storage failures.
        }
    }

    function applyTheme(theme) {
        root.setAttribute("data-theme", theme);
        if (document.body) {
            document.body.setAttribute("data-theme", theme);
        }
    }

    function updateToggleUi(theme) {
        document.querySelectorAll(".theme-toggle").forEach((button) => {
            button.setAttribute("aria-pressed", String(theme === "dark"));
            button.setAttribute("title", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
            const icon = button.querySelector(".theme-toggle-glyph");
            if (icon) {
                icon.innerHTML = theme === "dark" ? "&#9728;" : "&#9789;";
            }
        });
    }

    function makeToggleButton() {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "theme-toggle";
        button.setAttribute("aria-label", "Toggle color theme");
        button.innerHTML = '<span class="theme-toggle-glyph" aria-hidden="true"></span>';
        button.addEventListener("click", () => {
            const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
            const next = current === "dark" ? "light" : "dark";
            applyTheme(next);
            writeTheme(next);
            updateToggleUi(next);
        });
        return button;
    }

    function mountToggle() {
        let desktopToggle = document.querySelector(".theme-toggle:not(.theme-toggle-mobile)");
        if (!desktopToggle) {
            const navCta = document.querySelector(".nav-cta");
            desktopToggle = makeToggleButton();
            if (navCta) {
                navCta.prepend(desktopToggle);
            } else {
                desktopToggle.classList.add("theme-toggle-floating");
                document.body.appendChild(desktopToggle);
            }
        }

        const navContainer = document.querySelector(".nav-container");
        const mobileCta = navContainer ? navContainer.querySelector(".nav-mobile-cta") : null;
        if (navContainer && mobileCta && !navContainer.querySelector(".theme-toggle-mobile")) {
            const mobileToggle = makeToggleButton();
            mobileToggle.classList.add("theme-toggle-mobile");
            navContainer.insertBefore(mobileToggle, mobileCta);
        }
    }

    const currentTheme = readTheme();
    applyTheme(currentTheme);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            mountToggle();
            updateToggleUi(currentTheme);
        });
    } else {
        mountToggle();
        updateToggleUi(currentTheme);
    }
})();
