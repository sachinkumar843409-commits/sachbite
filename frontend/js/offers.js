const API = "/api";
let currentOffers = [];

function isExpired(validUntil) {
  return new Date(validUntil) < new Date(new Date().toDateString());
}

async function loadOffers() {
  const res = await fetch(`${API}/offers`);
  currentOffers = await res.json();
  renderOffers();
}

function renderOffers() {
  const container = document.getElementById("offersContainer");
  if (currentOffers.length === 0) {
    container.innerHTML = "<p style='color:var(--text-gray)'>Koi offer nahi hai. '+ Add New Offer' se add karein.</p>";
    return;
  }

  container.innerHTML = currentOffers
    .map((o) => {
      const expired = isExpired(o.validUntil);
      return `
      <div class="offer-card-admin">
        <div style="display:flex; align-items:center;">
          ${o.image ? `<img src="${o.image}" alt="${o.title}" style="width:56px;height:56px;object-fit:cover;border-radius:10px;margin-right:14px;" />` : ""}
          <div>
            <div class="offer-discount">${o.discount}</div>
            <div class="offer-title">${o.title}</div>
            <div class="offer-dates">📅 ${o.validFrom} to ${o.validUntil}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <span class="offer-status ${expired ? "expired" : "active"}">${expired ? "Expired" : "Active"}</span>
          <div class="offer-actions" style="margin-top:10px;">
            <button class="btn-edit-menu" onclick="openEditModal('${o.id}')">✏️ Edit</button>
            <button class="btn-del-menu" onclick="deleteOffer('${o.id}')">🗑️ Delete</button>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

async function deleteOffer(id) {
  if (!confirm("Kya aap is offer ko delete karna chahte hain?")) return;
  await adminFetch(`${API}/offers/${id}`, { method: "DELETE" });
  loadOffers();
}

const modal = document.getElementById("modalOverlay");

function openAddModal() {
  document.getElementById("offerId").value = "";
  document.getElementById("offerTitle").value = "";
  document.getElementById("offerDiscount").value = "";
  document.getElementById("offerFrom").value = new Date().toISOString().slice(0, 10);
  document.getElementById("offerUntil").value = "";
  modal.classList.add("show");
}

function openEditModal(id) {
  const offer = currentOffers.find((o) => o.id === id);
  if (!offer) return;
  document.getElementById("offerId").value = offer.id;
  document.getElementById("offerTitle").value = offer.title;
  document.getElementById("offerDiscount").value = offer.discount;
  document.getElementById("offerFrom").value = offer.validFrom;
  document.getElementById("offerUntil").value = offer.validUntil;
  modal.classList.add("show");
}

document.getElementById("addOfferBtn").addEventListener("click", openAddModal);
document.getElementById("cancelModalBtn").addEventListener("click", () => modal.classList.remove("show"));

document.getElementById("saveOfferBtn").addEventListener("click", async () => {
  const id = document.getElementById("offerId").value;
  const title = document.getElementById("offerTitle").value.trim();
  const discount = document.getElementById("offerDiscount").value.trim();
  const validFrom = document.getElementById("offerFrom").value;
  const validUntil = document.getElementById("offerUntil").value;

  if (!title || !discount || !validUntil) {
    alert("Title, Discount aur Valid Until bharna zaroori hai.");
    return;
  }

  if (id) {
    await adminFetch(`${API}/offers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, discount, validFrom, validUntil }),
    });
  } else {
    await adminFetch(`${API}/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, discount, validFrom, validUntil }),
    });
  }

  modal.classList.remove("show");
  loadOffers();
});

loadOffers();
