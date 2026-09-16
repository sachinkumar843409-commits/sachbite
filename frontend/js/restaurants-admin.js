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
      <div style="font-size:11px; color:var(--text-gray); margin-bottom:6px;">
        ${r.menuPdfUrl ? `📄 Menu PDF uploaded` : `<span style="color:#b45309;">📄 Menu PDF nahi hai</span>`}
      </div>
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
  document.getElementById("restRating").value = "";
  document.getElementById("restReviews").value = "";
  document.getElementById("restTime").value = "25-35 min";
  document.getElementById("restBadge").value = "";
  document.getElementById("restContactEmail").value = "";
  document.getElementById("restContactPhone").value = "";
  document.getElementById("menuPdfSection").style.display = "none";
  modal.classList.add("show");
}

function openEditModal(id) {
  const r = currentRestaurants.find((x) => x.id === id);
  if (!r) return;
  document.getElementById("modalTitle").textContent = "Edit Restaurant";
  document.getElementById("restId").value = r.id;
  document.getElementById("restName").value = r.name;
  document.getElementById("restTags").value = r.tags;
  document.getElementById("restRating").value = r.rating || "";
  document.getElementById("restReviews").value = r.reviews || "";
  document.getElementById("restTime").value = r.time;
  document.getElementById("restBadge").value = r.badge;
  document.getElementById("restContactEmail").value = r.contactEmail || "";
  document.getElementById("restContactPhone").value = r.contactPhone || "";
  renderMenuPdfStatus(r);
  document.getElementById("menuPdfSection").style.display = "block";
  modal.classList.add("show");
}

function renderMenuPdfStatus(r) {
  const statusEl = document.getElementById("menuPdfCurrentStatus");
  const deleteBtn = document.getElementById("deleteMenuPdfBtn");
  const extractBtn = document.getElementById("extractMenuPdfBtn");
  document.getElementById("menuPdfMsg").textContent = "";
  document.getElementById("menuPdfFile").value = "";
  document.getElementById("extractMsg").textContent = "";
  document.getElementById("extractReviewWrap").style.display = "none";
  document.getElementById("extractItemsList").innerHTML = "";

  if (r.menuPdfUrl) {
    let viewUrl = r.menuPdfUrl;
    try {
      const base64 = r.menuPdfUrl.split(",")[1] || "";
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      viewUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    } catch (e) {
      // fallback to raw data URL if conversion fails for any reason
    }
    statusEl.innerHTML = `✅ Current menu: <a href="${viewUrl}" target="_blank" rel="noopener">${escapeHtml(r.menuPdfName || "menu.pdf")}</a>`;
    deleteBtn.style.display = "inline-block";
    extractBtn.style.display = "inline-block";
  } else {
    statusEl.innerHTML = `<span style="color:var(--text-gray);">Koi menu PDF upload nahi hui abhi.</span>`;
    deleteBtn.style.display = "none";
    extractBtn.style.display = "none";
  }
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

document.getElementById("uploadMenuPdfBtn").addEventListener("click", async () => {
  const id = document.getElementById("restId").value;
  const fileInput = document.getElementById("menuPdfFile");
  const msgEl = document.getElementById("menuPdfMsg");

  if (!id) return; // safety — button is hidden for new restaurants anyway
  if (!fileInput.files[0]) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "Pehle ek PDF file select karein.";
    return;
  }

  const formData = new FormData();
  formData.append("menuPdf", fileInput.files[0]);

  msgEl.style.color = "var(--text-gray)";
  msgEl.textContent = "Upload ho raha hai...";

  try {
    const res = await adminFetch(`${API}/restaurants/${id}/menu-pdf`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload fail hua");

    msgEl.style.color = "var(--green)";
    msgEl.textContent = "✅ PDF upload ho gayi.";
    await loadRestaurants();
    const updated = currentRestaurants.find((x) => x.id === id);
    if (updated) renderMenuPdfStatus(updated);
  } catch (e) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "❌ " + e.message;
  }
});

