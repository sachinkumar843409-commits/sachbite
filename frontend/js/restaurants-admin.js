const API = "/api";
let currentRestaurants = [];

async function loadRestaurants() {
  const res = await fetch(`${API}/restaurants`);
  currentRestaurants = await res.json();
  renderRestaurants();
}

function renderRestaurants() {
  const grid = document.getElementById("restGrid");
  if (currentRestaurants.length === 0) {
    grid.innerHTML = "<p style='color:var(--text-gray)'>Koi restaurant nahi hai. '+ Add New Restaurant' se add karein.</p>";
    return;
  }
  grid.innerHTML = currentRestaurants
    .map(
      (r) => `
    <div class="rest-admin-card">
      <div class="rest-admin-top">
        <div class="rest-admin-thumb">${r.image ? `<img src="${r.image}" alt="${r.name}" />` : (r.icon || "🏪")}</div>
        <div>
          <div class="rest-admin-name">${r.name}</div>
          <div class="rest-admin-tags">${r.tags}</div>
        </div>
      </div>
      <div class="rest-admin-meta">
        <span>⭐ ${r.rating} (${r.reviews})</span>
        <span>⏱ ${r.time}</span>
      </div>
      ${r.badge ? `<span class="rest-admin-badge">${r.badge}</span>` : ""}
      <div style="font-size:11px; color:var(--text-gray); margin-bottom:10px; line-height:1.6;">
        ${r.contactEmail ? `📧 ${r.contactEmail}<br/>` : `<span style="color:#dc2626;">⚠️ Contact email nahi set hai — order notification nahi jayegi</span><br/>`}
        ${r.contactPhone ? `📞 ${r.contactPhone}` : ""}
      </div>
      <div class="rest-admin-actions">
        <button class="btn-edit-menu" onclick="openEditModal('${r.id}')">✏️ Edit</button>
        <button class="btn-del-menu" onclick="deleteRestaurant('${r.id}')">🗑️ Delete</button>
      </div>
      <a href="appearance.html" style="display:block; text-align:center; margin-top:8px; font-size:11px; color:var(--text-gray);">🖼️ Photo change karne ke liye Appearance page</a>
    </div>`
    )
    .join("");
}

async function deleteRestaurant(id) {
  if (!confirm("Kya aap is restaurant ko delete karna chahte hain?")) return;
  await adminFetch(`${API}/restaurants/${id}`, { method: "DELETE" });
  loadRestaurants();
}

// ---------- Modal ----------
const modal = document.getElementById("modalOverlay");

function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add New Restaurant";
  document.getElementById("restId").value = "";
  document.getElementById("restName").value = "";
  document.getElementById("restTags").value = "";
  document.getElementById("restRating").value = "4.5";
  document.getElementById("restReviews").value = "New";
  document.getElementById("restTime").value = "25-35 min";
  document.getElementById("restBadge").value = "";
  document.getElementById("restContactEmail").value = "";
  document.getElementById("restContactPhone").value = "";
  modal.classList.add("show");
}

function openEditModal(id) {
  const r = currentRestaurants.find((x) => x.id === id);
  if (!r) return;
  document.getElementById("modalTitle").textContent = "Edit Restaurant";
  document.getElementById("restId").value = r.id;
  document.getElementById("restName").value = r.name;
  document.getElementById("restTags").value = r.tags;
  document.getElementById("restRating").value = r.rating;
  document.getElementById("restReviews").value = r.reviews;
  document.getElementById("restTime").value = r.time;
  document.getElementById("restBadge").value = r.badge;
  document.getElementById("restContactEmail").value = r.contactEmail || "";
  document.getElementById("restContactPhone").value = r.contactPhone || "";
  modal.classList.add("show");
}

document.getElementById("addRestBtn").addEventListener("click", openAddModal);
document.getElementById("cancelModalBtn").addEventListener("click", () => modal.classList.remove("show"));

document.getElementById("saveRestBtn").addEventListener("click", async () => {
  const id = document.getElementById("restId").value;
  const name = document.getElementById("restName").value.trim();
  const tags = document.getElementById("restTags").value.trim();
  const rating = document.getElementById("restRating").value;
  const reviews = document.getElementById("restReviews").value.trim();
  const time = document.getElementById("restTime").value.trim();
  const badge = document.getElementById("restBadge").value.trim();
  const contactEmail = document.getElementById("restContactEmail").value.trim();
  const contactPhone = document.getElementById("restContactPhone").value.trim();

  if (!name) {
    alert("Restaurant ka naam bharna zaroori hai.");
    return;
  }

  const body = { name, tags, rating, reviews, time, badge, contactEmail, contactPhone };

  if (id) {
    await adminFetch(`${API}/restaurants/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } else {
    await adminFetch(`${API}/restaurants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  modal.classList.remove("show");
  loadRestaurants();
});

// ---------- Sales report ----------
async function loadSalesReport() {
  const res = await fetch(`${API}/restaurants/sales-report`);
  const report = await res.json();
  const tbody = document.getElementById("reportBody");

  if (report.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-gray);">Abhi koi order nahi hua hai.</td></tr>`;
    return;
  }

  tbody.innerHTML = report
    .map(
      (r) => `
    <tr>
      <td>${r.restaurant}</td>
      <td>${r.totalOrders}</td>
      <td>${r.totalItemsSold}</td>
      <td>Rs ${r.totalRevenue}</td>
    </tr>`
    )
    .join("");
}

loadRestaurants();
loadSalesReport();
