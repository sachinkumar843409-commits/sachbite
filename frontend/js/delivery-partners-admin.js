const API = "/api";
let currentPartners = [];

async function loadPartners() {
  const res = await adminFetch(`${API}/admin/delivery-partners`);
  currentPartners = await res.json();
  renderPartners();
}

function renderPartners() {
  const grid = document.getElementById("dpGrid");
  if (currentPartners.length === 0) {
    grid.innerHTML = "<p style='color:var(--text-gray)'>Koi delivery partner nahi hai. '+ Add Delivery Partner' se add karein.</p>";
    return;
  }
  grid.innerHTML = currentPartners
    .map((p) => {
      let pillClass = "offline";
      let pillText = "Offline";
      if (p.status === "inactive") {
        pillClass = "inactive";
        pillText = "Inactive";
      } else if (p.online) {
        pillClass = "online";
        pillText = "🟢 Online";
      }
      return `
    <div class="dp-card">
      <div class="dp-top">
        <div class="dp-thumb">${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}" />` : "🚴"}</div>
        <div>
          <div class="dp-name">${escapeHtml(p.name)}</div>
          <div class="dp-meta">${escapeHtml(p.phone || "")} · ${escapeHtml(p.vehicleType || "Bike")}</div>
        </div>
      </div>
      <span class="dp-status-pill ${pillClass}">${pillText}</span>
      <span class="kyc-pill ${p.kycVerified ? "verified" : "pending"}">${p.kycVerified ? "✅ KYC Verified" : "⏳ KYC Pending"}</span>
      <div class="dp-meta" style="margin-top:8px;">Username: ${escapeHtml(p.username)}</div>
      ${p.aadharNumber || p.drivingLicense || p.vehicleNumber ? `
      <div class="dp-meta" style="margin-top:4px; font-size:11px;">
        ${p.aadharNumber ? `Aadhar: ${escapeHtml(p.aadharNumber)}<br/>` : ""}
        ${p.drivingLicense ? `DL: ${escapeHtml(p.drivingLicense)}<br/>` : ""}
        ${p.vehicleNumber ? `Vehicle No: ${escapeHtml(p.vehicleNumber)}` : ""}
      </div>` : ""}
      ${p.upiId || p.bankAccountNumber ? `
      <div class="dp-meta" style="margin-top:4px; font-size:11px;">
        ${p.upiId ? `UPI: ${escapeHtml(p.upiId)}<br/>` : ""}
        ${p.bankAccountNumber ? `Bank: ${escapeHtml(p.bankAccountName || "")} · A/C ${escapeHtml(p.bankAccountNumber)} · ${escapeHtml(p.bankIfsc || "")}` : ""}
      </div>` : ""}
      ${p.stats ? `
      <div class="dp-stats">
        <div><b>${p.stats.totalDeliveries}</b><span>Deliveries</span></div>
        <div><b>${p.stats.avgRating ? "⭐ " + p.stats.avgRating : "—"}</b><span>Rating${p.stats.ratingCount ? " (" + p.stats.ratingCount + ")" : ""}</span></div>
        <div><b>${p.stats.activeOrderCount}</b><span>Active</span></div>
        <div><b style="color:#dc2626;">₹${p.stats.pendingAmount}</b><span>Pending Payout</span></div>
        <div><b style="color:#b45309;">₹${p.stats.codBalance}</b><span>COD Balance</span></div>
        <div><b style="color:#16a34a;">₹${p.stats.totalPaidOut}</b><span>Paid Out</span></div>
      </div>` : ""}
      <div class="dp-actions">
        <button class="btn-edit-menu" onclick="openEditModal('${p.id}')">✏️ Edit</button>
        <button class="btn-del-menu" onclick="deletePartner('${p.id}')">🗑️ Delete</button>
      </div>
      <div class="dp-actions">
        <button class="btn-edit-menu" style="background:${p.kycVerified ? "#f3f4f6" : "#16a34a"}; color:${p.kycVerified ? "#374151" : "#fff"};" onclick="toggleKyc('${p.id}', ${!p.kycVerified})">${p.kycVerified ? "❌ Unverify" : "✅ Verify KYC"}</button>
        <button class="btn-edit-menu" style="background:#3b82f6; color:#fff;" onclick="openPayoutModal('${p.id}')">💸 Payout</button>
      </div>
      <div class="dp-actions">
        <button class="btn-edit-menu" style="background:#b45309; color:#fff; flex:1;" onclick="openCodDepositModal('${p.id}')">💵 COD Deposit Record</button>
      </div>
    </div>`;
    })
    .join("");
}

function openCodDepositModal(id) {
  const p = currentPartners.find((x) => x.id === id);
  if (!p) return;
  const balance = p.stats ? p.stats.codBalance : 0;
  const amount = prompt(`${p.name} ne COD ka kitna cash jama kiya? (₹)\n\nAbhi COD balance (partner ke paas): ₹${balance}`);
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    if (amount !== null) alert("Valid amount daalein.");
    return;
  }
  const note = prompt("Koi note? (optional)") || "";
  recordCodDeposit(id, Number(amount), note);
}

async function recordCodDeposit(id, amount, note) {
  const res = await adminFetch(`${API}/admin/delivery-partners/${id}/cod-deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, note }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Deposit record nahi ho paya");
    return;
  }
  alert(`✅ ₹${amount} COD deposit record ho gaya. Baaki COD balance: ₹${data.codBalance}`);
  loadPartners();
}

