const API = "/api";
const STATUS_STEPS = ["Order Confirmed", "Preparing", "Out for Delivery", "Delivered"];
let liveMaps = {}; // orderId -> { map, bikeMarker }
let pollInterval = null;

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
  const phone = document.getElementById("phoneInput").value.trim();
  const results = document.getElementById("trackResults");

  if (!phone) {
    alert("Phone number daalein.");
    return;
  }

  results.innerHTML = "<p style='color:var(--text-gray)'>Dhoondh rahe hain...</p>";
  liveMaps = {};
  if (pollInterval) clearInterval(pollInterval);

  try {
    const res = await fetch(`${API}/customers/${encodeURIComponent(phone)}/orders`);
    const orders = await res.json();

    if (orders.length === 0) {
      results.innerHTML = "<p style='color:var(--text-gray)'>Is phone number se koi order nahi mila.</p>";
      return;
    }

    results.innerHTML = orders
      .map((o) => {
        const currentIndex = STATUS_STEPS.indexOf(o.status);
        const stepsHTML = STATUS_STEPS.map(
          (step, i) => `<div class="track-step ${i <= currentIndex ? "done" : ""}">${step}</div>`
        ).join("");

        const showMap = o.status === "Out for Delivery" && o.location;

        return `
        <div class="track-order-card">
          <div><span class="oid">${o.id}</span> — ${formatDate(o.date)}</div>
          <div style="margin-top:6px; font-size:14px; color:var(--text-gray);">Grand Total: ₹${o.grandTotal}</div>
          <div class="track-status">${stepsHTML}</div>
          ${showMap ? `<div class="live-map-box" id="map-${o.id}"></div><div class="live-eta" id="eta-${o.id}">Live tracking load ho raha hai...</div>` : ""}
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
    }
  } catch (e) {
    results.innerHTML = "<p style='color:var(--text-gray)'>Kuch galat ho gaya. Backend chal raha hai check karein.</p>";
  }
}

const bikeIcon = L.divIcon({ html: "🛵", className: "emoji-marker", iconSize: [28, 28] });
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
  const el = document.getElementById(`eta-${orderId}`);
  if (!el) return;
  if (progress.arrived) {
    el.textContent = "✅ Delivery boy pahunch chuka hai!";
  } else {
    el.textContent = `🛵 ${progress.distanceRemainingKm} km baaki — ETA: ${progress.etaMinutes} minute`;
  }
}

document.getElementById("trackBtn").addEventListener("click", trackByPhone);
document.getElementById("phoneInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") trackByPhone();
});

// Query param se ya logged-in user se phone auto-fill karke turant track karein
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

const phoneFromQuery = getQueryParam("phone");
const loggedInUser = JSON.parse(localStorage.getItem("sachbite_user") || "null");
const autoPhone = phoneFromQuery || loggedInUser?.phone;

if (autoPhone) {
  document.getElementById("phoneInput").value = autoPhone;
  trackByPhone();
}
