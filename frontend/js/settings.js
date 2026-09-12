const API = "/api";

async function loadSettings() {
  const res = await fetch(`${API}/settings`);
  const s = await res.json();

  document.getElementById("restaurantName").value = s.restaurantName;
  document.getElementById("address").value = s.address;
  document.getElementById("openTime").value = s.openTime;
  document.getElementById("closeTime").value = s.closeTime;
  document.getElementById("deliveryRadiusKm").value = s.deliveryRadiusKm;
  document.getElementById("adminName").value = s.adminName;
  document.getElementById("contactEmail").value = s.contactEmail || "";
  document.getElementById("contactPhone").value = s.contactPhone || "";
  document.getElementById("contactAddress").value = s.contactAddress || "";
  document.getElementById("supportHours").value = s.supportHours || "";
  document.getElementById("heroOfferTag").value = s.heroOfferTag || "";
  document.getElementById("heroOfferTitle").value = s.heroOfferTitle || "";
  document.getElementById("heroOfferSubtitle").value = s.heroOfferSubtitle || "";
  document.getElementById("aboutText").value = s.aboutText || "";
  document.getElementById("securityQuestion").value = s.adminSecurityQuestion || "";
  document.getElementById("businessUpiId").value = s.businessUpiId || "";
  document.getElementById("businessUpiName").value = s.businessUpiName || "";
  document.getElementById("minOrderAmount").value = s.minOrderAmount ?? "";
  document.getElementById("deliveryFee").value = s.deliveryFee ?? "";
  document.getElementById("freeDeliveryAbove").value = s.freeDeliveryAbove ?? "";
  document.getElementById("deliveryTimeMin").value = s.deliveryTimeMin ?? "";
  document.getElementById("deliveryTimeMax").value = s.deliveryTimeMax ?? "";
}

document.getElementById("saveUpiBtn").addEventListener("click", async () => {
  const body = {
    businessUpiId: document.getElementById("businessUpiId").value.trim(),
    businessUpiName: document.getElementById("businessUpiName").value.trim(),
  };
  await adminFetch(`${API}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const msg = document.getElementById("upiSuccess");
  msg.style.display = "block";
  setTimeout(() => (msg.style.display = "none"), 2500);
});

document.getElementById("saveAboutBtn").addEventListener("click", async () => {
  const body = { aboutText: document.getElementById("aboutText").value };
  await adminFetch(`${API}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const msg = document.getElementById("aboutSuccess");
  msg.style.display = "block";
  setTimeout(() => (msg.style.display = "none"), 2500);
});

document.getElementById("saveContactBtn").addEventListener("click", async () => {
  const body = {
    contactEmail: document.getElementById("contactEmail").value,
    contactPhone: document.getElementById("contactPhone").value,
    contactAddress: document.getElementById("contactAddress").value,
    supportHours: document.getElementById("supportHours").value,
  };
  await adminFetch(`${API}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const msg = document.getElementById("contactSuccess");
  msg.style.display = "block";
  setTimeout(() => (msg.style.display = "none"), 2500);
});

document.getElementById("saveOfferBtn").addEventListener("click", async () => {
  const body = {
    heroOfferTag: document.getElementById("heroOfferTag").value,
    heroOfferTitle: document.getElementById("heroOfferTitle").value,
    heroOfferSubtitle: document.getElementById("heroOfferSubtitle").value,
  };
  await adminFetch(`${API}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const msg = document.getElementById("offerSuccess");
  msg.style.display = "block";
  setTimeout(() => (msg.style.display = "none"), 2500);
});

document.getElementById("saveInfoBtn").addEventListener("click", async () => {
  const body = {
    restaurantName: document.getElementById("restaurantName").value,
    address: document.getElementById("address").value,
    openTime: document.getElementById("openTime").value,
    closeTime: document.getElementById("closeTime").value,
    deliveryRadiusKm: Number(document.getElementById("deliveryRadiusKm").value),
    adminName: document.getElementById("adminName").value,
  };

  await adminFetch(`${API}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const msg = document.getElementById("infoSuccess");
  msg.style.display = "block";
  setTimeout(() => (msg.style.display = "none"), 2500);
});

document.getElementById("saveDeliveryBtn").addEventListener("click", async () => {
  const body = {
    minOrderAmount: Number(document.getElementById("minOrderAmount").value),
    deliveryFee: Number(document.getElementById("deliveryFee").value),
    freeDeliveryAbove: Number(document.getElementById("freeDeliveryAbove").value),
    deliveryTimeMin: Number(document.getElementById("deliveryTimeMin").value),
    deliveryTimeMax: Number(document.getElementById("deliveryTimeMax").value),
  };

  await adminFetch(`${API}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const msg = document.getElementById("deliverySuccess");
  msg.style.display = "block";
  setTimeout(() => (msg.style.display = "none"), 2500);
});

document.getElementById("savePasswordBtn").addEventListener("click", async () => {
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const successMsg = document.getElementById("passSuccess");
  const errorMsg = document.getElementById("passError");
  successMsg.style.display = "none";
  errorMsg.style.display = "none";

  if (!currentPassword || !newPassword) {
    alert("Dono fields bharna zaroori hai.");
    return;
  }

  const res = await adminFetch(`${API}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();

  if (res.ok) {
    successMsg.style.display = "block";
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    setTimeout(() => (successMsg.style.display = "none"), 2500);
  } else {
    errorMsg.textContent = "❌ " + (data.error || "Kuch galat ho gaya.");
    errorMsg.style.display = "block";
  }
});

document.getElementById("saveSecurityBtn").addEventListener("click", async () => {
  const token = sessionStorage.getItem("sachbite_admin_token");
  const question = document.getElementById("securityQuestion").value.trim();
  const answer = document.getElementById("securityAnswer").value.trim();
  const currentPassword = document.getElementById("securityCurrentPassword").value;
  const successMsg = document.getElementById("securitySuccess");
  const errorMsg = document.getElementById("securityError");
  successMsg.style.display = "none";
  errorMsg.style.display = "none";

  if (!question || !answer || !currentPassword) {
    errorMsg.textContent = "Question, Answer, aur Current Password teeno bharna zaroori hai.";
    errorMsg.style.display = "block";
    return;
  }

  try {
    const res = await fetch(`${API}/admin/security-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, question, answer, currentPassword }),
    });
    const data = await res.json();

    if (res.ok) {
      successMsg.style.display = "block";
      document.getElementById("securityAnswer").value = "";
      document.getElementById("securityCurrentPassword").value = "";
      setTimeout(() => (successMsg.style.display = "none"), 2500);
    } else {
      errorMsg.textContent = "❌ " + (data.error || "Kuch galat ho gaya.");
      errorMsg.style.display = "block";
    }
  } catch (e) {
    errorMsg.textContent = "Server se connect nahi ho paya.";
    errorMsg.style.display = "block";
  }
});

