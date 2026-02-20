const gyms = [
    {
        id: 1,
        name: "Iron Forge Fitness",
        address: { street: "221 Market St", city: "San Francisco", state: "CA" },
        coordinates: { lat: 37.7936, lng: -122.3965 },
        rating: 4.8,
        reviewCount: 412,
        priceTier: 3,
        categories: ["Strength Training", "Bodybuilding", "Cardio"],
        hours: { open: "05:00", close: "23:00" },
        distanceKm: 2.1
    },
    {
        id: 2,
        name: "Pulse CrossFit Yard",
        address: { street: "498 Mission Ave", city: "San Diego", state: "CA" },
        coordinates: { lat: 32.7152, lng: -117.1611 },
        rating: 4.6,
        reviewCount: 286,
        priceTier: 2,
        categories: ["CrossFit", "Strength Training"],
        hours: { open: "06:00", close: "22:00" },
        distanceKm: 5.4
    },
    {
        id: 3,
        name: "Zen Flex Studio",
        address: { street: "88 Lake Shore Dr", city: "Chicago", state: "IL" },
        coordinates: { lat: 41.8858, lng: -87.6229 },
        rating: 4.4,
        reviewCount: 198,
        priceTier: 2,
        categories: ["Yoga", "Cardio"],
        hours: { open: "06:30", close: "21:00" },
        distanceKm: 7.9
    },
    {
        id: 4,
        name: "MMA District Hub",
        address: { street: "410 Liberty St", city: "Austin", state: "TX" },
        coordinates: { lat: 30.2674, lng: -97.7428 },
        rating: 4.9,
        reviewCount: 521,
        priceTier: 4,
        categories: ["MMA", "Strength Training", "Cardio"],
        hours: { open: "05:30", close: "23:30" },
        distanceKm: 1.8
    },
    {
        id: 5,
        name: "Coreline Athletic Club",
        address: { street: "120 Main St", city: "Seattle", state: "WA" },
        coordinates: { lat: 47.6075, lng: -122.3331 },
        rating: 4.3,
        reviewCount: 167,
        priceTier: 1,
        categories: ["Cardio", "Yoga", "Strength Training"],
        hours: { open: "07:00", close: "21:30" },
        distanceKm: 12.2
    },
    {
        id: 6,
        name: "Titan Body Lab",
        address: { street: "15 Park Ave", city: "New York", state: "NY" },
        coordinates: { lat: 40.7459, lng: -73.9844 },
        rating: 4.7,
        reviewCount: 603,
        priceTier: 4,
        categories: ["Bodybuilding", "Strength Training"],
        hours: { open: "05:00", close: "00:00" },
        distanceKm: 3.6
    },
    {
        id: 7,
        name: "Vital Motion Gym",
        address: { street: "203 Elm St", city: "Denver", state: "CO" },
        coordinates: { lat: 39.7428, lng: -104.9914 },
        rating: 4.2,
        reviewCount: 132,
        priceTier: 1,
        categories: ["Cardio", "CrossFit"],
        hours: { open: "06:00", close: "20:00" },
        distanceKm: 9.1
    },
    {
        id: 8,
        name: "Summit Barbell House",
        address: { street: "640 Grand Ave", city: "Phoenix", state: "AZ" },
        coordinates: { lat: 33.4484, lng: -112.074 },
        rating: 4.5,
        reviewCount: 248,
        priceTier: 2,
        categories: ["Bodybuilding", "Strength Training"],
        hours: { open: "05:30", close: "22:30" },
        distanceKm: 14.8
    },
    {
        id: 9,
        name: "Urban Warrior Center",
        address: { street: "730 Broadway", city: "Nashville", state: "TN" },
        coordinates: { lat: 36.1651, lng: -86.7819 },
        rating: 4.1,
        reviewCount: 94,
        priceTier: 1,
        categories: ["MMA", "CrossFit", "Cardio"],
        hours: { open: "07:00", close: "22:00" },
        distanceKm: 18.5
    },
    {
        id: 10,
        name: "Balance & Burn",
        address: { street: "52 Bay St", city: "Boston", state: "MA" },
        coordinates: { lat: 42.3559, lng: -71.0544 },
        rating: 4.6,
        reviewCount: 320,
        priceTier: 3,
        categories: ["Yoga", "Cardio", "Strength Training"],
        hours: { open: "06:00", close: "22:00" },
        distanceKm: 6.8
    },
    {
        id: 11,
        name: "Forge 24 Athletics",
        address: { street: "915 River Rd", city: "Miami", state: "FL" },
        coordinates: { lat: 25.7742, lng: -80.1936 },
        rating: 4.4,
        reviewCount: 208,
        priceTier: 2,
        categories: ["Cardio", "MMA", "Strength Training"],
        hours: { open: "00:00", close: "23:59" },
        distanceKm: 4.2
    },
    {
        id: 12,
        name: "Northside Conditioning",
        address: { street: "402 Cedar Blvd", city: "Portland", state: "OR" },
        coordinates: { lat: 45.5155, lng: -122.6793 },
        rating: 3.9,
        reviewCount: 73,
        priceTier: 1,
        categories: ["CrossFit", "Strength Training", "Yoga"],
        hours: { open: "08:00", close: "20:00" },
        distanceKm: 22.4
    }
];

