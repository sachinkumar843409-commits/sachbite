const API = "/api";
const STATUS_STEPS = ["Order Confirmed", "Preparing", "Out for Delivery", "Delivered"];

function statusClass(status) {
  return "status-" + status.replace(/ /g, "-");
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadStats() {
  const res = await fetch(`${API}/orders/stats`);
  const stats = await res.json();
  document.getElementById("totalOrders").textContent = stats.totalOrders;
  document.getElementById("totalSales").textContent = `Rs ${stats.totalSales}`;
  document.getElementById("notifCount").textContent = stats.totalOrders;
}

function renderOrderCard(order) {
  const currentIndex = STATUS_STEPS.indexOf(order.status);

  const statusOptionsHTML = STATUS_STEPS.map((step, i) => {
    let cls = "status-opt";
    if (i < currentIndex) cls += " done";
    if (i === currentIndex) cls += " current";
    const mark = i <= currentIndex ? "✓" : "";
    return `
      <div class="${cls}" onclick="updateStatus('${order.id}', '${step}')">
        <span class="circle">${mark}</span> ${step}
      </div>`;
  }).join("");

  const itemsHTML = order.items
    .map(
      (i) => `
    <div class="item-row"><span>${i.name} × ${i.qty}</span><span>Rs ${i.price * i.qty}</span></div>`
    )
    .join("");

  return `
  <div class="order-card">
    <div class="order-top">
      <div>
        <div class="order-id-label">Order ID</div>
        <div class="order-id">${order.id}</div>
        <div class="order-date">📅 ${formatDate(order.date)}</div>
      </div>
      <div class="order-total">
        <div class="label">Grand Total</div>
        <div class="value">Rs ${order.grandTotal}</div>
      </div>
      <span class="status-badge ${statusClass(order.status)}">${order.status}</span>
      <button class="btn-edit-menu" style="padding:8px 12px; font-size:12px;" onclick="printOrder('${order.id}')">🖨️ Print</button>
    </div>

    <div class="order-grid">
      <div class="order-col">
        <h4>👤 Customer Details</h4>
        <div class="row"><span class="k">👤</span> Name: ${escapeHtml(order.customer.name)}</div>
        <div class="row"><span class="k">📞</span> Phone: ${escapeHtml(order.customer.phone)}</div>
        <div class="row"><span class="k">📍</span> Address: ${escapeHtml(order.customer.address)}</div>
        ${order.instructions ? `<div class="row" style="background:#fff7ed; padding:6px 10px; border-radius:8px;"><span class="k">📝</span> Note: <em>${escapeHtml(order.instructions)}</em></div>` : ""}
        ${order.refundNeeded ? `
          <div class="row" style="background:#fef2f2; padding:8px 10px; border-radius:8px; border:1.5px solid #dc2626;">
            <span class="k">💰</span> <strong style="color:#dc2626;">Refund Pending!</strong> Order cancel hua tha lekin payment already aa gaya tha.
            <button class="btn-edit-menu" style="margin-top:6px; width:100%;" onclick="markRefunded('${order.id}')">✅ Refund Kar Diya — Mark Karein</button>
          </div>
        ` : ""}
        <div class="row"><span class="k">💳</span> Payment: <span class="pay">${escapeHtml(order.customer.payment)}</span></div>
        ${order.deliveryPartnerName ? `<div class="row"><span class="k">🛵</span> Delivery Partner: ${escapeHtml(order.deliveryPartnerName)}</div>` : ""}
        ${order.rating ? `<div class="row"><span class="k">⭐</span> Rating: ${"★".repeat(order.rating)}${"☆".repeat(5 - order.rating)}${order.review ? ` — "${escapeHtml(order.review)}"` : ""}</div>` : ""}
        ${order.paymentStatus ? `<div class="row"><span class="k">✅</span> Status: <span class="pay">${order.paymentStatus}</span></div>` : ""}
        ${order.upiReference ? `<div class="row"><span class="k">🔢</span> UTR/Ref ID: <span class="pay">${escapeHtml(order.upiReference)}</span></div>` : ""}
        ${order.paymentStatus === "Awaiting Verification (Direct UPI)" ? `
          <button class="btn-edit-menu" style="margin-top:8px; width:100%;" onclick="markPaymentVerified('${order.id}')">✅ Payment Verify Karein</button>
          <button class="btn-delete" style="margin-top:8px; width:100%;" onclick="rejectPayment('${order.id}')">❌ UTR Galat Hai</button>
        ` : ""}
      </div>

      <div class="order-col items-list">
        <h4>🛍️ Items</h4>
        ${itemsHTML}
        <div class="items-divider"></div>
        <div class="total-row"><span>Item Total</span><span>Rs ${order.itemTotal}</span></div>
        <div class="total-row delivery"><span>Delivery</span><span>FREE</span></div>
      </div>

      <div class="order-col">
        <h4>Update Status</h4>
        <div class="status-options">${statusOptionsHTML}</div>
        <button class="btn-delete" onclick="deleteOrder('${order.id}')">🗑️ Delete Order</button>
      </div>
    </div>
  </div>`;
}

let knownOrderIds = null; // pehli baar null rakhte hain taaki page-load par purane orders ke liye beep na baje

function playNewOrderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.2].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.3);
    });
  } catch (e) {}
}

let allOrdersCache = [];

