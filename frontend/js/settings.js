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
  const token = localStorage.getItem("sachbite_admin_token");
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
