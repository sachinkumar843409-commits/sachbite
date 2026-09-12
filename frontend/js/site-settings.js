// Backend Settings ko live load karke customer-facing pages par apply karta hai:
// location text, hero offer banner, contact email/support hours.
// Har customer page me include karo (index, restaurants, restaurant, offers, checkout, track-order).

async function applySiteSettings() {
  let settings = {};
  try {
    const res = await fetch("/api/settings");
    settings = await res.json();
  } catch (e) {
    return; // Backend na chale to defaults hi dikhte rahenge
  }

  // ---------- Location text (header pill + "Delivering near" line) ----------
  const locationEls = document.querySelectorAll(".location-pill, .delivering-row strong");
  locationEls.forEach((el) => {
    if (el.classList.contains("location-pill")) {
      // Sirf text node update karo, pin/arrow icons wahi rakho
      const pin = el.querySelector(".pin");
      const arrow = el.querySelector("span:last-child");
      el.innerHTML = "";
      if (pin) el.appendChild(pin);
      el.append(" " + (settings.address || "Location") + " ");
      if (arrow && arrow !== pin) el.appendChild(arrow);
    } else {
      el.textContent = settings.address || el.textContent;
    }
  });

  // ---------- Contact card "Location" value + footer location text ----------
  // Location card poori "contactAddress" dikhati hai (agar admin ne di ho), warna short "address" hi fallback hai
  const contactLocationEl = document.getElementById("contactLocation");
  if (contactLocationEl) contactLocationEl.textContent = settings.contactAddress || settings.address || contactLocationEl.textContent;

  const footerLocationEl = document.getElementById("footerLocation");
  if (footerLocationEl) footerLocationEl.textContent = settings.address || footerLocationEl.textContent;

  // ---------- Hero offer text (sirf index.html par) ----------
  const offerTag = document.getElementById("heroOfferTag");
  const offerTitle = document.getElementById("heroOfferTitle");
  const offerSubtitle = document.getElementById("heroOfferSubtitle");
  if (offerTag) offerTag.textContent = settings.heroOfferTag || "🔥 TODAY'S OFFER";
  if (offerTitle) offerTitle.textContent = settings.heroOfferTitle || "Up to 50% OFF";
  if (offerSubtitle) offerSubtitle.textContent = settings.heroOfferSubtitle || "On Selected Items";

  // ---------- About text (sirf index.html par) ----------
  const aboutEl = document.getElementById("aboutText");
  if (aboutEl && settings.aboutText) aboutEl.textContent = settings.aboutText;

  // ---------- Contact info (footer / contact section) ----------
  const emailEl = document.getElementById("contactEmail");
  const phoneEl = document.getElementById("contactPhone");
  const hoursEl = document.getElementById("supportHours");
  if (emailEl) {
    emailEl.textContent = settings.contactEmail || "";
    emailEl.href = `mailto:${settings.contactEmail || ""}`;
  }
  if (phoneEl) {
    phoneEl.textContent = settings.contactPhone || "";
    phoneEl.href = `tel:${(settings.contactPhone || "").replace(/[^0-9+]/g, "")}`;
  }
  if (hoursEl) hoursEl.textContent = settings.supportHours || "24x7 Support";

  // ---------- Delivery/pricing FAQ text (sirf index.html par) ----------
  const minOrderEl = document.getElementById("minOrderAmountText");
  if (minOrderEl && settings.minOrderAmount != null) minOrderEl.textContent = `₹${settings.minOrderAmount}`;

  const deliveryFeeEl = document.getElementById("deliveryFeeText");
  if (deliveryFeeEl && settings.deliveryFee != null) deliveryFeeEl.textContent = `₹${settings.deliveryFee}`;

  const freeDeliveryEl = document.getElementById("freeDeliveryAboveText");
  if (freeDeliveryEl && settings.freeDeliveryAbove != null) freeDeliveryEl.textContent = `₹${settings.freeDeliveryAbove}`;

  const deliveryTimeEl = document.getElementById("deliveryTimeText");
  if (deliveryTimeEl && settings.deliveryTimeMin != null && settings.deliveryTimeMax != null) {
    deliveryTimeEl.textContent = `${settings.deliveryTimeMin}–${settings.deliveryTimeMax} minutes`;
  }
}

applySiteSettings();
