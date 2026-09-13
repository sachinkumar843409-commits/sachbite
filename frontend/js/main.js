const API = "/api";
let siteSettings = {};

// ---------- Load categories ----------
let bestsellerNames = new Set();

async function loadBestsellers() {
  try {
    const res = await fetch(`${API}/analytics`);
    const data = await res.json();
    bestsellerNames = new Set((data.topItems || []).slice(0, 3).map((i) => i.name));
  } catch (e) {}
}

async function loadMenu() {
  const row = document.getElementById("categoryRow");
  if (!row) return;
  row.innerHTML = `<div class="sb-loading">⏳ Menu load ho raha hai...</div>`;
  try {
    await loadBestsellers();
    const res = await fetch(`${API}/menu`);
    const menu = await res.json();

    row.innerHTML = menu
      .filter((item) => item.available !== false)
      .map(
        (item) => `
      <div class="category-card" role="button" tabindex="0" onclick="addToCart('${escapeJs(item.name)}', ${item.price})">
        ${bestsellerNames.has(item.name) ? `<div class="bestseller-badge">🔥 Bestseller</div>` : ""}
        <img src="${categoryImageUrl(item.name, 200, 200, null, item.image)}" alt="" loading="lazy" width="200" height="200" />
        <div class="name">${escapeHtml(item.name)}</div>
        <div class="price">From ₹${item.price}</div>
      </div>`
      )
      .join("");

    // Keyboard support: Enter/Space activates a focused category card,
    // matching what a mouse click already does (onclick above).
    row.querySelectorAll(".category-card").forEach((card) => {
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          card.click();
        }
      });
    });
  } catch (e) {
    row.innerHTML = "<p>Menu load nahi ho paya. Backend chal raha hai check karein.</p>";
  }
}

// ---------- Load restaurants ----------
async function loadRestaurants() {
  const row = document.getElementById("restaurantRow");
  if (!row) return;
  try {
    const res = await fetch(`${API}/restaurants`);
    const restaurants = await res.json();
    row.innerHTML = restaurants
      .map(
        (r) => `
      <div class="restaurant-card">
        <a href="restaurant.html?name=${encodeURIComponent(r.name)}">
          <div class="restaurant-img">
            <img src="${restaurantImageUrl(r.name, 500, 340, null, r.image)}" alt="" loading="lazy" width="500" height="340" />
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
  } catch (e) {
    row.innerHTML = "<p>Restaurants load nahi ho paye. Backend chal raha hai check karein.</p>";
  }
}

// ---------- Hero + Banner images (Admin > Appearance se override ho sakti hain) ----------
async function loadHeroAndBanner() {
  try {
    const res = await fetch(`${API}/settings`);
    siteSettings = await res.json();
  } catch (e) {
    siteSettings = {};
  }

  const heroSection = document.getElementById("heroSection");
  const heroBg = document.getElementById("heroBg");
  const heroImg = document.getElementById("heroImg");
  if (heroSection && heroBg) {
    if (siteSettings.heroImage) {
      heroBg.style.backgroundImage = `url('${siteSettings.heroImage}')`;
      heroSection.classList.add("hero-photo-mode");
      if (heroImg) heroImg.removeAttribute("src");
    } else {
      heroBg.style.backgroundImage = "";
      heroSection.classList.remove("hero-photo-mode");
      if (heroImg) heroImg.src = foodImageUrl("pizza,food", 700, 500, 101);
    }

    heroBg.classList.remove("hero-anim-zoom", "hero-anim-pan", "hero-anim-fade");
    if (siteSettings.heroAnimation === "zoom") heroBg.classList.add("hero-anim-zoom");
    else if (siteSettings.heroAnimation === "pan") heroBg.classList.add("hero-anim-pan");
    else if (siteSettings.heroAnimation === "fade") heroBg.classList.add("hero-anim-fade");
  }

  // Optional floating/dancing food emojis — off by default, admin panel se on/off + emojis dono control hote hain
  const foodDecor = document.getElementById("heroFoodDecor");
  if (foodDecor) {
    foodDecor.style.display = siteSettings.heroFoodAnimation ? "block" : "none";

    const emojiList = (siteSettings.heroFoodEmojis || "🍕 🍔 🍛 🍜 🍰")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6);

    const slots = foodDecor.querySelectorAll(".decor-item");
    slots.forEach((slot, i) => {
      if (emojiList[i]) {
        slot.textContent = emojiList[i];
        slot.style.display = "";
      } else {
        slot.style.display = "none";
      }
    });
  }

  const bannerImg = document.getElementById("bannerImg");
  if (bannerImg) bannerImg.src = siteSettings.bannerImage || foodImageUrl("burger,food", 400, 260, 102);
}

// ---------- Search ----------
document.getElementById("searchBtn")?.addEventListener("click", () => {
  const q = document.getElementById("searchInput").value.trim();
  if (q) {
    window.location.href = `restaurants.html?q=${encodeURIComponent(q)}`;
  }
});
document.getElementById("searchInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("searchBtn").click();
});

loadMenu();
loadRestaurants();
loadHeroAndBanner();
