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
        ${r.hasMenuPdf ? `📄 Menu PDF uploaded` : `<span style="color:#b45309;">📄 Menu PDF nahi hai</span>`}
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
  document.getElementById("partnerLoginSection").style.display = "none";
  modal.classList.add("show");
}

async function openEditModal(id) {
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
  document.getElementById("menuPdfSection").style.display = "block";
  document.getElementById("partnerLoginSection").style.display = "block";
  document.getElementById("partnerUsername").value = "";
  document.getElementById("partnerPassword").value = "";
  document.getElementById("partnerLoginMsg").textContent = "";
  document.getElementById("partnerLoginStatus").innerHTML = r.hasLogin
    ? `<span style="color:var(--green);">✅ Login pehle se set hai. Naya username/password bharke "Set/Reset" dabayein to badal jayega.</span>`
    : `<span style="color:var(--text-gray);">Abhi login set nahi hai — restaurant apna dashboard access nahi kar sakta.</span>`;
  modal.classList.add("show");

  // currentRestaurants list-endpoint se aata hai, jo (payload size ke liye) real
  // menuPdfUrl strip karke sirf hasMenuPdf boolean deta hai. Pehle sab reset karte
  // hain, phir agar PDF hai to poora data /api/restaurants/details se fetch karte hain.
  renderMenuPdfStatus({});
  if (r.hasMenuPdf) {
    document.getElementById("menuPdfCurrentStatus").innerHTML = `<span style="color:var(--text-gray);">Loading...</span>`;
    try {
      const res = await fetch(`${API}/restaurants/details?name=${encodeURIComponent(r.name)}`);
      const full = await res.json();
      // Modal band ho chuka ho ya kisi aur restaurant par switch ho gaya ho to ignore
      if (res.ok && document.getElementById("restId").value === id) {
        renderMenuPdfStatus(full);
      }
    } catch (e) {
      // network error — status "Loading..." pe hi reh jayega, user retry kar sakta hai edit reopen karke
    }
  }
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
    // Card grid (badges) refresh karne ke liye list reload karo, lekin status/extract
    // button yahin 'data' se dikhao — list endpoint menuPdfUrl strip kar deta hai.
    await loadRestaurants();
    renderMenuPdfStatus({ menuPdfUrl: data.menuPdfUrl, menuPdfName: data.menuPdfName });
    // Upload hote hi turant items extract karke dikhao — admin ko alag se
    // "Extract" button dabaane ki zaroorat na pade.
    await runExtraction(id);
  } catch (e) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "❌ " + e.message;
  }
});

document.getElementById("deleteMenuPdfBtn").addEventListener("click", async () => {
  const id = document.getElementById("restId").value;
  if (!id) return;
  if (!confirm("Kya aap is restaurant ki menu PDF hatana chahte hain? Isse extract karke jo bhi items is restaurant mein add hue the, wo bhi hat jaayenge.")) return;

  const res = await adminFetch(`${API}/restaurants/${id}/menu-pdf`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  await loadRestaurants();
  renderMenuPdfStatus({});
  const msgEl = document.getElementById("menuPdfMsg");
  msgEl.style.color = "var(--green)";
  msgEl.textContent = data.removedMenuItems
    ? `✅ PDF hata di gayi. ${data.removedMenuItems} menu item(s) bhi saath mein hata diye gaye.`
    : "✅ PDF hata di gayi.";
});

document.getElementById("setPartnerLoginBtn").addEventListener("click", async () => {
  const id = document.getElementById("restId").value;
  const username = document.getElementById("partnerUsername").value.trim();
  const password = document.getElementById("partnerPassword").value;
  const msgEl = document.getElementById("partnerLoginMsg");

  if (!id) return;
  if (!username || !password) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "Username aur password dono bharein.";
    return;
  }

  try {
    const res = await adminFetch(`${API}/restaurants/${id}/set-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Set nahi ho paya");

    msgEl.style.color = "var(--green)";
    msgEl.textContent = `✅ Login set ho gaya — restaurant ab "${data.username}" username se apne dashboard mein login kar sakta hai.`;
    document.getElementById("partnerPassword").value = "";
    loadRestaurants();
  } catch (e) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "❌ " + e.message;
  }
});

let extractedItems = [];

async function runExtraction(id) {
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
}

document.getElementById("extractMenuPdfBtn").addEventListener("click", () => {
  const id = document.getElementById("restId").value;
  runExtraction(id);
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
