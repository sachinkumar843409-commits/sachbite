const API = "/api";
const STATUS_STEPS = ["Order Confirmed", "Preparing", "Out for Delivery", "Delivered"];
let liveMaps = {}; // orderId -> { map, bikeMarker }
let etaCountdowns = {}; // orderId -> seconds remaining (local live countdown)
let pollInterval = null;
let tickInterval = null;
let supportPhone = "";

fetch(`${API}/settings`)
  .then((r) => r.json())
  .then((s) => { supportPhone = (s.contactPhone || "").replace(/\s+/g, ""); })
  .catch(() => {});

async function cancelOrder(orderId) {
  if (!confirm("Kya aap sach me is order ko cancel karna chahte hain?")) return;
  const token = localStorage.getItem("sachbite_token");
  try {
    const res = await fetch(`${API}/orders/${orderId}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Cancel nahi ho paya.");
      return;
    }
    trackByPhone();
  } catch (e) {
    alert("Kuch galat ho gaya, dobara try karein.");
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function trackByPhone() {
  const loggedInUser = JSON.parse(localStorage.getItem("sachbite_user") || "null");
  const token = localStorage.getItem("sachbite_token");
  const results = document.getElementById("trackResults");

  if (!loggedInUser || !token) {
    results.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-gray);">🔒 Apna order track karne ke liye pehle Login karein.</div>`;
    if (typeof resetAuthModal === "function") resetAuthModal();
    document.getElementById("authModal")?.classList.add("show");
    return;
  }

  const phone = loggedInUser.phone;

  results.innerHTML = "<p style='color:var(--text-gray)'>Dhoondh rahe hain...</p>";
  liveMaps = {};
  etaCountdowns = {};
  if (pollInterval) clearInterval(pollInterval);
  if (tickInterval) clearInterval(tickInterval);

  try {
    const res = await fetch(`${API}/customers/${encodeURIComponent(phone)}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 403) {
      results.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-gray);">🔒 Session expire ho gaya, dobara login karein.</div>`;
      return;
    }
    const orders = await res.json();
    checkStatusChanges(orders);

    if (orders.length === 0) {
      results.innerHTML = "<p style='color:var(--text-gray)'>Is phone number se koi order nahi mila.</p>";
      return;
    }

    results.innerHTML = orders
      .map((o) => {
        if (o.status === "Cancelled") {
          return `
          <div class="track-order-card">
            <div><span class="oid">${o.id}</span> — ${formatDate(o.date)}</div>
            <div style="margin-top:6px; font-size:14px; color:var(--text-gray);">Grand Total: ₹${o.grandTotal}</div>
            <div style="margin-top:14px; padding:12px; background:#fee2e2; color:#991b1b; border-radius:10px; font-weight:700; text-align:center;">❌ Order Cancelled</div>
          </div>`;
        }

        const currentIndex = STATUS_STEPS.indexOf(o.status);
        const progressPct = currentIndex <= 0 ? "0%" : `${(currentIndex / (STATUS_STEPS.length - 1)) * 100}%`;
        const stepsHTML = STATUS_STEPS.map(
          (step, i) => `<div class="track-step ${i <= currentIndex ? "done" : ""} ${i === currentIndex ? "current" : ""}">${step}</div>`
        ).join("");

        const showMap = o.status === "Out for Delivery" && o.location;
        const showRating = o.status === "Delivered";

        return `
        <div class="track-order-card">
          <div><span class="oid">${o.id}</span> — ${formatDate(o.date)}</div>
          <div style="margin-top:6px; font-size:14px; color:var(--text-gray);">Grand Total: ₹${o.grandTotal}</div>
          <div class="track-status" style="--progress-pct: ${progressPct};">${stepsHTML}</div>
          ${o.deliveryPartnerName ? `<div style="margin-top:10px; font-size:13px; color:var(--text-gray);">🛵 Delivery Partner: <strong>${o.deliveryPartnerName}</strong></div>` : ""}
          ${showMap ? `<div class="live-map-box" id="map-${o.id}"></div><div class="live-eta" id="eta-${o.id}"><span class="eta-bike">🛵</span> <span id="eta-text-${o.id}">Live tracking load ho raha hai...</span></div>` : ""}
          ${showRating ? renderRatingSection(o) : ""}
          <div class="track-actions">
            <a href="tel:${supportPhone}" class="track-action-btn">📞 Call Support</a>
            <button class="track-action-btn" onclick="shareOrderStatus('${o.id}', '${o.status}')">📤 Share</button>
            <button class="track-action-btn" onclick='reorderItems(${JSON.stringify(o.items).replace(/'/g, "&#39;")})'>🔁 Reorder</button>
            ${o.status !== "Delivered" && o.status !== "Out for Delivery" ? `<button class="track-action-btn track-action-danger" onclick="cancelOrder('${o.id}')">✖ Cancel Order</button>` : ""}
          </div>
        </div>`;
      })
      .join("");

    // Live maps setup for out-for-delivery orders
    const liveOrders = orders.filter((o) => o.status === "Out for Delivery" && o.location);
    liveOrders.forEach((o) => setupLiveMap(o.id));

    if (liveOrders.length > 0) {
      pollInterval = setInterval(() => {
        liveOrders.forEach((o) => updateLiveMap(o.id));
      }, 5000);
      // Har second local countdown timer tick karta hai (asli update har 5s me hota hai poll se)
      tickInterval = setInterval(() => {
        liveOrders.forEach((o) => tickCountdown(o.id));
      }, 1000);
    }
  } catch (e) {
    results.innerHTML = "<p style='color:var(--text-gray)'>Kuch galat ho gaya. Backend chal raha hai check karein.</p>";
  }
}

function renderRatingSection(o) {
  if (o.rating) {
    return `
    <div class="rating-box rated">
      <div>${"★".repeat(o.rating)}${"☆".repeat(5 - o.rating)}</div>
      ${o.review ? `<div class="rating-review">"${escapeHtmlLocal(o.review)}"</div>` : ""}
      <div style="font-size:12px; color:var(--text-gray); margin-top:4px;">Rating ke liye dhanyawad! 🙏</div>
    </div>`;
  }
  return `
  <div class="rating-box" id="rating-${o.id}">
    <div style="font-weight:700; margin-bottom:8px;">Order kaisa raha? Rating dein:</div>
    <div class="star-picker" id="stars-${o.id}">
      ${[1, 2, 3, 4, 5].map((n) => `<span class="star" data-n="${n}" onclick="setRating('${o.id}', ${n})">☆</span>`).join("")}
    </div>
    <textarea id="review-${o.id}" placeholder="(Optional) Kuch likhna chahenge?" rows="2"></textarea>
    <button class="track-action-btn" style="margin-top:8px; width:100%;" onclick="submitRating('${o.id}')">Submit Rating</button>
  </div>`;
}

function escapeHtmlLocal(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

let selectedRatings = {}; // orderId -> chosen star count (before submit)

function setRating(orderId, n) {
  selectedRatings[orderId] = n;
  const stars = document.querySelectorAll(`#stars-${orderId} .star`);
  stars.forEach((s) => {
    s.textContent = parseInt(s.dataset.n) <= n ? "★" : "☆";
  });
}

async function submitRating(orderId) {
  const rating = selectedRatings[orderId];
  if (!rating) {
    alert("Pehle stars par click karke rating dein.");
    return;
  }
  const review = document.getElementById(`review-${orderId}`).value.trim();
  const token = localStorage.getItem("sachbite_token");
  const res = await fetch(`${API}/orders/${orderId}/rating`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ rating, review }),
  });
  if (res.ok) {
    trackByPhone();
  } else {
    const data = await res.json();
    alert(data.error || "Rating submit nahi ho payi.");
  }
}