document.getElementById("deleteMenuPdfBtn").addEventListener("click", async () => {
  const id = document.getElementById("restId").value;
  if (!id) return;
  if (!confirm("Kya aap is restaurant ki menu PDF hatana chahte hain?")) return;

  await adminFetch(`${API}/restaurants/${id}/menu-pdf`, { method: "DELETE" });
  await loadRestaurants();
  const updated = currentRestaurants.find((x) => x.id === id);
  if (updated) renderMenuPdfStatus(updated);
});

let extractedItems = [];

document.getElementById("extractMenuPdfBtn").addEventListener("click", async () => {
  const id = document.getElementById("restId").value;
  const msgEl = document.getElementById("extractMsg");
  const btn = document.getElementById("extractMenuPdfBtn");

  btn.disabled = true;
  msgEl.style.color = "var(--text-gray)";
  msgEl.textContent = "PDF se text nikaala ja raha hai...";

  try {
    const res = await adminFetch(`${API}/restaurants/${id}/menu-pdf/extract`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Extraction fail hui");

    extractedItems = data.items || [];
    if (extractedItems.length === 0) {
      msgEl.style.color = "var(--red)";
      msgEl.textContent = "⚠️ " + (data.message || "Koi item nahi mila. Items manually add karein.");
      document.getElementById("extractReviewWrap").style.display = "none";
      return;
    }

    msgEl.style.color = "var(--green)";
    msgEl.textContent = `${extractedItems.length} item(s) mile — neeche check/edit karke confirm karein.`;
    renderExtractReview();
  } catch (e) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "❌ " + e.message;
  } finally {
    btn.disabled = false;
  }
});

function renderExtractReview() {
  const wrap = document.getElementById("extractReviewWrap");
  const list = document.getElementById("extractItemsList");

  if (extractedItems.length === 0) {
    wrap.style.display = "none";
    return;
  }

  wrap.style.display = "block";
  list.innerHTML =
    extractedItems
      .map(
        (item, i) => `
    <div class="extract-row" data-idx="${i}">
      <input type="text" class="x-name" value="${escapeHtml(item.name)}" />
      <input type="number" class="x-price" value="${item.price}" min="1" />
      <button type="button" class="btn-remove-row" onclick="removeExtractRow(${i})" title="Is item ko hatayein">✕</button>
    </div>`
      )
      .join("") +
    `<button type="button" class="btn-edit-menu" id="confirmExtractBtn" style="margin-top:8px;">✅ Add Selected to Menu</button>`;

  document.getElementById("confirmExtractBtn").addEventListener("click", confirmExtractedItems);
}

function removeExtractRow(idx) {
  extractedItems.splice(idx, 1);
  renderExtractReview();
}

async function confirmExtractedItems() {
  const id = document.getElementById("restId").value;
  const rows = document.querySelectorAll("#extractItemsList .extract-row");
  const msgEl = document.getElementById("extractMsg");
  const confirmBtn = document.getElementById("confirmExtractBtn");

  const itemsToAdd = Array.from(rows)
    .map((row) => ({
      name: row.querySelector(".x-name").value.trim(),
      price: Number(row.querySelector(".x-price").value),
    }))
    .filter((item) => item.name && item.price > 0);

  if (itemsToAdd.length === 0) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "Koi valid item nahi bacha add karne ke liye.";
    return;
  }

  confirmBtn.disabled = true;
  confirmBtn.textContent = "Add ho raha hai...";

  let successCount = 0;
  for (const item of itemsToAdd) {
    try {
      const res = await adminFetch(`${API}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: item.name, price: item.price, restaurantId: id }),
      });
      if (res.ok) successCount++;
    } catch (e) {
      // ek item fail ho to baaki continue karte hain
    }
  }

  msgEl.style.color = "var(--green)";
  msgEl.textContent = `✅ ${successCount} item(s) menu mein add ho gaye. Menu Management page par ja kar confirm kar sakte hain.`;
  extractedItems = [];
  document.getElementById("extractReviewWrap").style.display = "none";
}

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
