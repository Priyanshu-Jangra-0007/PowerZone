const gyms = [
    {
        id: 1,
        name: "Forge Fitness Gym",
        category: "CrossFit",
        address: "Ground Floor, THE FORGE GYM, A57, Zeta I, Greater Noida, Uttar Pradesh 201310",
        rating: 4.9,
        detailsUrl: "forge-fitness-gym.html"
    },
    { id: 2, name: "Crossfit Arena", category: "CrossFit", address: "Alpha-2, Greater Noida, UP", rating: 4.8 },
    { id: 3, name: "Powerhouse Gym", category: "General Gym", address: "Alpha-1 Commercial Complex, Greater Noida", rating: 4.7 },
    { id: 4, name: "Spartan Gym", category: "Bodybuilding", address: "Zeta-1, Greater Noida, UP", rating: 4.7 },
    { id: 5, name: "Iron Temple Gym", category: "Bodybuilding", address: "Sector Alpha-1, Greater Noida, UP", rating: 4.6 },
    { id: 6, name: "Elite Fitness Center", category: "Unisex Fitness", address: "Beta-2, Greater Noida, UP", rating: 4.6 },
    { id: 7, name: "Muscle Factory", category: "Bodybuilding", address: "Near Alpha-2 Metro, Greater Noida", rating: 4.5 },
    { id: 8, name: "The Fit Club", category: "Unisex Fitness", address: "Eta-1, Greater Noida, UP", rating: 4.5 },
    { id: 9, name: "FitZone Unisex Fitness", category: "Unisex Fitness", address: "Near Pari Chowk, Alpha-1, Greater Noida", rating: 4.4 },
    { id: 10, name: "Titan Gym", category: "Bodybuilding", address: "Beta-2 Commercial Area, Greater Noida", rating: 4.4 },
    { id: 11, name: "Strength & Conditioning Hub", category: "General Gym", address: "Alpha-2 Market, Greater Noida", rating: 4.3 },
    { id: 12, name: "Omega Fitness Zone", category: "General Gym", address: "Gamma-1, Greater Noida, UP", rating: 4.2 }
];

const state = {
    query: "",
    sortBy: "rating",
    minRating: 0,
    locations: new Set(),
    categories: new Set()
};

const elements = {
    search: document.getElementById("gym-search"),
    sortDropdown: document.getElementById("sort-dropdown"),
    sortToggle: document.getElementById("sort-toggle"),
    sortMenu: document.getElementById("sort-menu"),
    sortCurrent: document.getElementById("sort-current"),
    sortOptions: document.querySelectorAll(".sort-option"),
    filtersToggle: document.getElementById("filters-toggle"),
    filtersPanel: document.getElementById("filters-panel"),
    locationFilters: document.getElementById("location-filters"),
    categoryFilters: document.getElementById("category-filters"),
    minRatingOptions: document.querySelectorAll("input[name='min-rating']"),
    resetFilters: document.getElementById("reset-filters"),
    resultsGrid: document.getElementById("results-grid"),
    resultsCount: document.getElementById("results-count"),
    emptyState: document.getElementById("empty-state")
};

const sortLabels = {
    rating: "SORT BY: RATING",
    name: "SORT BY: NAME (A-Z)",
    proximity: "SORT BY: PROXIMITY"
};

const proximityTokens = ["pari chowk", "alpha-1", "alpha-2", "beta-2", "gamma-1", "eta-1", "zeta-1"];
const locationOrder = ["Alpha-1", "Alpha-2", "Beta-2", "Others"];

function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function getCategories() {
    return [...new Set(gyms.map((gym) => gym.category))];
}

function getGymLocation(address) {
    const normalized = address.toLowerCase();
    if (normalized.includes("alpha-1")) return "Alpha-1";
    if (normalized.includes("alpha-2")) return "Alpha-2";
    if (normalized.includes("beta-2")) return "Beta-2";
    return "Others";
}

function renderCheckboxFilters(container, options, selectedSet) {
    container.innerHTML = "";
    options.forEach((value) => {
        const label = document.createElement("label");
        label.className = "filter-checkbox-option";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = selectedSet.has(value);

        const text = document.createElement("span");
        text.textContent = value;

        input.addEventListener("change", () => {
            if (input.checked) {
                selectedSet.add(value);
            } else {
                selectedSet.delete(value);
            }
            renderResults();
        });

        label.appendChild(input);
        label.appendChild(text);
        container.appendChild(label);
    });
}

function renderLocationFilters() {
    const available = new Set(gyms.map((gym) => getGymLocation(gym.address)));
    const locations = locationOrder.filter((location) => available.has(location));
    renderCheckboxFilters(elements.locationFilters, locations, state.locations);
}

function renderCategoryFilters() {
    renderCheckboxFilters(elements.categoryFilters, getCategories(), state.categories);
}

