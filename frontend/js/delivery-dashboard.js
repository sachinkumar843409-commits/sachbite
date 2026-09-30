const API = "/api";
let myPartner = null;
let myOrders = [];
let gpsWatchId = null;
let lastGpsSentAt = 0;
let knownPendingIds = new Set();

// ---------- Bottom nav / tab switching ----------
function switchTab(tab) {
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  document.getElementById(`tab-${tab}`).classList.add("active");
  if (tab === "earnings") loadEarnings();
  if (tab === "notifications") loadNotifications();
}
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
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
  setInterval(loadOrders, 12000);
  setInterval(loadNotifCount, 20000);
  setupPushNotifications();
  loadSupportContact();
  loadNotifCount();
}

// ---------- Profile ----------
async function loadProfile() {
  const res = await deliveryFetch(`${API}/delivery/me`);
  myPartner = await res.json();

  document.getElementById("pName").value = myPartner.name || "";
  document.getElementById("pPhone").value = myPartner.phone || "";
  document.getElementById("pVehicle").value = myPartner.vehicleType || "Bike";
  if (myPartner.image) {
    document.getElementById("pImagePreview").src = myPartner.image;
    document.getElementById("pImagePreview").style.display = "block";
  }
  document.getElementById("pAadhar").value = myPartner.aadharNumber || "";
  document.getElementById("pLicense").value = myPartner.drivingLicense || "";
  document.getElementById("pVehicleNo").value = myPartner.vehicleNumber || "";
  document.getElementById("pUpi").value = myPartner.upiId || "";
  document.getElementById("pBankName").value = myPartner.bankAccountName || "";
  document.getElementById("pBankAcc").value = myPartner.bankAccountNumber || "";
  document.getElementById("pBankIfsc").value = myPartner.bankIfsc || "";
  document.getElementById("pEmergName").value = myPartner.emergencyContactName || "";
  document.getElementById("pEmergPhone").value = myPartner.emergencyContactPhone || "";
  if (myPartner.emergencyContactPhone) {
    document.getElementById("emergCallBtn").href = `tel:${myPartner.emergencyContactPhone}`;
  }

  const kycBadge = document.getElementById("kycBadge");
  if (myPartner.kycVerified) {
    kycBadge.textContent = "✅ KYC Verified";
    kycBadge.className = "kyc-badge verified";
  } else {
    kycBadge.textContent = "⏳ KYC Pending";
    kycBadge.className = "kyc-badge pending";
  }

  document.getElementById("homeRating").innerHTML = myPartner.avgRating
    ? `⭐ ${myPartner.avgRating}`
    : `⭐ —`;

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
    showMsg("profileMsg", "✅ Profile save ho gayi.", false);
  } catch (e) {
    showMsg("profileMsg", "❌ " + e.message, true);
  }
});

