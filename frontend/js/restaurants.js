const API = "/api";
let allRestaurants = [];

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function renderRestaurants(list) {
  const row = document.getElementById("allRestaurantsRow");
  if (list.length === 0) {
    row.innerHTML = "<p style='color:var(--text-gray)'>Koi restaurant nahi mila.</p>";
    return;
  }
  row.innerHTML = list
    .map(
      (r, i) => `
    <div class="restaurant-card">
      <a href="restaurant.html?name=${encodeURIComponent(r.name)}">
        <div class="restaurant-img">
          <img src="${restaurantImageUrl(r.name, 500, 340, i + 1, r.image)}" alt="${r.name}" loading="lazy" />
          <div class="heart">🤍</div>
        </div>
        <div class="restaurant-body">
          <h3>${r.name}</h3>
          <div class="tags">${r.tags}</div>
          <div class="restaurant-meta">
            <span class="stars">⭐ ${r.rating} (${r.reviews})</span>
            <span>⏱ ${r.time}</span>
          </div>
          ${r.badge ? `<span class="badge-green">${r.badge}</span>` : ""}
        </div>
      </a>
    </div>`
    )
    .join("");
}

async function loadRestaurants() {
  const res = await fetch(`${API}/restaurants`);
  allRestaurants = await res.json();

  const q = getQueryParam("q");
  if (q) {
    document.getElementById("filterInput").value = q;
    filterRestaurants(q);
  } else {
    renderRestaurants(allRestaurants);
  }
}

function filterRestaurants(query) {
  const q = query.toLowerCase();
  const filtered = allRestaurants.filter(
    (r) => r.name.toLowerCase().includes(q) || r.tags.toLowerCase().includes(q)
  );
  renderRestaurants(filtered);
}

document.getElementById("filterInput").addEventListener("input", (e) => {
  filterRestaurants(e.target.value);
});

loadRestaurants();