async function shareOrderStatus(orderId, status) {
  const text = `SachBite Order ${orderId} — Status: ${status} 🛵`;
  if (navigator.share) {
    try {
      await navigator.share({ text });
    } catch (e) {}
  } else {
    await navigator.clipboard.writeText(text);
    alert("Copy ho gaya! Ab kahin bhi paste kar sakte hain.");
  }
}

// Purana order ka saara saman ek click me cart me daal kar checkout par le jaate hain
function reorderItems(items) {
  const cart = getCart();
  items.forEach((item) => {
    const existing = cart.find((i) => i.name === item.name);
    if (existing) {
      existing.qty += item.qty;
    } else {
      cart.push({ name: item.name, price: item.price, qty: item.qty, restaurant: item.restaurant || null });
    }
  });
  saveCart(cart);
  window.location.href = "checkout.html";
}

// ---------- Status-change notification (jab tak tab khula hai) ----------
let previousStatuses = {};
let notifyPermissionAsked = false;

function checkStatusChanges(orders) {
  if (!notifyPermissionAsked && "Notification" in window && Notification.permission === "default") {
    notifyPermissionAsked = true;
    Notification.requestPermission();
  }
  orders.forEach((o) => {
    const prev = previousStatuses[o.id];
    if (prev && prev !== o.status) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("SachBite Order Update", {
          body: `Order ${o.id} ab "${o.status}" hai.`,
          icon: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
        });
      }
    }
    previousStatuses[o.id] = o.status;
  });
}

