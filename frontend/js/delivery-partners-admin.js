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
      <div class="dp-meta" style="margin-top:8px;">Username: ${escapeHtml(p.username)}</div>
      <div class="dp-actions">
        <button class="btn-edit-menu" onclick="openEditModal('${p.id}')">✏️ Edit</button>
        <button class="btn-del-menu" onclick="deletePartner('${p.id}')">🗑️ Delete</button>
      </div>
    </div>`;
    })
    .join("");
}

async function deletePartner(id) {
  if (!confirm("Kya aap is delivery partner ko delete karna chahte hain?")) return;
  await adminFetch(`${API}/admin/delivery-partners/${id}`, { method: "DELETE" });
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