function cardTemplate(gym) {
    const detailsCta = gym.detailsUrl
        ? `<a class="details-button" href="${escapeHtml(gym.detailsUrl)}">VIEW MORE</a>`
        : `<button class="details-button" type="button">VIEW MORE</button>`;

    return `
        <article class="gym-card">
            <div class="gym-card-top">
                <h3>${escapeHtml(gym.name)}</h3>
                <p class="gym-rating">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 17.27-6.18 3.73 1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.46 4.73L18.18 21z"></path></svg>
                    ${gym.rating.toFixed(1)}
                </p>
            </div>
            <p class="gym-category">${escapeHtml(gym.category)}</p>
            <p class="gym-address">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 4.86 5.42 11.9 6.04 12.69a1.2 1.2 0 0 0 1.92 0C13.58 20.9 19 13.86 19 9a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"></path></svg>
                <span>${escapeHtml(gym.address)}</span>
            </p>
            ${detailsCta}
        </article>
    `;
}

function applyFilters(list) {
    return list.filter((gym) => {
        const matchesSearch = state.query === "" || `${gym.name} ${gym.category} ${gym.address}`.toLowerCase().includes(state.query);
        const matchesLocation = state.locations.size === 0 || state.locations.has(getGymLocation(gym.address));
        const matchesCategory = state.categories.size === 0 || state.categories.has(gym.category);
        const matchesRating = gym.rating >= state.minRating;
        return matchesSearch && matchesLocation && matchesCategory && matchesRating;
    });
}

function sortGyms(list) {
    const sorted = [...list];

    if (state.sortBy === "name") {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        return sorted;
    }

    if (state.sortBy === "proximity") {
        const rankByAddress = (address) => {
            const normalized = address.toLowerCase();
            const rank = proximityTokens.findIndex((token) => normalized.includes(token));
            return rank === -1 ? Number.MAX_SAFE_INTEGER : rank;
        };

        sorted.sort((a, b) => {
            const rankDelta = rankByAddress(a.address) - rankByAddress(b.address);
            if (rankDelta !== 0) {
                return rankDelta;
            }
            return b.rating - a.rating;
        });
        return sorted;
    }

    sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
}

function syncSortDropdown() {
    elements.sortCurrent.textContent = sortLabels[state.sortBy] || sortLabels.rating;

    elements.sortOptions.forEach((option) => {
        const isSelected = option.dataset.sort === state.sortBy;
        option.classList.toggle("is-active", isSelected);
        option.setAttribute("aria-selected", String(isSelected));
    });
}

function toggleSortDropdown(open) {
    const nextOpen = typeof open === "boolean" ? open : elements.sortMenu.hidden;
    elements.sortMenu.hidden = !nextOpen;
    elements.sortToggle.setAttribute("aria-expanded", String(nextOpen));
    elements.sortDropdown.classList.toggle("is-open", nextOpen);
}

function toggleFilters(open) {
    const nextOpen = typeof open === "boolean" ? open : !elements.filtersPanel.classList.contains("is-open");
    elements.filtersPanel.classList.toggle("is-open", nextOpen);
    elements.filtersPanel.setAttribute("aria-hidden", String(!nextOpen));
    elements.filtersToggle.setAttribute("aria-expanded", String(nextOpen));
}

function resetFilters() {
    state.minRating = 0;
    state.locations.clear();
    state.categories.clear();
    elements.minRatingOptions.forEach((option) => {
        option.checked = option.value === "0";
    });
    renderLocationFilters();
    renderCategoryFilters();
    renderResults();
}

function renderResults() {
    const filtered = sortGyms(applyFilters(gyms));
    elements.resultsCount.textContent = String(filtered.length);

    if (filtered.length === 0) {
        elements.resultsGrid.innerHTML = "";
        elements.emptyState.hidden = false;
        return;
    }

    elements.emptyState.hidden = true;
    elements.resultsGrid.innerHTML = filtered.map(cardTemplate).join("");
}

function bindEvents() {
    elements.search.addEventListener("input", (event) => {
        state.query = event.target.value.trim().toLowerCase();
        renderResults();
    });

    elements.sortToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleSortDropdown();
    });

    elements.sortOptions.forEach((option) => {
        option.addEventListener("click", () => {
            const nextSort = option.dataset.sort;
            if (!nextSort) {
                return;
            }
            state.sortBy = nextSort;
            syncSortDropdown();
            renderResults();
            toggleSortDropdown(false);
        });
    });

    elements.filtersToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleFilters();
        toggleSortDropdown(false);
    });

    elements.minRatingOptions.forEach((option) => {
        option.addEventListener("change", (event) => {
            state.minRating = Number(event.target.value);
            renderResults();
        });
    });

    elements.resetFilters.addEventListener("click", () => {
        resetFilters();
    });

    document.addEventListener("click", (event) => {
        if (elements.filtersPanel.classList.contains("is-open")) {
            const clickedInside = elements.filtersPanel.contains(event.target) || elements.filtersToggle.contains(event.target);
            if (!clickedInside) {
                toggleFilters(false);
            }
        }

        if (!elements.sortMenu.hidden) {
            const clickedInSort = elements.sortDropdown.contains(event.target);
            if (!clickedInSort) {
                toggleSortDropdown(false);
            }
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            toggleSortDropdown(false);
            toggleFilters(false);
        }
    });
}

bindEvents();
syncSortDropdown();
renderLocationFilters();
renderCategoryFilters();
renderResults();