async function deletePartner(id) {
  if (!confirm("Kya aap is delivery partner ko delete karna chahte hain?")) return;
  await adminFetch(`${API}/admin/delivery-partners/${id}`, { method: "DELETE" });
  loadPartners();
}

async function toggleKyc(id, verify) {
  await adminFetch(`${API}/admin/delivery-partners/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kycVerified: verify }),
  });
  loadPartners();
}

function openPayoutModal(id) {
  const p = currentPartners.find((x) => x.id === id);
  if (!p) return;
  const amount = prompt(`${p.name} ko kitna payout record karna hai? (₹)`);
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    if (amount !== null) alert("Valid amount daalein.");
    return;
  }
  const note = prompt("Koi note? (optional, jaise 'Week 1 payout')") || "";
  recordPayout(id, Number(amount), note);
}

async function recordPayout(id, amount, note) {
  const res = await adminFetch(`${API}/admin/delivery-partners/${id}/payout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, note }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Payout record nahi ho paya");
    return;
  }
  alert(`✅ ₹${amount} payout record ho gaya.`);
  loadPartners();
}

const modal = document.getElementById("modalOverlay");

function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add Delivery Partner";
  document.getElementById("dpId").value = "";
  document.getElementById("dpName").value = "";
  document.getElementById("dpPhone").value = "";
  document.getElementById("dpVehicle").value = "Bike";
  document.getElementById("dpUsername").value = "";
  document.getElementById("dpPassword").value = "";
  document.getElementById("dpPasswordHint").textContent = "";
  document.getElementById("dpStatusGroup").style.display = "none";
  modal.classList.add("show");
}

function openEditModal(id) {
  const p = currentPartners.find((x) => x.id === id);
  if (!p) return;
  document.getElementById("modalTitle").textContent = "Edit Delivery Partner";
  document.getElementById("dpId").value = p.id;
  document.getElementById("dpName").value = p.name;
  document.getElementById("dpPhone").value = p.phone || "";
  document.getElementById("dpVehicle").value = p.vehicleType || "Bike";
  document.getElementById("dpUsername").value = p.username;
  document.getElementById("dpPassword").value = "";
  document.getElementById("dpPasswordHint").textContent = "(khaali chhod dein agar badalna nahi hai)";
  document.getElementById("dpStatusGroup").style.display = "block";
  document.getElementById("dpStatus").value = p.status || "active";
  modal.classList.add("show");
}

document.getElementById("addDpBtn").addEventListener("click", openAddModal);
document.getElementById("cancelModalBtn").addEventListener("click", () => modal.classList.remove("show"));

document.getElementById("saveDpBtn").addEventListener("click", async () => {
  const id = document.getElementById("dpId").value;
  const name = document.getElementById("dpName").value.trim();
  const phone = document.getElementById("dpPhone").value.trim();
  const vehicleType = document.getElementById("dpVehicle").value;
  const username = document.getElementById("dpUsername").value.trim();
  const password = document.getElementById("dpPassword").value;

  if (!name || !username) {
    alert("Naam aur username bharna zaroori hai.");
    return;
  }
  if (!id && !password) {
    alert("Naya partner banane ke liye password zaroori hai.");
    return;
  }

  const body = { name, phone, vehicleType, username };
  if (password) body.password = password;
  if (id) body.status = document.getElementById("dpStatus").value;

  const res = await adminFetch(`${API}/admin/delivery-partners${id ? "/" + id : ""}`, {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Save nahi ho paya");
    return;
  }

  modal.classList.remove("show");
  loadPartners();
});

loadPartners();