document.getElementById("saveKycBtn").addEventListener("click", async () => {
  const body = {
    aadharNumber: document.getElementById("pAadhar").value.trim(),
    drivingLicense: document.getElementById("pLicense").value.trim(),
    vehicleNumber: document.getElementById("pVehicleNo").value.trim(),
  };
  try {
    const res = await deliveryFetch(`${API}/delivery/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save nahi ho paya");
    myPartner = data;
    showMsg("kycMsg", "✅ Documents save ho gaye — admin verify karega.", false);
    loadProfile();
  } catch (e) {
    showMsg("kycMsg", "❌ " + e.message, true);
  }
});

document.getElementById("saveBankBtn").addEventListener("click", async () => {
  const body = {
    upiId: document.getElementById("pUpi").value.trim(),
    bankAccountName: document.getElementById("pBankName").value.trim(),
    bankAccountNumber: document.getElementById("pBankAcc").value.trim(),
    bankIfsc: document.getElementById("pBankIfsc").value.trim(),
  };
  try {
    const res = await deliveryFetch(`${API}/delivery/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save nahi ho paya");
    showMsg("bankMsg", "✅ Bank details save ho gayi.", false);
  } catch (e) {
    showMsg("bankMsg", "❌ " + e.message, true);
  }
});

document.getElementById("saveEmergBtn").addEventListener("click", async () => {
  const body = {
    emergencyContactName: document.getElementById("pEmergName").value.trim(),
    emergencyContactPhone: document.getElementById("pEmergPhone").value.trim(),
  };
  try {
    const res = await deliveryFetch(`${API}/delivery/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save nahi ho paya");
    showMsg("emergMsg", "✅ Emergency contact save ho gaya.", false);
    if (body.emergencyContactPhone) document.getElementById("emergCallBtn").href = `tel:${body.emergencyContactPhone}`;
  } catch (e) {
    showMsg("emergMsg", "❌ " + e.message, true);
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

async function loadSupportContact() {
  try {
    const res = await fetch(`${API}/settings`);
    const s = await res.json();
    if (s.contactPhone) {
      const digits = s.contactPhone.replace(/\D/g, "");
      document.getElementById("supportCallBtn").href = `tel:${s.contactPhone}`;
      document.getElementById("supportWhatsappBtn").href = `https://wa.me/${digits}`;
    }
  } catch (e) {}
}

// ---------- Orders ----------
async function loadOrders() {
  const res = await deliveryFetch(`${API}/delivery/orders`);
  myOrders = await res.json();

  const nowPendingIds = new Set(myOrders.filter((o) => o.assignmentStatus === "pending").map((o) => o.id));
  const freshlyArrived = [...nowPendingIds].filter((id) => !knownPendingIds.has(id));
  if (freshlyArrived.length > 0) playNewOrderAlert();
  knownPendingIds = nowPendingIds;

  renderOrders();
  renderHome();
  updateDeliveriesBadge();
  manageGpsSharing();
}

function updateDeliveriesBadge() {
  const badge = document.getElementById("deliveriesBadge");
  const hasPending = myOrders.some((o) => o.assignmentStatus === "pending");
  badge.style.display = hasPending ? "block" : "none";
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

function renderHome() {
  const active = myOrders.filter((o) => o.assignmentStatus === "pending" || o.assignmentStatus === "accepted");
  const wrap = document.getElementById("homeOrdersList");
  wrap.innerHTML = active.length
    ? active.map((o) => renderOrderCard(o)).join("")
    : `<div class="empty-state">Abhi koi active order nahi hai.</div>`;
}

function renderOrders() {
  const wrap = document.getElementById("ordersList");
  wrap.innerHTML = myOrders.length
    ? myOrders.map((o) => renderOrderCard(o)).join("")
    : `<div class="empty-state">Abhi koi order assign nahi hua hai.</div>`;
}

const STAGE_LABELS = {
  accepted: "✅ Accepted",
  arrived_at_restaurant: "🏪 Restaurant Par Hain",
  picked_up: "📦 Pick Up Ho Gaya",
  arrived_at_customer: "🏠 Customer Ke Paas",
};
const NEXT_STAGE = {
  accepted: { key: "arrived_at_restaurant", label: "🏪 Restaurant Par Pahunch Gaya" },
  arrived_at_restaurant: { key: "picked_up", label: "📦 Order Pick Up Kar Liya" },
  picked_up: { key: "arrived_at_customer", label: "🏠 Customer Ke Paas Pahunch Gaya" },
};

function renderOrderCard(o) {
  const custMapsLink = o.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${o.location.lat},${o.location.lng}`
    : null;
  const restMapsLink = o.restaurantLocation
    ? `https://www.google.com/maps/dir/?api=1&destination=${o.restaurantLocation.lat},${o.restaurantLocation.lng}`
    : null;
  const restaurantName = (o.items && o.items[0] && o.items[0].restaurant) || "";
  const isCOD = o.customer && o.customer.payment === "Cash on Delivery";
  const custPhoneDigits = (o.customer?.phone || "").replace(/\D/g, "");

  if (o.assignmentStatus === "pending") {
    return `
    <div class="order-card new-alert">
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
        <button class="btn btn-red-outline" onclick="openDeclineModal('${o.id}')">❌ Reject</button>
        <button class="btn btn-green" onclick="acceptOrder('${o.id}')">✅ Accept</button>
      </div>
    </div>`;
  }

  const stage = o.deliveryStage || "accepted";
  const next = NEXT_STAGE[stage];
  const showOtpEntry = stage === "arrived_at_customer";

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

      ${stage === "accepted" || stage === "arrived_at_restaurant" ? `
      <div class="actions">
        ${restMapsLink ? `<a href="${restMapsLink}" target="_blank" class="btn btn-outline">🧭 Restaurant Navigate</a>` : ""}
        ${o.restaurantPhone ? `<a href="tel:${o.restaurantPhone}" class="btn btn-outline">📞 Call Restaurant</a>` : ""}
      </div>` : ""}

      ${stage === "picked_up" || stage === "arrived_at_customer" ? `
      <div class="actions">
        ${custMapsLink ? `<a href="${custMapsLink}" target="_blank" class="btn btn-outline">🧭 Customer Navigate</a>` : ""}
        <a href="tel:${escapeHtml(o.customer?.phone || "")}" class="btn btn-outline">📞 Call</a>
        ${custPhoneDigits ? `<a href="https://wa.me/${custPhoneDigits}" target="_blank" class="btn btn-outline">💬 WhatsApp</a>` : ""}
      </div>` : ""}

      ${showOtpEntry ? `
      <div class="otp-box">
        <input type="text" inputmode="numeric" maxlength="4" placeholder="Customer se OTP lein" id="otp-${o.id}" />
        <button class="btn btn-primary" onclick="completeDelivery('${o.id}', ${isCOD && !o.cashCollected})">✅ Delivered</button>
      </div>` : ""}

      ${next && !showOtpEntry ? `
      <div class="actions">
        <button class="btn btn-primary" onclick="advanceStage('${o.id}', '${next.key}')">${next.label}</button>
      </div>` : ""}
    </div>`;
}

async function acceptOrder(id) {
  const res = await deliveryFetch(`${API}/delivery/orders/${id}/accept`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json();
    alert(data.error || "Accept nahi ho paya");
  }
  loadOrders();
}

let declineOrderId = null;
function openDeclineModal(id) {
  declineOrderId = id;
  const reason = prompt("Order reject karne ki wajah bataayein (optional):", "");
  if (reason === null) return; // cancel dabaya
  declineOrder(id, reason);
}

async function declineOrder(id, reason) {
  await deliveryFetch(`${API}/delivery/orders/${id}/decline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason || "" }),
  });
  loadOrders();
}

