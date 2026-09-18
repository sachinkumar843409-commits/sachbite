const API = "/api";
let myRestaurant = null;
let selectedPlan = null;
let subscriptionPrices = { pro: 499, business: 999 };
let businessUpiId = "";
let businessUpiName = "SachBite";

// ---------- Tabs ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

function showMsg(id, text, isError) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = "msg show " + (isError ? "error" : "success");
}

// ---------- Init ----------
async function init() {
  await loadProfile();
  await loadSettings();
  await loadMenu();
  await loadOrders();
  renderSubscription();
}

async function loadSettings() {
  try {
    const res = await fetch(`${API}/settings`);
    const s = await res.json();
    businessUpiId = s.businessUpiId || "";
    businessUpiName = s.businessUpiName || "SachBite";
    subscriptionPrices.pro = s.subscriptionPricePro || 499;
    subscriptionPrices.business = s.subscriptionPriceBusiness || 999;
    document.getElementById("proPriceText").innerHTML = `₹${subscriptionPrices.pro}<span>/month</span>`;
    document.getElementById("businessPriceText").innerHTML = `₹${subscriptionPrices.business}<span>/month</span>`;
  } catch (e) {}
}

// ---------- Profile ----------
async function loadProfile() {
  const res = await partnerFetch(`${API}/restaurant/me`);
  myRestaurant = await res.json();
  document.getElementById("restNamePill").textContent = myRestaurant.name;
  document.getElementById("pName").value = myRestaurant.name || "";
  document.getElementById("pEmail").value = myRestaurant.contactEmail || "";
  document.getElementById("pPhone").value = myRestaurant.contactPhone || "";
  document.getElementById("pTags").value = myRestaurant.tags || "";
  if (myRestaurant.image) {
    document.getElementById("pImagePreview").src = myRestaurant.image;
    document.getElementById("pImagePreview").style.display = "block";
  }
}

let pendingImageUrl = null;
document.getElementById("pImageFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("image", file);
  try {
    const res = await partnerFetch(`${API}/restaurant/upload`, { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok) {
      pendingImageUrl = data.url;
      document.getElementById("pImagePreview").src = data.url;
      document.getElementById("pImagePreview").style.display = "block";
    }
  } catch (err) {}
});

