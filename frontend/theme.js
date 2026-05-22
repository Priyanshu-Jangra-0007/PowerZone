(function () {
    const root = document.documentElement;

    function applyTheme() {
        root.setAttribute("data-theme", "dark");
        if (document.body) {
            document.body.setAttribute("data-theme", "dark");
        }
    }

    applyTheme();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyTheme);
    }
})();
