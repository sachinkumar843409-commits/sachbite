const API = "/api";

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function loadRestaurantPage() {
  const name = getQueryParam("name");
  if (!name) {
    document.getElementById("restName").textContent = "Restaurant nahi mila";
    return;
  }

  const [restaurantRes, menuRes] = await Promise.all([
    fetch(`${API}/restaurants/details?name=${encodeURIComponent(name)}`),
    fetch(`${API}/menu`),
  ]);
  const menu = await menuRes.json();

  if (!restaurantRes.ok) {
    document.getElementById("restName").textContent = "Restaurant nahi mila";
    return;
  }
  const restaurant = await restaurantRes.json();

  document.title = `${restaurant.name} - SachBite`;
  document.getElementById("restBannerImg").src = restaurantImageUrl(restaurant.name, 1200, 400, 1, restaurant.image);
  document.getElementById("restName").textContent = restaurant.name;
  document.getElementById("restTags").textContent = restaurant.tags;
  if (restaurant.rating) {
    document.getElementById("restRating").textContent = `⭐ ${restaurant.rating} (${restaurant.reviews})`;
  } else {
    document.getElementById("restRating").style.display = "none";
  }
  document.getElementById("restTime").textContent = `⏱ ${restaurant.time}`;
  document.getElementById("restBadge").textContent = restaurant.badge;

  const pdfLink = document.getElementById("restMenuPdfLink");
  if (restaurant.menuPdfUrl) {
    pdfLink.href = restaurant.menuPdfUrl;
    pdfLink.style.display = "inline-block";
  }

  const menuList = document.getElementById("menuList");
  const availableItems = menu.filter((item) => item.available !== false);

  if (availableItems.length === 0) {
    menuList.innerHTML = "<p style='color:var(--text-gray)'>Abhi menu available nahi hai.</p>";
    return;
  }

  menuList.innerHTML = availableItems
    .map(
      (item, i) => `
    <div class="menu-item-row">
      <div class="left">
        <img src="${categoryImageUrl(item.name, 120, 120, i + 1, item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />
        <div>
          <div class="name">${escapeHtml(item.name)}</div>
          <div class="price">₹${item.price}</div>
        </div>
      </div>
      <button class="btn btn-primary" onclick="addToCart('${escapeJs(item.name)}', ${item.price}, '${escapeJs(restaurant.name)}')">+ Add</button>
    </div>`
    )
    .join("");
}

loadRestaurantPage();