async function advanceStage(id, stageKey) {
  const res = await deliveryFetch(`${API}/delivery/orders/${id}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage: stageKey }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Update nahi ho paya");
    return;
  }
  loadOrders();
}

async function completeDelivery(id, needsCashConfirm) {
  const otpInput = document.getElementById(`otp-${id}`);
  const otp = otpInput ? otpInput.value.trim() : "";
  if (!otp || otp.length !== 4) {
    alert("Customer se 4-digit OTP lekar daalein.");
    return;
  }
  let cashCollected = undefined;
  if (needsCashConfirm) {
    if (!confirm("Kya aapne customer se cash collect kar liya hai?")) return;
    cashCollected = true;
  }

  const res = await deliveryFetch(`${API}/delivery/orders/${id}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage: "delivered", otp, cashCollected }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Update nahi ho paya");
    return;
  }
  loadOrders();
  loadEarnings();
}

// ---------- Earnings ----------
async function loadEarnings() {
  const res = await deliveryFetch(`${API}/delivery/earnings`);
  const data = await res.json();

  document.getElementById("homeTodayEarn").textContent = `₹${data.todayEarnings}`;
  document.getElementById("homeTodayCount").textContent = data.todayDeliveries;
  document.getElementById("homePending").textContent = `₹${data.pendingAmount}`;

  document.getElementById("todayEarn").textContent = `₹${data.todayEarnings}`;
  document.getElementById("todayCount").textContent = data.todayDeliveries;
  document.getElementById("weekEarn").textContent = `₹${data.weekEarnings}`;
  document.getElementById("weekCount").textContent = data.weekDeliveries;
  document.getElementById("monthEarn").textContent = `₹${data.monthEarnings}`;
  document.getElementById("monthCount").textContent = data.monthDeliveries;
  document.getElementById("totalEarn").textContent = `₹${data.totalEarnings}`;
  document.getElementById("totalCount").textContent = data.totalDeliveries;
  document.getElementById("walletPending").textContent = `₹${data.pendingAmount}`;
  document.getElementById("walletPaid").textContent = `₹${data.totalPaidOut}`;
  document.getElementById("codBalanceVal").textContent = `₹${data.codBalance}`;
  document.getElementById("codDepositedVal").textContent = `₹${data.codDeposited}`;

  const codHistWrap = document.getElementById("codDepositHistoryList");
  codHistWrap.innerHTML = data.codDepositHistory && data.codDepositHistory.length
    ? data.codDepositHistory
        .map(
          (d) => `
    <div class="history-row">
      <div>
        <div style="font-weight:700;">₹${d.amount} jama kiya</div>
        <div style="color:var(--text-gray); font-size:11px;">${new Date(d.depositedAt || d.date).toLocaleDateString("en-IN")} ${d.note ? "· " + escapeHtml(d.note) : ""}</div>
      </div>
    </div>`
        )
        .join("")
    : "";

  const targetCard = document.getElementById("targetCard");
  if (data.dailyTarget > 0) {
    targetCard.style.display = "block";
    const remaining = Math.max(data.dailyTarget - data.todayDeliveries, 0);
    document.getElementById("targetText").textContent = data.todayTargetHit
      ? `🎉 Target complete! ₹${data.targetBonus} bonus mil gaya.`
      : `${data.todayDeliveries}/${data.dailyTarget} deliveries — ${remaining} aur karein aur ₹${data.targetBonus} bonus paayein!`;
  } else {
    targetCard.style.display = "none";
  }

  const payoutWrap = document.getElementById("payoutHistoryList");
  payoutWrap.innerHTML = data.payoutHistory && data.payoutHistory.length
    ? data.payoutHistory
        .map(
          (p) => `
    <div class="history-row">
      <div>
        <div style="font-weight:700;">₹${p.amount}</div>
        <div style="color:var(--text-gray); font-size:11px;">${new Date(p.paidAt).toLocaleDateString("en-IN")} ${p.note ? "· " + escapeHtml(p.note) : ""}</div>
      </div>
      <div style="color:var(--green); font-weight:700;">✅ Paid</div>
    </div>`
        )
        .join("")
    : `<div class="empty-state">Abhi tak koi payout nahi hua.</div>`;

  const historyWrap = document.getElementById("historyList");
  historyWrap.innerHTML = data.history && data.history.length
    ? data.history
        .map(
          (h) => `
    <div class="history-row">
      <div>
        <div style="font-weight:700;">#${escapeHtml(h.id)}</div>
        <div style="color:var(--text-gray); font-size:11px;">${new Date(h.deliveredAt).toLocaleString("en-IN")}</div>
      </div>
      <div style="color:var(--green); font-weight:700;">+₹${h.earning}</div>
    </div>`
        )
        .join("")
    : `<div class="empty-state">Abhi tak koi delivery complete nahi hui.</div>`;
}