document.getElementById("saveProfileBtn").addEventListener("click", async () => {
  const body = {
    name: document.getElementById("pName").value.trim(),
    contactEmail: document.getElementById("pEmail").value.trim(),
    contactPhone: document.getElementById("pPhone").value.trim(),
    tags: document.getElementById("pTags").value.trim(),
  };
  if (pendingImageUrl) body.image = pendingImageUrl;

  try {
    const res = await partnerFetch(`${API}/restaurant/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save nahi ho paya");
    myRestaurant = data;
    document.getElementById("restNamePill").textContent = data.name;
    showMsg("profileMsg", "✅ Profile save ho gayi.", false);
  } catch (e) {
    showMsg("profileMsg", "❌ " + e.message, true);
  }
});

document.getElementById("changePassBtn").addEventListener("click", async () => {
  const currentPassword = document.getElementById("curPass").value;
  const newPassword = document.getElementById("newPass").value;
  if (!currentPassword || !newPassword) {
    showMsg("passMsg", "Dono fields bharein.", true);
    return;
  }
  try {
    const res = await partnerFetch(`${API}/restaurant-auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Badal nahi paya");
    showMsg("passMsg", "✅ Password badal gaya.", false);
    document.getElementById("curPass").value = "";
    document.getElementById("newPass").value = "";
  } catch (e) {
    showMsg("passMsg", "❌ " + e.message, true);
  }
});

// ---------- Menu ----------
let myMenu = [];

async function loadMenu() {
  const res = await partnerFetch(`${API}/restaurant/menu`);
  myMenu = await res.json();
  renderMenu();
}

function renderMenu() {
  const wrap = document.getElementById("menuItemsList");
  if (myMenu.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Abhi koi item nahi hai. "+ Naya Item" se add karein.</div>`;
    return;
  }
  wrap.innerHTML = myMenu
    .map(
      (m) => `
    <div class="menu-item-row">
      ${m.image ? `<img src="${m.image}" alt="" />` : `<div style="width:52px;height:52px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:22px;">${m.icon || "🍽️"}</div>`}
      <div class="info">
        <div class="name">${escapeHtml(m.name)}</div>
        <div class="price">₹${m.price} ${m.category ? "· " + escapeHtml(m.category) : ""} ${m.available === false ? "· <span style='color:var(--red)'>Unavailable</span>" : ""}</div>
      </div>
      <div class="actions">
        <button class="btn-outline" onclick="editItem('${m.id}')">Edit</button>
        <button class="btn-red" onclick="deleteItem('${m.id}')">Delete</button>
      </div>
    </div>`
    )
    .join("");
}

document.getElementById("addItemToggleBtn").addEventListener("click", () => {
  document.getElementById("editItemId").value = "";
  document.getElementById("itemName").value = "";
  document.getElementById("itemPrice").value = "";
  document.getElementById("itemCategory").value = "";
  document.getElementById("itemMsg").className = "msg";
  document.getElementById("addItemForm").style.display = "block";
});
document.getElementById("cancelItemBtn").addEventListener("click", () => {
  document.getElementById("addItemForm").style.display = "none";
});

function editItem(id) {
  const item = myMenu.find((m) => m.id === id);
  if (!item) return;
  document.getElementById("editItemId").value = item.id;
  document.getElementById("itemName").value = item.name;
  document.getElementById("itemPrice").value = item.price;
  document.getElementById("itemCategory").value = item.category || "";
  document.getElementById("addItemForm").style.display = "block";
  document.getElementById("addItemForm").scrollIntoView({ behavior: "smooth" });
}

async function deleteItem(id) {
  if (!confirm("Ye item delete karna hai?")) return;
  await partnerFetch(`${API}/restaurant/menu/${id}`, { method: "DELETE" });
  loadMenu();
}

document.getElementById("saveItemBtn").addEventListener("click", async () => {
  const id = document.getElementById("editItemId").value;
  const name = document.getElementById("itemName").value.trim();
  const price = document.getElementById("itemPrice").value;
  const category = document.getElementById("itemCategory").value.trim();

  if (!name || !price) {
    showMsg("itemMsg", "Naam aur price zaroori hain.", true);
    return;
  }

  try {
    const res = await partnerFetch(`${API}/restaurant/menu${id ? "/" + id : ""}`, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, category }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save nahi ho paya");
    document.getElementById("addItemForm").style.display = "none";
    loadMenu();
  } catch (e) {
    showMsg("itemMsg", "❌ " + e.message, true);
  }
});

// ---------- Orders ----------
async function loadOrders() {
  const res = await partnerFetch(`${API}/restaurant/orders`);
  const orders = await res.json();
  const wrap = document.getElementById("ordersList");

  if (!Array.isArray(orders) || orders.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Abhi tak koi order nahi aaya.</div>`;
    return;
  }

  wrap.innerHTML = orders
    .map(
      (o) => `
    <div class="order-card">
      <div class="top">
        <div>
          <div class="order-id">#${escapeHtml(o.id)}</div>
          <div class="date">${new Date(o.date).toLocaleString("en-IN")}</div>
        </div>
        <span class="status-chip">${escapeHtml(o.status || "Placed")}</span>
      </div>
      ${(o.items || [])
        .map((it) => `<div class="item-line">${escapeHtml(it.name)} × ${it.qty} — ₹${it.price * it.qty}</div>`)
        .join("")}
      <div style="margin-top:8px; font-size:12.5px; color:var(--text-gray);">Customer: ${escapeHtml(o.customer?.name || "")} · ${escapeHtml(o.customer?.phone || "")}</div>
    </div>`
    )
    .join("");
}

// ---------- Subscription ----------
function renderSubscription() {
  const box = document.getElementById("subStatusBox");
  const plan = myRestaurant.subscriptionPlan || "free";
  const status = myRestaurant.subscriptionStatus || "active";

  if (plan === "free") {
    box.className = "subscription-status-box free";
    box.textContent = "Aap abhi Free plan par hain.";
    document.getElementById("planSelectionWrap").style.display = "block";
  } else if (status === "pending") {
    box.className = "subscription-status-box pending";
    box.textContent = `⏳ ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan ke liye aapki request bhej di gayi hai — admin verify karke jald activate karega.`;
    document.getElementById("planSelectionWrap").style.display = "none";
  } else if (status === "active") {
    box.className = "subscription-status-box active";
    const endText = myRestaurant.subscriptionEnd ? ` (${new Date(myRestaurant.subscriptionEnd).toLocaleDateString("en-IN")} tak)` : "";
    box.textContent = `✅ ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan active hai${endText}.`;
    document.getElementById("planSelectionWrap").style.display = "none";
  } else {
    box.className = "subscription-status-box free";
    box.textContent = "Aapka subscription abhi inactive hai.";
    document.getElementById("planSelectionWrap").style.display = "block";
  }
}

function selectPlan(plan) {
  selectedPlan = plan;
  document.getElementById("planBoxPro").classList.toggle("selected", plan === "pro");
  document.getElementById("planBoxBusiness").classList.toggle("selected", plan === "business");

  if (!businessUpiId) {
    showMsg("subMsg", "Business UPI abhi set nahi hai — admin se contact karein.", true);
    return;
  }

  const amount = subscriptionPrices[plan];
  const note = encodeURIComponent(`SachBite Subscription ${plan}`);
  const upiLink = `upi://pay?pa=${encodeURIComponent(businessUpiId)}&pn=${encodeURIComponent(businessUpiName)}&am=${amount}&cu=INR&tn=${note}`;
  document.getElementById("subQrImg").src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiLink)}`;
  document.getElementById("subAmountText").textContent = `₹${amount} — ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan (30 din)`;
  document.getElementById("qrPaySection").style.display = "block";
}

document.getElementById("submitSubBtn").addEventListener("click", async () => {
  const upiReference = document.getElementById("subUtrInput").value.trim();
  if (!/^\d{12}$/.test(upiReference)) {
    showMsg("subMsg", "UTR number sahi 12-digit ka hona chahiye.", true);
    return;
  }
  try {
    const res = await partnerFetch(`${API}/restaurant/subscription/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: selectedPlan, upiReference }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request nahi bhej paya");
    showMsg("subMsg", "✅ " + data.message, false);
    myRestaurant.subscriptionPlan = selectedPlan;
    myRestaurant.subscriptionStatus = "pending";
    setTimeout(renderSubscription, 1200);
  } catch (e) {
    showMsg("subMsg", "❌ " + e.message, true);
  }
});

init();
