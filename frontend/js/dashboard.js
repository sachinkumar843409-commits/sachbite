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
    </div>

    <div class="order-grid">
      <div class="order-col">
        <h4>👤 Customer Details</h4>
        <div class="row"><span class="k">👤</span> Name: ${escapeHtml(order.customer.name)}</div>
        <div class="row"><span class="k">📞</span> Phone: ${escapeHtml(order.customer.phone)}</div>
        <div class="row"><span class="k">📍</span> Address: ${escapeHtml(order.customer.address)}</div>
        <div class="row"><span class="k">💳</span> Payment: <span class="pay">${escapeHtml(order.customer.payment)}</span></div>
        ${order.paymentStatus ? `<div class="row"><span class="k">✅</span> Status: <span class="pay">${order.paymentStatus}</span></div>` : ""}
        ${order.upiReference ? `<div class="row"><span class="k">🔢</span> UTR/Ref ID: <span class="pay">${escapeHtml(order.upiReference)}</span></div>` : ""}
        ${order.paymentStatus === "Awaiting Verification (Direct UPI)" ? `<button class="btn-edit-menu" style="margin-top:8px; width:100%;" onclick="markPaymentVerified('${order.id}')">✅ Payment Verify Karein</button>` : ""}
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

async function loadOrders() {
  const container = document.getElementById("ordersContainer");
  const res = await fetch(`${API}/orders`);
  const orders = await res.json();

  if (orders.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="big">📭</div><p>Koi order nahi hai abhi.</p></div>`;
    return;
  }

  container.innerHTML = orders.map(renderOrderCard).join("");
}

async function updateStatus(id, status) {
  await adminFetch(`${API}/orders/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
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
  if (!confirm("Confirm karein ki aapne apne bank/UPI app me yeh payment aata hua dekh liya hai?")) return;
  await adminFetch(`${API}/orders/${id}/payment-status`, { method: "PATCH" });
  loadOrders();
}

document.getElementById("clearAllBtn").addEventListener("click", async () => {
  if (!confirm("Kya aap SAARE orders clear karna chahte hain?")) return;
  await adminFetch(`${API}/orders`, { method: "DELETE" });
  loadOrders();
  loadStats();
});

loadOrders();
loadStats();
