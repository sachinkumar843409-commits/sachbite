const API = "/api";
let currentMenu = [];

async function loadMenu() {
  const res = await fetch(`${API}/menu`);
  currentMenu = await res.json();
  renderMenu();
}

function renderMenu() {
  const grid = document.getElementById("menuGrid");
  if (currentMenu.length === 0) {
    grid.innerHTML = "<p style='color:var(--text-gray)'>Koi item nahi hai. '+ Add New Item' se add karein.</p>";
    return;
  }
  grid.innerHTML = currentMenu
    .map(
      (item) => `
    <div class="menu-item-card">
      <div class="menu-item-top">
        <div class="menu-item-icon">${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" />` : item.icon}</div>
        <div>
          <div class="menu-item-name">${item.name}</div>
          <div class="menu-item-cat">${item.category}</div>
        </div>
      </div>
      <div class="menu-item-price">₹${item.price}</div>
      <div class="menu-item-actions">
        <button class="btn-avail ${item.available ? "on" : "off"}" onclick="toggleAvailable('${item.id}', ${!item.available})">
          ${item.available ? "✅ Available" : "🚫 Unavailable"}
        </button>
      </div>
      <div class="menu-item-actions" style="margin-top:8px;">
        <button class="btn-edit-menu" onclick="openEditModal('${item.id}')">✏️ Edit</button>
        <button class="btn-del-menu" onclick="deleteItem('${item.id}')">🗑️ Delete</button>
      </div>
      <a href="appearance.html" style="display:block; text-align:center; margin-top:8px; font-size:11px; color:var(--text-gray);">🖼️ Photo change karne ke liye Appearance page</a>
    </div>`
    )
    .join("");
}

async function toggleAvailable(id, newValue) {
  await adminFetch(`${API}/menu/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ available: newValue }),
  });
  loadMenu();
}

async function deleteItem(id) {
  if (!confirm("Kya aap is item ko delete karna chahte hain?")) return;
  await adminFetch(`${API}/menu/${id}`, { method: "DELETE" });
  loadMenu();
}

// ---------- Modal ----------
const modal = document.getElementById("modalOverlay");

function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add New Item";
  document.getElementById("itemId").value = "";
  document.getElementById("itemName").value = "";
  document.getElementById("itemPrice").value = "";
  document.getElementById("itemCategory").value = "Main Course";
  document.getElementById("itemIcon").value = "🍽️";
  modal.classList.add("show");
}

function openEditModal(id) {
  const item = currentMenu.find((m) => m.id === id);
  if (!item) return;
  document.getElementById("modalTitle").textContent = "Edit Item";
  document.getElementById("itemId").value = item.id;
  document.getElementById("itemName").value = item.name;
  document.getElementById("itemPrice").value = item.price;
  document.getElementById("itemCategory").value = item.category;
  document.getElementById("itemIcon").value = item.icon;
  modal.classList.add("show");
}

document.getElementById("addItemBtn").addEventListener("click", openAddModal);
document.getElementById("cancelModalBtn").addEventListener("click", () => modal.classList.remove("show"));

document.getElementById("saveItemBtn").addEventListener("click", async () => {
  const id = document.getElementById("itemId").value;
  const name = document.getElementById("itemName").value.trim();
  const price = document.getElementById("itemPrice").value;
  const category = document.getElementById("itemCategory").value;
  const icon = document.getElementById("itemIcon").value.trim() || "🍽️";

  if (!name || !price) {
    alert("Name aur Price bharna zaroori hai.");
    return;
  }

  if (id) {
    await adminFetch(`${API}/menu/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, category, icon }),
    });
  } else {
    await adminFetch(`${API}/menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, category, icon }),
    });
  }

  modal.classList.remove("show");
  loadMenu();
});

loadMenu();
