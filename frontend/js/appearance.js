const API = "/api";

let settings = {};
let restaurants = [];
let menu = [];
let offers = [];
let mediaLibrary = [];

// Kaunsa slot abhi "active" hai jiske liye file manager khula hai
// { kind: "hero" | "banner" | "restaurant" | "menu" | "offer", id: <item id, hero/banner ke liye null> }
let activePicker = null;

// ---------- Initial load ----------
async function loadAll() {
  const [settingsRes, restaurantsRes, menuRes, offersRes] = await Promise.all([
    fetch(`${API}/settings`),
    fetch(`${API}/restaurants`),
    fetch(`${API}/menu`),
    fetch(`${API}/offers`),
  ]);
  settings = await settingsRes.json();
  restaurants = await restaurantsRes.json();
  menu = await menuRes.json();
  offers = await offersRes.json();

  renderSlots();
  renderRestaurantGrid();
  renderMenuGrid();
  renderOffersGrid();
}

// ---------- Hero / Banner slots ----------
function renderSlots() {
  const heroEl = document.getElementById("heroPreview");
  if (settings.heroImage) {
    heroEl.innerHTML = `<img src="${settings.heroImage}" alt="Hero image" />`;
  } else {
    heroEl.textContent = "Koi image nahi — default gradient dikh raha hai";
  }

  const bannerEl = document.getElementById("bannerPreview");
  if (settings.bannerImage) {
    bannerEl.innerHTML = `<img src="${settings.bannerImage}" alt="Banner image" />`;
  } else {
    bannerEl.textContent = "Koi image nahi — default gradient dikh raha hai";
  }

  const animSelect = document.getElementById("heroAnimationSelect");
  if (animSelect) animSelect.value = settings.heroAnimation || "none";

  const foodAnimToggle = document.getElementById("heroFoodAnimToggle");
  if (foodAnimToggle) foodAnimToggle.checked = !!settings.heroFoodAnimation;

  const foodEmojisInput = document.getElementById("heroFoodEmojisInput");
  if (foodEmojisInput) foodEmojisInput.value = settings.heroFoodEmojis || "🍕 🍔 🍛 🍜 🍰";
}

async function clearSlot(kind) {
  const field = kind === "hero" ? "heroImage" : "bannerImage";
  const body = {};
  body[field] = null;
  const res = await adminFetch(`${API}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  settings = await res.json();
  renderSlots();
}

// ---------- Restaurant photo grid ----------
function renderRestaurantGrid() {
  const grid = document.getElementById("restaurantGrid");
  if (restaurants.length === 0) {
    grid.innerHTML = "<p class='empty-note'>Koi restaurant nahi hai.</p>";
    return;
  }
  grid.innerHTML = restaurants
    .map(
      (r) => `
    <div class="photo-card">
      <div class="thumb">${r.image ? `<img src="${r.image}" alt="${r.name}" />` : (r.icon || "🏪")}</div>
      <div class="meta">
        <div class="pname">${r.name}</div>
        <div class="pactions">
          <button class="btn-mini primary" onclick="openPickerFor('restaurant', '${r.id}')">🖼️ Change</button>
          ${r.image ? `<button class="btn-mini danger" onclick="removeItemImage('restaurant', '${r.id}')">✖</button>` : ""}
        </div>
      </div>
    </div>`
    )
    .join("");
}

// ---------- Menu item photo grid ----------
function renderMenuGrid() {
  const grid = document.getElementById("menuGrid");
  if (menu.length === 0) {
    grid.innerHTML = "<p class='empty-note'>Koi menu item nahi hai.</p>";
    return;
  }
  grid.innerHTML = menu
    .map(
      (m) => `
    <div class="photo-card">
      <div class="thumb">${m.image ? `<img src="${m.image}" alt="${m.name}" />` : (m.icon || "🍽️")}</div>
      <div class="meta">
        <div class="pname">${m.name}</div>
        <div class="pactions">
          <button class="btn-mini primary" onclick="openPickerFor('menu', '${m.id}')">🖼️ Change</button>
          ${m.image ? `<button class="btn-mini danger" onclick="removeItemImage('menu', '${m.id}')">✖</button>` : ""}
        </div>
      </div>
    </div>`
    )
    .join("");
}

// ---------- Offer image grid ----------
function renderOffersGrid() {
  const grid = document.getElementById("offersGrid");
  if (offers.length === 0) {
    grid.innerHTML = "<p class='empty-note'>Koi offer nahi hai.</p>";
    return;
  }
  grid.innerHTML = offers
    .map(
      (o) => `
    <div class="photo-card">
      <div class="thumb">${o.image ? `<img src="${o.image}" alt="${o.title}" />` : "🏷️"}</div>
      <div class="meta">
        <div class="pname">${o.title}</div>
        <div class="pactions">
          <button class="btn-mini primary" onclick="openPickerFor('offer', '${o.id}')">🖼️ Change</button>
          ${o.image ? `<button class="btn-mini danger" onclick="removeItemImage('offer', '${o.id}')">✖</button>` : ""}
        </div>
      </div>
    </div>`
    )
    .join("");
}

// ---------- Apply a chosen image URL to whichever entity it belongs to ----------
async function applyImageToEntity(kind, id, url) {
  if (kind === "hero") {
    const res = await adminFetch(`${API}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroImage: url }),
    });
    settings = await res.json();
    renderSlots();
    return;
  }
  if (kind === "banner") {
    const res = await adminFetch(`${API}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bannerImage: url }),
    });
    settings = await res.json();
    renderSlots();
    return;
  }
  if (kind === "restaurant") {
    await adminFetch(`${API}/restaurants/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: url }),
    });
    const r = await fetch(`${API}/restaurants`);
    restaurants = await r.json();
    renderRestaurantGrid();
    return;
  }
  if (kind === "menu") {
    await adminFetch(`${API}/menu/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: url }),
    });
    const r = await fetch(`${API}/menu`);
    menu = await r.json();
    renderMenuGrid();
    return;
  }
  if (kind === "offer") {
    await adminFetch(`${API}/offers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: url }),
    });
    const r = await fetch(`${API}/offers`);
    offers = await r.json();
    renderOffersGrid();
    return;
  }
}

