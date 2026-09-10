const API = "/api";

function isExpired(validUntil) {
  return new Date(validUntil) < new Date(new Date().toDateString());
}

async function loadPublicOffers() {
  const res = await fetch(`${API}/offers`);
  const offers = await res.json();
  const active = offers.filter((o) => !isExpired(o.validUntil));

  const list = document.getElementById("offersList");
  if (active.length === 0) {
    list.innerHTML = "<p style='color:var(--text-gray)'>Abhi koi active offer nahi hai. Jaldi wapas aayein! 😊</p>";
    return;
  }

  list.innerHTML = active
    .map(
      (o) => `
    <div class="offer-public-card">
      ${o.image ? `<img src="${o.image}" alt="${escapeHtml(o.title)}" loading="lazy" style="width:64px;height:64px;object-fit:cover;border-radius:12px;margin-right:14px;" />` : ""}
      <div>
        <div class="offer-public-title">${escapeHtml(o.title)}</div>
        <div class="offer-public-dates">📅 Valid until ${escapeHtml(o.validUntil)}</div>
        ${o.code ? `<div style="font-size:12px; color:var(--primary); font-weight:700; margin-top:2px;">🏷️ Code: ${escapeHtml(o.code)}</div>` : ""}
      </div>
      <div class="offer-public-discount">${escapeHtml(o.discount)}</div>
    </div>`
    )
    .join("");
}

loadPublicOffers();