loadSettings();

// ---------- Staff Accounts ----------
async function loadStaff() {
  const res = await adminFetch(`${API}/admin/staff`);
  const staff = await res.json();
  const listEl = document.getElementById("staffList");

  if (staff.length === 0) {
    listEl.innerHTML = `<p style="color:var(--text-gray); font-size:13px;">Abhi koi staff account nahi hai.</p>`;
    return;
  }

  listEl.innerHTML = staff
    .map(
      (s) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--bg); border-radius:10px; margin-bottom:8px;">
      <div>
        <strong>${s.name}</strong>
        <span style="color:var(--text-gray); font-size:12px;"> — username: ${s.username}</span>
      </div>
      <button class="btn-del-menu" onclick="deleteStaff('${s.id}')">🗑️ Remove</button>
    </div>`
    )
    .join("");
}

async function deleteStaff(id) {
  if (!confirm("Kya aap is staff ka account hatana chahte hain? Wo login nahi kar payega.")) return;
  await adminFetch(`${API}/admin/staff/${id}`, { method: "DELETE" });
  loadStaff();
}

document.getElementById("addStaffBtn").addEventListener("click", async () => {
  const name = document.getElementById("staffName").value.trim();
  const username = document.getElementById("staffUsername").value.trim();
  const password = document.getElementById("staffPassword").value;
  const successMsg = document.getElementById("staffSuccess");
  const errorMsg = document.getElementById("staffError");
  successMsg.style.display = "none";
  errorMsg.style.display = "none";

  if (!name || !username || !password) {
    errorMsg.textContent = "Naam, username aur password teeno bharna zaroori hai.";
    errorMsg.style.display = "block";
    return;
  }
  if (password.length < 6) {
    errorMsg.textContent = "Password kam se kam 6 characters ka hona chahiye.";
    errorMsg.style.display = "block";
    return;
  }

  const res = await adminFetch(`${API}/admin/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, username, password }),
  });
  const data = await res.json();

  if (res.ok) {
    successMsg.style.display = "block";
    document.getElementById("staffName").value = "";
    document.getElementById("staffUsername").value = "";
    document.getElementById("staffPassword").value = "";
    setTimeout(() => (successMsg.style.display = "none"), 2500);
    loadStaff();
  } else {
    errorMsg.textContent = "❌ " + (data.error || "Kuch galat ho gaya.");
    errorMsg.style.display = "block";
  }
});

loadStaff();