async function removeItemImage(kind, id) {
  if (!confirm("Photo hatana chahte hain?")) return;
  await applyImageToEntity(kind, id, null);
}

// ---------- File Manager Modal ----------
const fmOverlay = document.getElementById("fmOverlay");
const fmDropzone = document.getElementById("fmDropzone");
const fmFileInput = document.getElementById("fmFileInput");
const fmUploadStatus = document.getElementById("fmUploadStatus");

async function openPickerFor(kind, id) {
  activePicker = { kind, id: id || null };
  fmOverlay.classList.add("show");
  await refreshMediaLibrary();
}

function closePicker() {
  fmOverlay.classList.remove("show");
  activePicker = null;
}

async function refreshMediaLibrary() {
  const res = await fetch(`${API}/uploads`);
  mediaLibrary = await res.json();
  renderMediaGrid();
}

function renderMediaGrid() {
  const grid = document.getElementById("fmGrid");
  if (mediaLibrary.length === 0) {
    grid.innerHTML = "<p class='empty-note'>Abhi tak koi image upload nahi hui. Upar se ek upload karein.</p>";
    return;
  }
  grid.innerHTML = mediaLibrary
    .map(
      (f) => `
    <div class="fm-item" onclick="pickMediaImage('${f.url}')">
      <img src="${f.url}" alt="${f.originalName}" loading="lazy" />
      <button class="fm-del" title="Delete image" onclick="event.stopPropagation(); deleteMediaImage('${f.filename}')">🗑️</button>
    </div>`
    )
    .join("");
}

async function pickMediaImage(url) {
  if (!activePicker) return;
  await applyImageToEntity(activePicker.kind, activePicker.id, url);
  closePicker();
}

async function deleteMediaImage(filename) {
  if (!confirm("Ye image library se permanently delete ho jaayegi. Continue karein?")) return;
  await adminFetch(`${API}/uploads/${filename}`, { method: "DELETE" });
  await refreshMediaLibrary();
}

// ---------- Upload handling (click + drag & drop) ----------
fmDropzone.addEventListener("click", () => fmFileInput.click());

fmFileInput.addEventListener("change", () => {
  if (fmFileInput.files && fmFileInput.files[0]) uploadFile(fmFileInput.files[0]);
});

["dragenter", "dragover"].forEach((evt) =>
  fmDropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    fmDropzone.classList.add("drag");
  })
);
["dragleave", "drop"].forEach((evt) =>
  fmDropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    fmDropzone.classList.remove("drag");
  })
);
fmDropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

async function uploadFile(file) {
  if (!file.type.startsWith("image/")) {
    alert("Sirf image files upload ki ja sakti hain.");
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    alert("Image 3MB se badi nahi honi chahiye.");
    return;
  }

  fmUploadStatus.style.display = "block";
  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await adminFetch(`${API}/upload`, { method: "POST", body: formData });

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      throw new Error("Server se sahi response nahi mila. Image chhoti karke (2MB se kam) dobara try karein.");
    }

    if (!res.ok) throw new Error(data.error || "Upload fail hua");

    // Upload hote hi seedha active slot par apply kar do — file manager ka pura point yahi hai
    if (activePicker) {
      await applyImageToEntity(activePicker.kind, activePicker.id, data.url);
      closePicker();
    } else {
      await refreshMediaLibrary();
    }
  } catch (e) {
    alert("Upload fail: " + e.message);
  } finally {
    fmUploadStatus.style.display = "none";
    fmFileInput.value = "";
  }
}

const heroAnimationSelect = document.getElementById("heroAnimationSelect");
if (heroAnimationSelect) {
  heroAnimationSelect.addEventListener("change", async () => {
    const res = await adminFetch(`${API}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroAnimation: heroAnimationSelect.value }),
    });
    settings = await res.json();
  });
}

const heroFoodAnimToggle = document.getElementById("heroFoodAnimToggle");
if (heroFoodAnimToggle) {
  heroFoodAnimToggle.addEventListener("change", async () => {
    const res = await adminFetch(`${API}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroFoodAnimation: heroFoodAnimToggle.checked }),
    });
    settings = await res.json();
  });
}

const heroFoodEmojisInput = document.getElementById("heroFoodEmojisInput");
if (heroFoodEmojisInput) {
  heroFoodEmojisInput.addEventListener("blur", async () => {
    const value = heroFoodEmojisInput.value.trim() || "🍕 🍔 🍛 🍜 🍰";
    heroFoodEmojisInput.value = value;
    const res = await adminFetch(`${API}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroFoodEmojis: value }),
    });
    settings = await res.json();
  });
}

loadAll();
