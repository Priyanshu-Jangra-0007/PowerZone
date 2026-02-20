const gyms = [
  { id: 1, name: "Iron Forge Gym", area: "Pari Chowk", fullAddress: "Plot 2, Near India Expo Mart, Pari Chowk, Greater Noida", latitude: 28.4652, longitude: 77.5036, rating: 4.7, reviews: 382, categories: ["Strength", "Cardio"], priceTier: 3, openTime: "05:00", closeTime: "23:00" },
  { id: 2, name: "Powerline Fitness", area: "Pari Chowk", fullAddress: "Techzone Link Road, Pari Chowk, Greater Noida", latitude: 28.4639, longitude: 77.5068, rating: 4.4, reviews: 214, categories: ["CrossFit", "Cardio"], priceTier: 2, openTime: "06:00", closeTime: "22:00" },
  { id: 3, name: "Corefit Studio", area: "Pari Chowk", fullAddress: "Near Omaxe Connaught Place, Pari Chowk, Greater Noida", latitude: 28.4671, longitude: 77.5007, rating: 4.6, reviews: 176, categories: ["Yoga", "Strength"], priceTier: 2, openTime: "06:00", closeTime: "21:30" },

  { id: 4, name: "Alpha One Fitness Hub", area: "Alpha 1", fullAddress: "C-Block Market, Alpha 1, Greater Noida", latitude: 28.4758, longitude: 77.4958, rating: 4.5, reviews: 265, categories: ["Strength", "Bodybuilding"], priceTier: 2, openTime: "05:30", closeTime: "22:30" },
  { id: 5, name: "Muscle District", area: "Alpha 1", fullAddress: "Near Alpha 1 Metro Side Road, Greater Noida", latitude: 28.4744, longitude: 77.4974, rating: 4.3, reviews: 149, categories: ["Bodybuilding", "Cardio"], priceTier: 1, openTime: "06:00", closeTime: "22:00" },
  { id: 6, name: "Urban Lift Arena", area: "Alpha 1", fullAddress: "Alpha Commercial Belt, Alpha 1, Greater Noida", latitude: 28.4769, longitude: 77.4939, rating: 4.8, reviews: 438, categories: ["CrossFit", "Strength"], priceTier: 3, openTime: "05:00", closeTime: "23:30" },

  { id: 7, name: "Alpha 2 Active Club", area: "Alpha 2", fullAddress: "Sector Alpha 2 Central Arcade, Greater Noida", latitude: 28.4712, longitude: 77.4882, rating: 4.2, reviews: 121, categories: ["Cardio", "Yoga"], priceTier: 1, openTime: "06:30", closeTime: "21:30" },
  { id: 8, name: "Titan Sports Gym", area: "Alpha 2", fullAddress: "Plot 11, Alpha 2 Main Road, Greater Noida", latitude: 28.4728, longitude: 77.4901, rating: 4.6, reviews: 310, categories: ["MMA", "Strength"], priceTier: 3, openTime: "05:30", closeTime: "23:00" },
  { id: 9, name: "Zen Flex Alpha", area: "Alpha 2", fullAddress: "Near Alpha 2 Community Park, Greater Noida", latitude: 28.4702, longitude: 77.4867, rating: 4.1, reviews: 98, categories: ["Yoga", "Cardio"], priceTier: 1, openTime: "07:00", closeTime: "21:00" },

  { id: 10, name: "Beta One Barbell", area: "Beta 1", fullAddress: "Beta 1 Shopping Complex, Greater Noida", latitude: 28.4786, longitude: 77.5105, rating: 4.9, reviews: 520, categories: ["Bodybuilding", "Strength"], priceTier: 4, openTime: "05:00", closeTime: "00:00" },
  { id: 11, name: "Peak Motion Center", area: "Beta 1", fullAddress: "Near Kendriya Vihar, Beta 1, Greater Noida", latitude: 28.4801, longitude: 77.5121, rating: 4.5, reviews: 240, categories: ["Cardio", "CrossFit"], priceTier: 2, openTime: "06:00", closeTime: "22:30" },
  { id: 12, name: "Fitline Beta Studio", area: "Beta 1", fullAddress: "Block D, Beta 1, Greater Noida", latitude: 28.4771, longitude: 77.5084, rating: 4.0, reviews: 88, categories: ["Yoga", "Strength"], priceTier: 1, openTime: "07:00", closeTime: "21:00" },

  { id: 13, name: "Beta 2 Elite Gym", area: "Beta 2", fullAddress: "Market Road, Beta 2, Greater Noida", latitude: 28.4833, longitude: 77.5176, rating: 4.4, reviews: 207, categories: ["Strength", "Cardio"], priceTier: 2, openTime: "06:00", closeTime: "22:00" },
  { id: 14, name: "Combat Fit House", area: "Beta 2", fullAddress: "Near Beta 2 Roundabout, Greater Noida", latitude: 28.4848, longitude: 77.5195, rating: 4.7, reviews: 331, categories: ["MMA", "CrossFit"], priceTier: 3, openTime: "05:30", closeTime: "23:00" },
  { id: 15, name: "Pulse Factory", area: "Beta 2", fullAddress: "Sector Beta 2 Plaza, Greater Noida", latitude: 28.4822, longitude: 77.5161, rating: 3.9, reviews: 73, categories: ["Cardio", "Yoga"], priceTier: 1, openTime: "07:00", closeTime: "20:30" },

  { id: 16, name: "KP2 Fitness Lab", area: "Knowledge Park 2", fullAddress: "Near Galgotias Circle, Knowledge Park 2, Greater Noida", latitude: 28.4691, longitude: 77.4929, rating: 4.6, reviews: 294, categories: ["Strength", "CrossFit"], priceTier: 2, openTime: "05:30", closeTime: "22:30" },
  { id: 17, name: "Campus Core Gym", area: "Knowledge Park 2", fullAddress: "Tech Institute Lane, Knowledge Park 2, Greater Noida", latitude: 28.4678, longitude: 77.4906, rating: 4.3, reviews: 166, categories: ["Cardio", "Strength"], priceTier: 1, openTime: "06:00", closeTime: "22:00" },
  { id: 18, name: "Scholars Strength Club", area: "Knowledge Park 2", fullAddress: "Opp. Knowledge Park Police Post, Greater Noida", latitude: 28.4705, longitude: 77.4942, rating: 4.8, reviews: 406, categories: ["Bodybuilding", "Strength"], priceTier: 3, openTime: "05:00", closeTime: "23:30" },

  { id: 19, name: "KP3 Performance Gym", area: "Knowledge Park 3", fullAddress: "Knowledge Park 3 Main Boulevard, Greater Noida", latitude: 28.4586, longitude: 77.4863, rating: 4.5, reviews: 227, categories: ["Strength", "Cardio"], priceTier: 2, openTime: "06:00", closeTime: "22:00" },
  { id: 20, name: "Athlete Zone KP3", area: "Knowledge Park 3", fullAddress: "Near ITS Junction, Knowledge Park 3, Greater Noida", latitude: 28.4572, longitude: 77.4838, rating: 4.1, reviews: 110, categories: ["CrossFit", "MMA"], priceTier: 2, openTime: "06:30", closeTime: "22:00" },
  { id: 21, name: "Balance Point Studio", area: "Knowledge Park 3", fullAddress: "KP3 Institutional Strip, Greater Noida", latitude: 28.4601, longitude: 77.4881, rating: 3.8, reviews: 64, categories: ["Yoga", "Cardio"], priceTier: 1, openTime: "07:00", closeTime: "21:00" },
  { id: 22, name: "Engine Room Fitness", area: "Knowledge Park 3", fullAddress: "Service Lane, Knowledge Park 3, Greater Noida", latitude: 28.4594, longitude: 77.4855, rating: 4.9, reviews: 548, categories: ["Bodybuilding", "CrossFit"], priceTier: 4, openTime: "05:00", closeTime: "23:59" }
];