let statusPollInterval = null;
const homeIcon = L.divIcon({ html: "🏠", className: "emoji-marker", iconSize: [24, 24] });
const restaurantIcon = L.divIcon({ html: "🏪", className: "emoji-marker", iconSize: [24, 24] });

async function setupLiveMap(orderId) {
  const res = await fetch(`${API}/orders/${orderId}/delivery-progress`);
  const data = await res.json();
  if (!data.progress) return;

  const mapDiv = document.getElementById(`map-${orderId}`);
  if (!mapDiv) return;

  const map = L.map(mapDiv).setView([data.progress.currentLat, data.progress.currentLng], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  L.marker([data.restaurantLocation.lat, data.restaurantLocation.lng], { icon: restaurantIcon })
    .addTo(map)
    .bindPopup("🏪 Restaurant");
  L.marker([data.customerLocation.lat, data.customerLocation.lng], { icon: homeIcon })
    .addTo(map)
    .bindPopup("🏠 Aapka address");

  const bikeMarker = L.marker([data.progress.currentLat, data.progress.currentLng], { icon: bikeIcon })
    .addTo(map)
    .bindPopup("🛵 Delivery Boy");

  L.polyline(
    [
      [data.restaurantLocation.lat, data.restaurantLocation.lng],
      [data.customerLocation.lat, data.customerLocation.lng],
    ],
    { color: "#ff7a1a", dashArray: "6 6", weight: 2 }
  ).addTo(map);

  liveMaps[orderId] = { map, bikeMarker };
  updateETAText(orderId, data.progress);

  setTimeout(() => map.invalidateSize(), 200);
}

async function updateLiveMap(orderId) {
  const res = await fetch(`${API}/orders/${orderId}/delivery-progress`);
  const data = await res.json();
  if (!data.progress || !liveMaps[orderId]) return;

  liveMaps[orderId].bikeMarker.setLatLng([data.progress.currentLat, data.progress.currentLng]);
  updateETAText(orderId, data.progress);
}

function updateETAText(orderId, progress) {
  const box = document.getElementById(`eta-${orderId}`);
  if (!box) return;

  if (progress.arrived) {
    box.classList.add("arrived");
    box.innerHTML = `<span class="eta-bike">✅</span> <span>Delivery boy pahunch chuka hai!</span>`;
    delete etaCountdowns[orderId];
    return;
  }

  // Naye poll data se local countdown resync karein (server ka data hamesha sahi maana jata hai)
  etaCountdowns[orderId] = progress.etaMinutes * 60;
  renderEtaText(orderId, progress.distanceRemainingKm);
}

function renderEtaText(orderId, distanceKm) {
  const textEl = document.getElementById(`eta-text-${orderId}`);
  if (!textEl || etaCountdowns[orderId] === undefined) return;

  const totalSec = Math.max(0, etaCountdowns[orderId]);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const timeStr = `${min}:${String(sec).padStart(2, "0")}`;

  textEl.innerHTML = `${distanceKm} km baaki <span class="eta-timer">⏱ ${timeStr}</span>`;
}

// Har second countdown ko 1 second se ghataata hai — sirf visual smoothness ke liye,
// asli data hamesha 5-second poll se hi aata hai (yeh sirf beech ke seconds "jeevit" dikhata hai)
function tickCountdown(orderId) {
  if (etaCountdowns[orderId] === undefined) return;
  if (etaCountdowns[orderId] > 0) etaCountdowns[orderId] -= 1;

  const cachedDistanceEl = document.getElementById(`eta-text-${orderId}`);
  const lastDistance = cachedDistanceEl?.textContent.match(/^([\d.]+)/)?.[1] || "";
  renderEtaText(orderId, lastDistance);
}

document.getElementById("trackBtn").addEventListener("click", trackByPhone);

// Login hote hi (ya page load hote hi agar already logged in hai) apne order turant dikha dein
trackByPhone();

// Jab customer login modal se successfully login kare, turant orders reload ho jayein
window.addEventListener("sachbite:login", trackByPhone);

// Har 20 second background me silently check karte hain ki kisi order ka status
// badla to nahi (jaise "Preparing" se "Out for Delivery") — badalne par notification
// aur poora view refresh ho jata hai. Yeh sirf tab khula hone tak kaam karta hai.
setInterval(async () => {
  const token = localStorage.getItem("sachbite_token");
  const loggedInUser = JSON.parse(localStorage.getItem("sachbite_user") || "null");
  if (!token || !loggedInUser) return;
  try {
    const res = await fetch(`${API}/customers/${encodeURIComponent(loggedInUser.phone)}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const orders = await res.json();
    const changed = orders.some((o) => previousStatuses[o.id] && previousStatuses[o.id] !== o.status);
    checkStatusChanges(orders);
    if (changed) trackByPhone();
  } catch (e) {}
}, 20000);
