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
  setInterval(loadOrders, 12000); // har 12 second me naye assigned orders/alerts check karo
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
let knownPendingIds = new Set();
const STAGE_LABELS = {
  accepted: "✅ Accepted",
  arrived_at_restaurant: "🏪 Restaurant par pahunch gaye",
  picked_up: "📦 Order pick up ho gaya",
  arrived_at_customer: "🏠 Customer ke paas pahunch gaye",
};
const NEXT_STAGE = {
  accepted: { key: "arrived_at_restaurant", label: "🏪 Restaurant Par Pahunch Gaya" },
  arrived_at_restaurant: { key: "picked_up", label: "📦 Order Pick Up Kar Liya" },
  picked_up: { key: "arrived_at_customer", label: "🏠 Customer Ke Paas Pahunch Gaya" },
  arrived_at_customer: { key: "delivered", label: "✅ Delivered Mark Karein" },
};

async function loadOrders() {
  const res = await deliveryFetch(`${API}/delivery/orders`);
  myOrders = await res.json();

  // Naya pending assignment aaya ho to alert (sound + browser notification) —
  // Zomato/Swiggy jaisa "New Order!" alert
  const nowPendingIds = new Set(myOrders.filter((o) => o.assignmentStatus === "pending").map((o) => o.id));
  const freshlyArrived = [...nowPendingIds].filter((id) => !knownPendingIds.has(id));
  if (freshlyArrived.length > 0) playNewOrderAlert();
  knownPendingIds = nowPendingIds;

  renderOrders();
  manageGpsSharing();
}

function playNewOrderAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 250, 500].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.start(ctx.currentTime + delay / 1000);
      osc.stop(ctx.currentTime + delay / 1000 + 0.15);
    });
  } catch (e) {}

  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification("🛵 Naya Order Aaya Hai!", { body: "Dekh kar Accept/Reject karein." });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }
}

function renderOrders() {
  const wrap = document.getElementById("ordersList");
  if (!Array.isArray(myOrders) || myOrders.length === 0) {
    wrap.innerHTML = `<div class="empty-state">Abhi koi order assign nahi hua hai.</div>`;
    return;
  }

  wrap.innerHTML = myOrders.map((o) => renderOrderCard(o)).join("");
}

function renderOrderCard(o) {
  const mapsLink = o.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${o.location.lat},${o.location.lng}`
    : null;
  const restaurantName = (o.items && o.items[0] && o.items[0].restaurant) || "";
  const isCOD = o.customer && o.customer.payment === "Cash on Delivery";

  // ---- Naya assignment: Accept / Reject dikhana hai ----
  if (o.assignmentStatus === "pending") {
    return `
    <div class="order-card" style="border:2px solid var(--primary); background:#fff8f2;">
      <div class="top">
        <div>
          <div class="order-id">🔔 Naya Order — #${escapeHtml(o.id)}</div>
          <div class="rname">${escapeHtml(restaurantName)}</div>
        </div>
        <span class="status-chip">Naya</span>
      </div>
      ${(o.items || []).map((it) => `<div class="item-line">${escapeHtml(it.name)} × ${it.qty}</div>`).join("")}
      <div class="addr-block">📍 ${escapeHtml(o.customer?.address || "")}</div>
      ${isCOD ? `<div class="cod-banner">💵 Cash Collect Karna Hai: ₹${o.grandTotal}</div>` : ""}
      <div class="actions">
        <button class="btn btn-outline" style="border-color:var(--red); color:var(--red);" onclick="declineOrder('${o.id}')">❌ Reject</button>
        <button class="btn btn-green" onclick="acceptOrder('${o.id}')">✅ Accept</button>
      </div>
    </div>`;
  }

  // ---- Accepted: stage-by-stage progress ----
  const stage = o.deliveryStage || "accepted";
  const next = NEXT_STAGE[stage];
  return `
    <div class="order-card">
      <div class="top">
        <div>
          <div class="order-id">#${escapeHtml(o.id)}</div>
          <div class="rname">${escapeHtml(restaurantName)}</div>
        </div>
        <span class="status-chip picked">${STAGE_LABELS[stage] || stage}</span>
      </div>
      ${(o.items || []).map((it) => `<div class="item-line">${escapeHtml(it.name)} × ${it.qty}</div>`).join("")}
      <div class="addr-block">
        📍 ${escapeHtml(o.customer?.address || "")}<br/>
        👤 ${escapeHtml(o.customer?.name || "")} · 📞 ${escapeHtml(o.customer?.phone || "")}
      </div>
      ${isCOD ? `<div class="cod-banner">💵 Cash Collect Karna Hai: ₹${o.grandTotal} ${o.cashCollected ? "— ✅ Ho Gaya" : ""}</div>` : ""}
      <div class="actions">
        ${mapsLink ? `<a href="${mapsLink}" target="_blank" class="btn btn-outline">🧭 Navigate</a>` : ""}
        <a href="tel:${escapeHtml(o.customer?.phone || "")}" class="btn btn-outline">📞 Call</a>
        ${next ? `<button class="btn btn-primary" onclick="advanceStage('${o.id}', '${next.key}', ${isCOD && next.key === "delivered" && !o.cashCollected})">${next.label}</button>` : ""}
      </div>
    </div>`;
}

async function acceptOrder(id) {
  await deliveryFetch(`${API}/delivery/orders/${id}/accept`, { method: "POST" });
  loadOrders();
}

async function declineOrder(id) {
  if (!confirm("Ye order reject karna hai? Ye kisi aur delivery partner ko assign ho jaayega.")) return;
  await deliveryFetch(`${API}/delivery/orders/${id}/decline`, { method: "POST" });
  loadOrders();
}

async function advanceStage(id, stageKey, needsCashConfirm) {
  let cashCollected = undefined;
  if (needsCashConfirm) {
    if (!confirm("Kya aapne customer se cash collect kar liya hai?")) return;
    cashCollected = true;
  }
  if (stageKey === "delivered" && !needsCashConfirm) {
    if (!confirm("Ye order deliver ho gaya hai confirm karein?")) return;
  }

  const res = await deliveryFetch(`${API}/delivery/orders/${id}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage: stageKey, cashCollected }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Update nahi ho paya");
    return;
  }
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
  const hasActiveOrder = myOrders.some((o) => o.assignmentStatus === "accepted");
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