const mapMarkers = gyms.map((gym) => ({
  name: gym.name,
  lat: gym.latitude,
  lng: gym.longitude
}));

const referencePoint = { lat: 28.4652, lng: 77.5036 };

const state = {
  selectedCategories: new Set(),
  minRating: 0,
  priceTier: 0,
  area: "all",
  openNow: false,
  sortBy: "rating",
  searchTerm: ""
};

const gymGrid = document.getElementById("gymGrid");
const emptyState = document.getElementById("emptyState");
const resultCount = document.getElementById("resultCount");
const resultMeta = document.getElementById("resultMeta");
const categoryFilters = document.getElementById("categoryFilters");
const searchInput = document.getElementById("searchInput");
const ratingFilter = document.getElementById("ratingFilter");
const priceFilter = document.getElementById("priceFilter");
const areaFilter = document.getElementById("areaFilter");
const openNowFilter = document.getElementById("openNowFilter");
const sortSelect = document.getElementById("sortSelect");
const resetBtn = document.getElementById("resetBtn");

function timeToMinutes(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function getOpenNow(gym) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const open = timeToMinutes(gym.openTime);
  const close = timeToMinutes(gym.closeTime);

  if (close < open) {
    return current >= open || current <= close;
  }

  return current >= open && current <= close;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function starText(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function priceText(tier) {
  return "$".repeat(tier);
}

function searchGyms(list) {
  if (!state.searchTerm) return list;
  return list.filter((gym) => {
    const text = (gym.name + " " + gym.area).toLowerCase();
    return text.includes(state.searchTerm);
  });
}

function applyFilters(list) {
  return list.filter((gym) => {
    const categoryMatch =
      state.selectedCategories.size === 0 ||
      gym.categories.some((cat) => state.selectedCategories.has(cat));

    const ratingMatch = gym.rating >= state.minRating;
    const priceMatch = state.priceTier === 0 || gym.priceTier === state.priceTier;
    const areaMatch = state.area === "all" || gym.area === state.area;
    const openMatch = !state.openNow || getOpenNow(gym);

    return categoryMatch && ratingMatch && priceMatch && areaMatch && openMatch;
  });
}

function sortGyms(list) {
  const next = [...list];

  if (state.sortBy === "rating") {
    next.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  } else if (state.sortBy === "nearest") {
    next.sort((a, b) => {
      const aDist = getDistanceKm(referencePoint.lat, referencePoint.lng, a.latitude, a.longitude);
      const bDist = getDistanceKm(referencePoint.lat, referencePoint.lng, b.latitude, b.longitude);
      return aDist - bDist;
    });
  } else {
    next.sort((a, b) => a.priceTier - b.priceTier || b.rating - a.rating);
  }

  return next;
}

function gymCard(gym) {
  const open = getOpenNow(gym);
  const statusClass = open ? "open" : "closed";
  const statusText = open ? "Open" : "Closed";
  const tags = gym.categories.map((c) => `<span class="tag">${c}</span>`).join("");

  return `
    <article class="gym-card">
      <div class="gym-top">
        <h3 class="gym-name">${gym.name}</h3>
        <span class="badge ${statusClass}">${statusText}</span>
      </div>
      <p class="meta"><strong>${gym.area}</strong> | ${priceText(gym.priceTier)}</p>
      <p class="address">${gym.fullAddress}</p>
      <p class="meta">Hours: ${gym.openTime} - ${gym.closeTime}</p>
      <div class="rating">
        <span class="stars">${starText(gym.rating)}</span>
        <span>${gym.rating.toFixed(1)} (${gym.reviews} reviews)</span>
      </div>
      <div class="tag-wrap">${tags}</div>
    </article>
  `;
}

function renderGyms() {
  const searched = searchGyms(gyms);
  const filtered = applyFilters(searched);
  const sorted = sortGyms(filtered);

  gymGrid.innerHTML = sorted.map(gymCard).join("");
  emptyState.hidden = sorted.length !== 0;
  resultCount.textContent = `${sorted.length} gym${sorted.length === 1 ? "" : "s"}`;
  resultMeta.textContent = `${sorted.length} of ${gyms.length} listed gyms`;
}

function setupCategoryFilters() {
  const categories = [...new Set(gyms.flatMap((g) => g.categories))].sort();
  categoryFilters.innerHTML = "";

  categories.forEach((category) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = category;

    btn.addEventListener("click", () => {
      if (state.selectedCategories.has(category)) {
        state.selectedCategories.delete(category);
        btn.classList.remove("active");
      } else {
        state.selectedCategories.add(category);
        btn.classList.add("active");
      }
      renderGyms();
    });

    categoryFilters.appendChild(btn);
  });
}

function setupAreaFilter() {
  const areas = [...new Set(gyms.map((g) => g.area))].sort();
  areas.forEach((area) => {
    const option = document.createElement("option");
    option.value = area;
    option.textContent = area;
    areaFilter.appendChild(option);
  });
}

function resetFilters() {
  state.selectedCategories.clear();
  state.minRating = 0;
  state.priceTier = 0;
  state.area = "all";
  state.openNow = false;
  state.sortBy = "rating";
  state.searchTerm = "";

  searchInput.value = "";
  ratingFilter.value = "0";
  priceFilter.value = "0";
  areaFilter.value = "all";
  openNowFilter.checked = false;
  sortSelect.value = "rating";

  document.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
  renderGyms();
}

searchInput.addEventListener("input", (e) => {
  state.searchTerm = e.target.value.trim().toLowerCase();
  renderGyms();
});

ratingFilter.addEventListener("change", (e) => {
  state.minRating = Number(e.target.value);
  renderGyms();
});

priceFilter.addEventListener("change", (e) => {
  state.priceTier = Number(e.target.value);
  renderGyms();
});

areaFilter.addEventListener("change", (e) => {
  state.area = e.target.value;
  renderGyms();
});

openNowFilter.addEventListener("change", (e) => {
  state.openNow = e.target.checked;
  renderGyms();
});

sortSelect.addEventListener("change", (e) => {
  state.sortBy = e.target.value;
  renderGyms();
});

resetBtn.addEventListener("click", resetFilters);

setupCategoryFilters();
setupAreaFilter();
renderGyms();

window.mapMarkers = mapMarkers;