const state = {
    query: "",
    selectedCategories: new Set(),
    minRating: 0,
    maxDistance: 25,
    selectedPrices: new Set(),
    openNowOnly: false,
    sortBy: "distance"
};

const elements = {
    categoryChips: document.getElementById("category-chips"),
    ratingFilter: document.getElementById("rating-filter"),
    ratingValue: document.getElementById("rating-value"),
    distanceFilter: document.getElementById("distance-filter"),
    distanceValue: document.getElementById("distance-value"),
    priceButtons: Array.from(document.querySelectorAll(".tier-btn")),
    openNowToggle: document.getElementById("open-now-toggle"),
    resetFilters: document.getElementById("reset-filters"),
    sortSelect: document.getElementById("sort-select"),
    search: document.getElementById("gym-search"),
    resultsGrid: document.getElementById("results-grid"),
    resultsCount: document.getElementById("results-count"),
    resultsMeta: document.getElementById("results-meta"),
    emptyState: document.getElementById("empty-state")
};

function toMinutes(timeText) {
    const [h, m] = timeText.split(":").map(Number);
    return (h * 60) + m;
}

function isOpenNow(gym, now = new Date()) {
    const open = toMinutes(gym.hours.open);
    const close = toMinutes(gym.hours.close);
    const current = (now.getHours() * 60) + now.getMinutes();

    if (open === close) {
        return true;
    }

    if (close < open) {
        return current >= open || current <= close;
    }

    return current >= open && current <= close;
}

function getAllCategories() {
    return [...new Set(gyms.flatMap((gym) => gym.categories))].sort((a, b) => a.localeCompare(b));
}

function formatAddress(address) {
    return `${address.street}, ${address.city}, ${address.state}`;
}

function formatHours(hours) {
    return `${hours.open} - ${hours.close}`;
}

function formatPriceTier(priceTier) {
    return "$".repeat(priceTier);
}

function matchesFilters(gym) {
    const searchArea = `${gym.name} ${formatAddress(gym.address)}`.toLowerCase();
    const matchesSearch = !state.query || searchArea.includes(state.query);
    const matchesCategory = state.selectedCategories.size === 0 || gym.categories.some((category) => state.selectedCategories.has(category));
    const matchesRating = gym.rating >= state.minRating;
    const matchesDistance = gym.distanceKm <= state.maxDistance;
    const matchesPrice = state.selectedPrices.size === 0 || state.selectedPrices.has(gym.priceTier);
    const matchesOpenNow = !state.openNowOnly || isOpenNow(gym);

    return matchesSearch && matchesCategory && matchesRating && matchesDistance && matchesPrice && matchesOpenNow;
}

function sortGyms(items) {
    const sorted = [...items];

    if (state.sortBy === "distance") {
        sorted.sort((a, b) => a.distanceKm - b.distanceKm || b.rating - a.rating);
    } else if (state.sortBy === "rating") {
        sorted.sort((a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm);
    } else {
        sorted.sort((a, b) => a.priceTier - b.priceTier || b.rating - a.rating);
    }

    return sorted;
}

function createCategoryChip(category) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip-btn";
    button.textContent = category;

    if (state.selectedCategories.has(category)) {
        button.classList.add("active");
    }

    button.addEventListener("click", () => {
        if (state.selectedCategories.has(category)) {
            state.selectedCategories.delete(category);
        } else {
            state.selectedCategories.add(category);
        }
        render();
    });

    return button;
}