async function loadOrders() {
  const container = document.getElementById("ordersContainer");
  const res = await fetch(`${API}/orders`);
  let orders = await res.json();
  allOrdersCache = orders;

  // Naya order aane par beep + browser notification (page pehli baar load hote waqt nahi)
  const currentIds = new Set(orders.map((o) => o.id));
  if (knownOrderIds !== null) {
    const newOnes = orders.filter((o) => !knownOrderIds.has(o.id));
    if (newOnes.length > 0) {
      playNewOrderSound();
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("🔔 Naya Order Aaya!", { body: `${newOnes[0].customer.name} — ₹${newOnes[0].grandTotal}` });
      }
    }
  }
  knownOrderIds = currentIds;

  // Search + date filter apply karein
  const searchVal = (document.getElementById("orderSearchInput")?.value || "").trim().toLowerCase();
  const dateFilter = document.getElementById("orderDateFilter")?.value || "all";

  if (searchVal) {
    orders = orders.filter(
      (o) => o.id.toLowerCase().includes(searchVal) || o.customer.name.toLowerCase().includes(searchVal) || o.customer.phone.includes(searchVal)
    );
  }
  if (dateFilter !== "all") {
    const now = new Date();
    orders = orders.filter((o) => {
      const d = new Date(o.date);
      if (dateFilter === "today") return d.toDateString() === now.toDateString();
      if (dateFilter === "week") return now - d <= 7 * 24 * 60 * 60 * 1000;
      return true;
    });
  }

  if (orders.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="big">📭</div><p>Koi order nahi mila.</p></div>`;
    return;
  }

  container.innerHTML = orders.map(renderOrderCard).join("");
}

async function updateStatus(id, status) {
  let deliveryPartnerName;
  if (status === "Out for Delivery") {
    deliveryPartnerName = prompt("Delivery partner ka naam daalein (customer ko dikhega):", "");
    if (deliveryPartnerName === null) return; // admin ne cancel kiya
  }
  await adminFetch(`${API}/orders/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, deliveryPartnerName }),
  });
  loadOrders();
}

async function deleteOrder(id) {
  if (!confirm("Kya aap is order ko delete karna chahte hain?")) return;
  await adminFetch(`${API}/orders/${id}`, { method: "DELETE" });
  loadOrders();
  loadStats();
}

async function markPaymentVerified(id) {
  if (!confirm("Confirm karein ki aapne apne bank/UPI app me yeh payment aata hua dekh liya hai? Customer ko SMS chala jayega.")) return;
  await adminFetch(`${API}/orders/${id}/payment-status`, { method: "PATCH" });
  loadOrders();
}

async function rejectPayment(id) {
  if (!confirm("Kya UTR galat hai/match nahi hua? Customer ko SMS chala jayega dobara sahi UTR bhejne ke liye.")) return;
  await adminFetch(`${API}/orders/${id}/reject-payment`, { method: "PATCH" });
  loadOrders();
}

async function markRefunded(id) {
  if (!confirm("Confirm karein ki aapne is customer ko manually UPI/bank se refund kar diya hai?")) return;
  await adminFetch(`${API}/orders/${id}/mark-refunded`, { method: "PATCH" });
  loadOrders();
}

// Order slip print karne ke liye — kitchen/staff ke liye kagaz par nikalna
function printOrder(id) {
  const order = allOrdersCache.find((o) => o.id === id);
  if (!order) return;

  const itemsHtml = order.items
    .map((i) => `<tr><td>${escapeHtml(i.name)}</td><td style="text-align:center;">x${i.qty}</td><td style="text-align:right;">₹${i.price * i.qty}</td></tr>`)
    .join("");

  const win = window.open("", "_blank");
  win.document.write(`
    <html>
    <head>
      <title>Order ${order.id}</title>
      <style>
        body { font-family: monospace; padding: 20px; max-width: 380px; }
        h2 { text-align: center; margin-bottom: 4px; }
        .center { text-align: center; }
        hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
        table { width: 100%; font-size: 13px; }
        .total { font-weight: bold; font-size: 15px; }
      </style>
    </head>
    <body onload="window.print()">
      <h2>🛵 SachBite</h2>
      <div class="center">Order Slip</div>
      <hr />
      <div><strong>Order ID:</strong> ${order.id}</div>
      <div><strong>Time:</strong> ${new Date(order.date).toLocaleString("en-IN")}</div>
      <div><strong>Customer:</strong> ${escapeHtml(order.customer.name)}</div>
      <div><strong>Phone:</strong> ${escapeHtml(order.customer.phone)}</div>
      <div><strong>Address:</strong> ${escapeHtml(order.customer.address)}</div>
      ${order.instructions ? `<div><strong>Note:</strong> ${escapeHtml(order.instructions)}</div>` : ""}
      <hr />
      <table>${itemsHtml}</table>
      <hr />
      <div class="total">Total: ₹${order.grandTotal}</div>
      <div><strong>Payment:</strong> ${escapeHtml(order.customer.payment)}</div>
      <hr />
      <div class="center">Dhanyawad! 🙏</div>
    </body>
    </html>
  `);
  win.document.close();
}

document.getElementById("clearAllBtn").addEventListener("click", async () => {
  if (!confirm("Kya aap SAARE orders clear karna chahte hain?")) return;
  await adminFetch(`${API}/orders`, { method: "DELETE" });
  loadOrders();
  loadStats();
});

loadOrders();
loadStats();

// Har 8 second me naye orders check karte hain (sound alert ke liye)
setInterval(loadOrders, 8000);
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

document.getElementById("orderSearchInput")?.addEventListener("input", loadOrders);
document.getElementById("orderDateFilter")?.addEventListener("change", loadOrders);
