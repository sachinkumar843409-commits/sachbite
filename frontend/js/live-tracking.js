const API = "/api";
let map, restaurantMarker;
const deliveryMarkers = {}; // orderId -> marker
const deliveryLines = {}; // orderId -> polyline

const bikeIcon = L.divIcon({
  html: "🛵",
  className: "emoji-marker",
  iconSize: [30, 30],
});
const homeIcon = L.divIcon({
  html: "🏠",
  className: "emoji-marker",
  iconSize: [26, 26],
});
const restaurantIcon = L.divIcon({
  html: "🏪",
  className: "emoji-marker",
  iconSize: [28, 28],
});

function initMap(centerLat, centerLng) {
  map = L.map("liveMap").setView([centerLat, centerLng], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);
}

async function refreshLiveDeliveries() {
  const res = await fetch(`${API}/deliveries/live`);
  const data = await res.json();

  if (!map) {
    initMap(data.restaurantLocation.lat, data.restaurantLocation.lng);
    restaurantMarker = L.marker([data.restaurantLocation.lat, data.restaurantLocation.lng], { icon: restaurantIcon })
      .addTo(map)
      .bindPopup("🏪 SachBite Restaurant");
  }

  const listEl = document.getElementById("deliveryList");

  if (data.deliveries.length === 0) {
    listEl.innerHTML = `<div class="empty-state">📭<p>Abhi koi order "Out for Delivery" nahi hai.</p></div>`;
    // Purane markers hata do
    Object.values(deliveryMarkers).forEach((m) => map.removeLayer(m));
    Object.values(deliveryLines).forEach((l) => map.removeLayer(l));
    return;
  }

  listEl.innerHTML = data.deliveries
    .map((d) => {
      const p = d.progress;
      if (!p) return "";
      return `
      <div class="delivery-card" id="card-${d.id}">
        <div class="dc-top" onclick="focusDelivery(${d.location.lat}, ${d.location.lng})" style="cursor:pointer;">
          <div class="oid">${escapeHtml(d.id)}</div>
          <div class="cname">${escapeHtml(d.customerName)}</div>
          <div class="addr">📍 ${escapeHtml(d.customerAddress)}</div>
          <div class="progress-track"><div class="progress-fill" style="width:${p.progressPercent}%"></div></div>
          <div class="delivery-meta">
            <span>${p.arrived ? "✅ Pahunch gaya" : `⏱ ETA: ${p.etaMinutes} min`}</span>
            <span>${p.distanceRemainingKm} km baaki</span>
          </div>
        </div>
        <div class="dc-actions">
          <a href="tel:${escapeHtml(d.customerPhone || "")}" class="dc-btn dc-call" onclick="event.stopPropagation()">📞 Call Customer</a>
          <button class="dc-btn dc-delivered" onclick="event.stopPropagation(); markDelivered('${d.id}')">✅ Delivered</button>
        </div>
      </div>`;
    })
    .join("");

  const activeIds = new Set();

  data.deliveries.forEach((d) => {
    const p = d.progress;
    if (!p) return;
    activeIds.add(d.id);

    if (deliveryMarkers[d.id]) {
      deliveryMarkers[d.id].setLatLng([p.currentLat, p.currentLng]);
    } else {
      deliveryMarkers[d.id] = L.marker([p.currentLat, p.currentLng], { icon: bikeIcon })
        .addTo(map)
        .bindPopup(`${escapeHtml(d.id)} — ${escapeHtml(d.customerName)}`);
    }

    if (!map.getLayer && deliveryLines[d.id]) map.removeLayer(deliveryLines[d.id]);
    if (deliveryLines[d.id]) map.removeLayer(deliveryLines[d.id]);
    deliveryLines[d.id] = L.polyline(
      [
        [data.restaurantLocation.lat, data.restaurantLocation.lng],
        [d.location.lat, d.location.lng],
      ],
      { color: "#ff7a1a", dashArray: "6 6", weight: 2 }
    ).addTo(map);

    if (!map._homeMarkers) map._homeMarkers = {};
    if (!map._homeMarkers[d.id]) {
      map._homeMarkers[d.id] = L.marker([d.location.lat, d.location.lng], { icon: homeIcon })
        .addTo(map)
        .bindPopup(`🏠 ${escapeHtml(d.customerName)}'s address`);
    }
  });

  // Remove markers for deliveries that are no longer active
  Object.keys(deliveryMarkers).forEach((id) => {
    if (!activeIds.has(id)) {
      map.removeLayer(deliveryMarkers[id]);
      delete deliveryMarkers[id];
      if (deliveryLines[id]) {
        map.removeLayer(deliveryLines[id]);
        delete deliveryLines[id];
      }
      if (map._homeMarkers && map._homeMarkers[id]) {
        map.removeLayer(map._homeMarkers[id]);
        delete map._homeMarkers[id];
      }
    }
  });
}

function focusDelivery(lat, lng) {
  if (map) map.setView([lat, lng], 15);
}

// Ek click me order ko "Delivered" mark kar do — admin ko dashboard par jaakar
// dhoondhne ki zaroorat nahi, live tracking se hi seedha ho jata hai
async function markDelivered(orderId) {
  if (!confirm(`Order ${orderId} ko "Delivered" mark karein?`)) return;
  await adminFetch(`${API}/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Delivered" }),
  });
  refreshLiveDeliveries();
}

function updateLastRefreshedLabel() {
  const el = document.getElementById("lastRefreshed");
  if (el) el.textContent = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Style for emoji markers
const style = document.createElement("style");
style.textContent = `.emoji-marker { font-size: 24px; text-align: center; }`;
document.head.appendChild(style);

refreshLiveDeliveries();
updateLastRefreshedLabel();
setInterval(() => {
  refreshLiveDeliveries();
  updateLastRefreshedLabel();
}, 5000);