function renderCategoryChips() {
    const categories = getAllCategories();
    elements.categoryChips.innerHTML = "";
    categories.forEach((category) => {
        elements.categoryChips.appendChild(createCategoryChip(category));
    });
}

function gymCardTemplate(gym) {
    const open = isOpenNow(gym);
    const statusClass = open ? "status-open" : "status-closed";
    const statusText = open ? "Open" : "Closed";
    const categoryTags = gym.categories.map((category) => `<span class="category-tag">${category}</span>`).join("");

    return `
        <article class="gym-card">
            <div class="gym-top">
                <h3 class="gym-title">${gym.name}</h3>
                <span class="gym-distance">${gym.distanceKm.toFixed(1)} km</span>
            </div>
            <p class="gym-address">${formatAddress(gym.address)}</p>
            <p class="gym-hours">Hours: ${formatHours(gym.hours)}</p>
            <div class="gym-meta">
                <span class="rating-pill">${gym.rating.toFixed(1)} / 5 (${gym.reviewCount} reviews)</span>
                <span class="price-pill">${formatPriceTier(gym.priceTier)}</span>
                <span class="status-pill ${statusClass}">${statusText}</span>
            </div>
            <div class="category-tags">${categoryTags}</div>
        </article>
    `;
}

function getFilteredGyms() {
    return sortGyms(gyms.filter(matchesFilters));
}

function updateCountMeta(filteredCount) {
    elements.resultsCount.textContent = `${filteredCount} gym${filteredCount === 1 ? "" : "s"}`;
    elements.resultsMeta.textContent = `${filteredCount} of ${gyms.length} shown`;
}

function updateTierButtons() {
    elements.priceButtons.forEach((button) => {
        const tier = Number(button.dataset.tier);
        button.classList.toggle("active", state.selectedPrices.has(tier));
    });
}

function renderResults() {
    const filtered = getFilteredGyms();
    updateCountMeta(filtered.length);

    if (filtered.length === 0) {
        elements.resultsGrid.innerHTML = "";
        elements.emptyState.hidden = false;
        return;
    }

    elements.emptyState.hidden = true;
    elements.resultsGrid.innerHTML = filtered.map(gymCardTemplate).join("");
}

function resetState() {
    state.query = "";
    state.selectedCategories.clear();
    state.minRating = 0;
    state.maxDistance = 25;
    state.selectedPrices.clear();
    state.openNowOnly = false;
    state.sortBy = "distance";

    elements.search.value = "";
    elements.ratingFilter.value = "0";
    elements.distanceFilter.value = "25";
    elements.openNowToggle.checked = false;
    elements.sortSelect.value = "distance";
}

function syncControlLabels() {
    elements.ratingValue.textContent = state.minRating.toFixed(1);
    elements.distanceValue.textContent = `${state.maxDistance} km`;
}

function bindEvents() {
    elements.search.addEventListener("input", (event) => {
        state.query = event.target.value.trim().toLowerCase();
        render();
    });

    elements.ratingFilter.addEventListener("input", (event) => {
        state.minRating = Number(event.target.value);
        render();
    });

    elements.distanceFilter.addEventListener("input", (event) => {
        state.maxDistance = Number(event.target.value);
        render();
    });

    elements.priceButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const tier = Number(button.dataset.tier);
            if (state.selectedPrices.has(tier)) {
                state.selectedPrices.delete(tier);
            } else {
                state.selectedPrices.add(tier);
            }
            render();
        });
    });

    elements.openNowToggle.addEventListener("change", (event) => {
        state.openNowOnly = event.target.checked;
        render();
    });

    elements.sortSelect.addEventListener("change", (event) => {
        state.sortBy = event.target.value;
        render();
    });

    elements.resetFilters.addEventListener("click", () => {
        resetState();
        render();
    });
}

function render() {
    syncControlLabels();
    renderCategoryChips();
    updateTierButtons();
    renderResults();
}

bindEvents();
render();