// ---------- Notifications ----------
async function loadNotifCount() {
  try {
    const res = await deliveryFetch(`${API}/delivery/notifications`);
    const notifs = await res.json();
    const unread = notifs.filter((n) => !n.read).length;
    document.getElementById("bellDot").style.display = unread > 0 ? "block" : "none";
    document.getElementById("notifBadge").style.display = unread > 0 ? "block" : "none";
  } catch (e) {}
}

async function loadNotifications() {
  const res = await deliveryFetch(`${API}/delivery/notifications`);
  const notifs = await res.json();
  const wrap = document.getElementById("notifList");
  wrap.innerHTML = notifs.length
    ? notifs
        .map(
          (n) => `
    <div class="notif-row ${n.read ? "" : "unread"}">
      <div class="notif-icon">${n.read ? "📭" : "🔔"}</div>
      <div>
        <div class="notif-title">${escapeHtml(n.title)}</div>
        <div class="notif-body">${escapeHtml(n.body)}</div>
        <div class="notif-time">${new Date(n.createdAt).toLocaleString("en-IN")}</div>
      </div>
    </div>`
        )
        .join("")
    : `<div class="empty-state">Koi notification nahi hai.</div>`;

  await deliveryFetch(`${API}/delivery/notifications/mark-read`, { method: "POST" });
  document.getElementById("bellDot").style.display = "none";
  document.getElementById("notifBadge").style.display = "none";
}

// ---------- GPS live location sharing ----------
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
        if (now - lastGpsSentAt < 15000) return;
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

// ---------- Real Push Notifications ----------
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function setupPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const btn = document.getElementById("enableNotifBtn");
  const statusMsg = document.getElementById("notifStatusMsg");
  try {
    const reg = await navigator.serviceWorker.ready;
    const existingSub = await reg.pushManager.getSubscription();
    if (existingSub || Notification.permission === "granted") {
      btn.style.display = "none";
      statusMsg.style.display = "block";
      if (!existingSub && Notification.permission === "granted") {
        await subscribeToPush(reg);
      }
    } else if (Notification.permission !== "denied") {
      btn.style.display = "block";
      statusMsg.style.display = "none";
    }
  } catch (e) {}
}

async function subscribeToPush(reg) {
  try {
    const res = await fetch(`${API}/push/vapid-public-key`);
    const { publicKey } = await res.json();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await deliveryFetch(`${API}/delivery/push-subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub }),
    });
    document.getElementById("enableNotifBtn").style.display = "none";
    document.getElementById("notifStatusMsg").style.display = "block";
  } catch (e) {
    console.warn("Push subscribe fail hua:", e);
  }
}

document.getElementById("enableNotifBtn").addEventListener("click", async () => {
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    const reg = await navigator.serviceWorker.ready;
    await subscribeToPush(reg);
  } else {
    alert("Notifications allow nahi kiye — Settings se browser permission on karein.");
  }
});

init();
