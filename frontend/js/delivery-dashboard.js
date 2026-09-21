const API = "/api";
let myPartner = null;
let myOrders = [];
let gpsWatchId = null;
let lastGpsSentAt = 0;

// ---------- Tabs ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "earnings") loadEarnings();
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
  await loadOrders();
  setInterval(loadOrders, 30000); // har 30 second me naye assigned orders check karo
}

// ---------- Profile ----------
async function loadProfile() {
  const res = await deliveryFetch(`${API}/delivery/me`);
  myPartner = await res.json();
  document.getElementById("partnerNamePill").textContent = myPartner.name;
  document.getElementById("pName").value = myPartner.name || "";
  document.getElementById("pPhone").value = myPartner.phone || "";
  document.getElementById("pVehicle").value = myPartner.vehicleType || "Bike";
  if (myPartner.image) {
    document.getElementById("pImagePreview").src = myPartner.image;
    document.getElementById("pImagePreview").style.display = "block";
  }

  const toggle = document.getElementById("onlineToggle");
  toggle.checked = !!myPartner.online;
  updateOnlineLabel();
  manageGpsSharing();
}

function updateOnlineLabel() {
  const toggle = document.getElementById("onlineToggle");
  document.getElementById("onlineLabel").textContent = toggle.checked ? "🟢 Online" : "Offline";
}

document.getElementById("onlineToggle").addEventListener("change", async (e) => {
  updateOnlineLabel();
  await deliveryFetch(`${API}/delivery/online`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ online: e.target.checked }),
  });
  manageGpsSharing();
});

let pendingImageUrl = null;
document.getElementById("pImageFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("image", file);
  try {
    const res = await deliveryFetch(`${API}/delivery/upload`, { method: "POST", body: formData });
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
    phone: document.getElementById("pPhone").value.trim(),
    vehicleType: document.getElementById("pVehicle").value,
  };
  if (pendingImageUrl) body.image = pendingImageUrl;

  try {
    const res = await deliveryFetch(`${API}/delivery/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save nahi ho paya");
    myPartner = data;
    document.getElementById("partnerNamePill").textContent = data.name;
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
    const res = await deliveryFetch(`${API}/delivery-auth/change-password`, {
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

// ---------- Orders ----------
async function loadOrders() {
  const res = await deliveryFetch(`${API}/delivery/orders`);
  myOrders = await res.json();
  renderOrders();
  manageGpsSharing();
}

function renderOrders() {
  const wrap = document.getElementById("ordersList");
  if (!Array.isArray(myOrders) || myOrders.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Abhi koi order assign nahi hua hai.</div>`;
    return;
  }

  wrap.innerHTML = myOrders
    .map((o) => {
      const picked = !!o.pickedUpAt;
      const mapsLink = o.location
        ? `https://www.google.com/maps/dir/?api=1&destination=${o.location.lat},${o.location.lng}`
        : null;
      return `
    <div class="order-card">
      <div class="top">
        <div>
          <div class="order-id">#${escapeHtml(o.id)}</div>
          <div class="rname">${escapeHtml((o.items && o.items[0] && o.items[0].restaurant) || "")}</div>
        </div>
        <span class="status-chip ${picked ? "picked" : ""}">${picked ? "📦 Picked Up" : "⏳ Pickup Baaki"}</span>
      </div>
      ${(o.items || []).map((it) => `<div class="item-line">${escapeHtml(it.name)} × ${it.qty}</div>`).join("")}
      <div class="addr-block">
        📍 ${escapeHtml(o.customer?.address || "")}<br/>
        👤 ${escapeHtml(o.customer?.name || "")} · 📞 ${escapeHtml(o.customer?.phone || "")}
      </div>
      <div class="actions">
        ${mapsLink ? `<a href="${mapsLink}" target="_blank" class="btn btn-outline">🧭 Navigate</a>` : ""}
        <a href="tel:${escapeHtml(o.customer?.phone || "")}" class="btn btn-outline">📞 Call</a>
        ${!picked ? `<button class="btn btn-primary" onclick="markPickedUp('${o.id}')">📦 Picked Up</button>` : ""}
        <button class="btn btn-green" onclick="markDelivered('${o.id}')">✅ Delivered</button>
      </div>
    </div>`;
    })
    .join("");
}

async function markPickedUp(id) {
  await deliveryFetch(`${API}/delivery/orders/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "picked_up" }),
  });
  loadOrders();
}

async function markDelivered(id) {
  if (!confirm("Ye order deliver ho gaya hai confirm karein?")) return;
  await deliveryFetch(`${API}/delivery/orders/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Delivered" }),
  });
  loadOrders();
}

// ---------- Earnings ----------
async function loadEarnings() {
  const res = await deliveryFetch(`${API}/delivery/earnings`);
  const data = await res.json();

  document.getElementById("todayEarn").textContent = `₹${data.todayEarnings}`;
  document.getElementById("todayCount").textContent = data.todayDeliveries;
  document.getElementById("weekEarn").textContent = `₹${data.weekEarnings}`;
  document.getElementById("weekCount").textContent = data.weekDeliveries;
  document.getElementById("totalEarn").textContent = `₹${data.totalEarnings}`;
  document.getElementById("totalCount").textContent = data.totalDeliveries;

  const historyWrap = document.getElementById("historyList");
  if (!data.history || data.history.length === 0) {
    historyWrap.innerHTML = `<div class="empty-state">Abhi tak koi delivery complete nahi hui.</div>`;
    return;
  }
  historyWrap.innerHTML = data.history
    .map(
      (h) => `
    <div class="history-row">
      <div>
        <div style="font-weight:700;">#${escapeHtml(h.id)}</div>
        <div style="color:var(--text-gray); font-size:12px;">${new Date(h.deliveredAt).toLocaleString("en-IN")}</div>
      </div>
      <div style="text-align:right; color:var(--green); font-weight:700;">+₹${h.earning}</div>
    </div>`
    )
    .join("");
}

// ---------- GPS live location sharing ----------
// Jab tak partner ONLINE hai AUR kam se kam ek order assign hai (matlab
// abhi delivery route par hai), tab tak browser se GPS location periodically
// backend ko bhejte hain — isi se Live Tracking map aur customer Track Order
// page par ASLI position dikhta hai.
function manageGpsSharing() {
  const isOnline = document.getElementById("onlineToggle").checked;
  const hasActiveOrder = myOrders.length > 0;
  const shouldTrack = isOnline && hasActiveOrder;

  const banner = document.getElementById("gpsBanner");

  if (shouldTrack && gpsWatchId === null) {
    if (!navigator.geolocation) return;
    gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastGpsSentAt < 15000) return; // 15 second throttle
        lastGpsSentAt = now;
        deliveryFetch(`${API}/delivery/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {});
      },
      () => {
        banner.style.display = "none";
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    banner.style.display = "block";
  } else if (!shouldTrack && gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
    banner.style.display = "none";
  }
}

init();
