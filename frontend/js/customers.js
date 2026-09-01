const API = "/api";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

async function loadCustomers() {
  const res = await fetch(`${API}/customers`);
  const customers = await res.json();

  document.getElementById("totalCustomers").textContent = customers.length;

  const tbody = document.getElementById("custTableBody");
  if (customers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-gray);">Abhi koi customer nahi hai.</td></tr>`;
    return;
  }

  tbody.innerHTML = customers
    .map(
      (c) => `
    <tr class="cust-row" data-phone="${escapeHtml(c.phone)}" data-name="${escapeHtml(c.name)}">
      <td>${escapeHtml(c.name)} ${c.totalOrders > 1 ? '<span class="repeat-tag">Repeat</span>' : ""}</td>
      <td>${escapeHtml(c.phone)}</td>
      <td>${escapeHtml(c.address)}</td>
      <td>${c.totalOrders}</td>
      <td>Rs ${c.totalSpent}</td>
    </tr>`
    )
    .join("");

  document.querySelectorAll(".cust-row").forEach((row) => {
    row.addEventListener("click", () => showHistory(row.dataset.phone, row.dataset.name));
  });
}

async function showHistory(phone, name) {
  const res = await fetch(`${API}/customers/${encodeURIComponent(phone)}/orders`);
  const orders = await res.json();

  document.getElementById("historyTitle").textContent = `📜 ${name}'s Order History`;
  const list = document.getElementById("historyList");
  list.innerHTML = orders
    .map(
      (o) => `
    <div class="history-row">
      <span>${o.id} — ${formatDate(o.date)}</span>
      <span>Rs ${o.grandTotal} · ${o.status}</span>
    </div>`
    )
    .join("");

  document.getElementById("historyPanel").classList.add("show");
  document.getElementById("historyPanel").scrollIntoView({ behavior: "smooth" });
}

loadCustomers();
