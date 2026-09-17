const API = "/api";

const PLAN_OPTIONS = ["free", "pro", "business"];
const STATUS_OPTIONS = ["active", "inactive", "pending"];
let SUBSCRIPTION_PLAN_PRICES = { free: 0, pro: 499, business: 1499 };
let razorpayReady = false;

function optionsHTML(list, selected) {
  return list
    .map((v) => `<option value="${v}" ${v === selected ? "selected" : ""}>${v.charAt(0).toUpperCase() + v.slice(1)}</option>`)
    .join("");
}

function toDateInputValue(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

async function loadMonetization() {
  const wrap = document.getElementById("monetizationTableWrap");
  const commissionDisplay = document.getElementById("commissionPercentDisplay");
  const commissionInput = document.getElementById("commissionPercentInput");

  try {
    const res = await adminFetch(`${API}/admin/monetization`);
    if (!res.ok) throw new Error("Failed to load monetization data");
    const data = await res.json();

    if (data.platformCommissionPercent != null) {
      commissionDisplay.textContent = `${data.platformCommissionPercent}%`;
      commissionInput.value = data.platformCommissionPercent;
    }
    if (data.subscriptionPrices) SUBSCRIPTION_PLAN_PRICES = data.subscriptionPrices;
    razorpayReady = !!data.razorpayReady;
    applyTogglesUI(data);

    if (!data.restaurants || data.restaurants.length === 0) {
      wrap.innerHTML = `<p style="color:var(--text-gray); font-size:14px;">Koi restaurant listed nahi hai abhi.</p>`;
      return;
    }

    const rows = data.restaurants
      .map(
        (r) => `
      <tr data-id="${r.id}">
        <td>${escapeHtml(r.name)}</td>
        <td><select class="f-plan" aria-label="Subscription plan for ${escapeHtml(r.name)}">${optionsHTML(PLAN_OPTIONS, r.subscriptionPlan)}</select></td>
        <td><select class="f-status" aria-label="Subscription status for ${escapeHtml(r.name)}">${optionsHTML(STATUS_OPTIONS, r.subscriptionStatus)}</select></td>
        <td><select class="f-featured" aria-label="Featured status for ${escapeHtml(r.name)}">${optionsHTML(STATUS_OPTIONS, r.featuredStatus)}</select></td>
        <td><select class="f-sponsored" aria-label="Sponsored status for ${escapeHtml(r.name)}">${optionsHTML(STATUS_OPTIONS, r.sponsoredStatus)}</select></td>
        <td><input type="date" class="f-start" aria-label="Subscription start date for ${escapeHtml(r.name)}" value="${toDateInputValue(r.subscriptionStart)}" /></td>
        <td><input type="date" class="f-end" aria-label="Subscription end date for ${escapeHtml(r.name)}" value="${toDateInputValue(r.subscriptionEnd)}" /></td>
        <td>
          <button class="btn-save-mon" onclick="saveRestaurantMonetization('${r.id}', this)">Save</button>
          <button class="btn-save-mon" style="background:#16a34a;" onclick="payAndActivateUpi('${r.id}', this)">📱 Pay via UPI</button>
          <button class="btn-save-mon" style="background:${razorpayReady ? "#3b82f6" : "#9ca3af"};" onclick="payAndActivateRazorpay('${r.id}', this)" ${razorpayReady ? "" : 'title="Settings page se Razorpay enable karein"'}>
            💳 Razorpay${razorpayReady ? "" : " (Coming Soon)"}
          </button>
          <span class="row-save-msg" style="font-size:11px; font-weight:600; margin-left:6px;"></span>
        </td>
      </tr>`
      )
      .join("");

    wrap.innerHTML = `
      <table class="mon-table">
        <thead>
          <tr>
            <th>Restaurant</th>
            <th>Current Plan</th>
            <th>Subscription Status</th>
            <th>Featured Status</th>
            <th>Sponsored Status</th>
            <th>Start</th>
            <th>End</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch (e) {
    wrap.innerHTML = `<p style="color:var(--red); font-size:14px;">Monetization data load nahi ho paya. Backend chal raha hai check karein.</p>`;
  }
}

async function saveRestaurantMonetization(id, btn) {
  const row = btn.closest("tr");
  const msgEl = row.querySelector(".row-save-msg");
  const body = {
    subscriptionPlan: row.querySelector(".f-plan").value,
    subscriptionStatus: row.querySelector(".f-status").value,
    featuredStatus: row.querySelector(".f-featured").value,
    sponsoredStatus: row.querySelector(".f-sponsored").value,
    subscriptionStart: row.querySelector(".f-start").value || null,
    subscriptionEnd: row.querySelector(".f-end").value || null,
  };

  btn.disabled = true;
  msgEl.textContent = "";
  try {
    const res = await adminFetch(`${API}/admin/monetization/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");

    msgEl.style.color = "var(--green)";
    msgEl.textContent = "✅ Saved";
  } catch (e) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "❌ " + e.message;
  } finally {
    btn.disabled = false;
    setTimeout(() => (msgEl.textContent = ""), 3000);
  }
}

// ---------- Subscription payment ----------
// Do options: (1) UPI Direct — hamesha available, customer checkout jaisa hi
// tareeka (QR + UTR, admin verify karta hai). (2) Razorpay — sirf tab jab
// Settings page se admin ne enable + Key ID/Secret configure kiya ho, warna
// button "Coming Soon" dikhta hai aur disabled rehta hai.
let businessUpiId = "";
let businessUpiName = "SachBite";

fetch(`${API}/settings`)
  .then((r) => r.json())
  .then((s) => {
    businessUpiId = s.businessUpiId || "";
    businessUpiName = s.businessUpiName || "SachBite";
  })
  .catch(() => {});

function payAndActivateUpi(id, btn) {
  const row = btn.closest("tr");
  const msgEl = row.querySelector(".row-save-msg");
  const plan = row.querySelector(".f-plan").value;

  if (plan === "free") {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "Free plan ke liye payment nahi chahiye — seedha 'Save' dabayein.";
    return;
  }
  if (!businessUpiId) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "Business UPI ID Settings page me set nahi hai.";
    return;
  }

  // Agar panel already khula hai to dobara na banayein — bas dikhado/hatado
  const existing = document.getElementById(`upiPayPanel-${id}`);
  if (existing) {
    existing.remove();
    return;
  }

  const amount = SUBSCRIPTION_PLAN_PRICES[plan];
  const note = encodeURIComponent(`SachBite Subscription ${plan}`);
  const upiLink = `upi://pay?pa=${encodeURIComponent(businessUpiId)}&pn=${encodeURIComponent(businessUpiName)}&am=${amount}&cu=INR&tn=${note}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`;

  const panelRow = document.createElement("tr");
  panelRow.id = `upiPayPanel-${id}`;
  panelRow.innerHTML = `
    <td colspan="7" style="background:#fafafa; padding:14px;">
      <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
        <img src="${qrUrl}" alt="UPI QR" width="150" height="150" style="border:1px solid #eee; border-radius:8px;" />
        <div style="min-width:220px;">
          <div style="font-weight:700; margin-bottom:4px;">₹${amount} — ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan (30 din)</div>
          <div style="font-size:12px; color:var(--text-gray); margin-bottom:10px;">Restaurant ko ye QR scan karke ${businessUpiName} ke UPI par ₹${amount} pay karna hai. Payment hone ke baad, 12-digit UTR/transaction reference number niche daal kar confirm karein.</div>
          <input type="text" class="upi-ref-input" placeholder="12-digit UTR number" maxlength="12" style="padding:6px 8px; border:1px solid #ddd; border-radius:6px; width:180px;" />
          <button class="btn-save-mon" style="background:#16a34a; margin-left:6px;" onclick="confirmUpiPayment('${id}', '${plan}', this)">✅ Confirm Payment</button>
          <a href="${upiLink}" style="display:block; margin-top:8px; font-size:12px;">📱 UPI app me kholein</a>
        </div>
      </div>
    </td>`;
  row.after(panelRow);
}

async function confirmUpiPayment(id, plan, btn) {
  const panelRow = document.getElementById(`upiPayPanel-${id}`);
  const input = panelRow.querySelector(".upi-ref-input");
  const upiReference = input.value.trim();
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const msgEl = row.querySelector(".row-save-msg");

  if (!/^\d{12}$/.test(upiReference)) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "UTR number sahi 12-digit ka hona chahiye.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Confirm ho raha hai...";
  try {
    const res = await adminFetch(`${API}/admin/monetization/${id}/activate-upi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, upiReference }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Activate nahi ho paya");

    panelRow.remove();
    msgEl.style.color = "var(--green)";
    msgEl.textContent = "✅ Payment confirm — subscription active ho gayi.";
    loadMonetization();
  } catch (e) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "❌ " + e.message;
    btn.disabled = false;
    btn.textContent = "✅ Confirm Payment";
  }
}

// Razorpay se activate — sirf tab kaam karega jab Settings se enable ho.
async function payAndActivateRazorpay(id, btn) {
  const row = btn.closest("tr");
  const msgEl = row.querySelector(".row-save-msg");
  const plan = row.querySelector(".f-plan").value;

  if (!razorpayReady) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "Razorpay abhi 'Coming Soon' hai — Settings page se enable karein (Key ID/Secret daal kar), ya UPI (Direct) use karein.";
    return;
  }
  if (plan === "free") {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "Free plan ke liye payment nahi chahiye — seedha 'Save' dabayein.";
    return;
  }
  if (typeof Razorpay === "undefined") {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "Payment widget load nahi hui. Page refresh karke try karein.";
    return;
  }

  btn.disabled = true;
  msgEl.style.color = "var(--text-gray)";
  msgEl.textContent = "Payment window khul raha hai...";

  try {
    const orderRes = await adminFetch(`${API}/admin/monetization/${id}/pay/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) throw new Error(orderData.error || "Payment order nahi ban paya");

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "SachBite",
      description: `Subscription — ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan (30 din)`,
      order_id: orderData.orderId,
      theme: { color: "#ff7a1a" },
      handler: async function (response) {
        msgEl.textContent = "Payment verify ho raha hai...";
        try {
          const verifyRes = await adminFetch(`${API}/admin/monetization/${id}/pay/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.verified) {
            msgEl.style.color = "var(--green)";
            msgEl.textContent = "✅ Payment safal — subscription active ho gayi.";
            loadMonetization();
          } else {
            msgEl.style.color = "var(--red)";
            msgEl.textContent = "❌ Payment verify nahi ho paya.";
          }
        } finally {
          btn.disabled = false;
        }
      },
      modal: { ondismiss: function () { btn.disabled = false; msgEl.textContent = ""; } },
    };

    const rzp = new Razorpay(options);
    rzp.on("payment.failed", function (response) {
      msgEl.style.color = "var(--red)";
      msgEl.textContent = "❌ Payment fail: " + (response.error.description || "dobara try karein");
      btn.disabled = false;
    });
    rzp.open();
  } catch (e) {
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "❌ " + e.message;
    btn.disabled = false;
  }
}

// ---------- Coming Soon toggles (Featured promo / Sponsored offers / Plan
// availability) — admin yahin se on/off karta hai, koi code change nahi
// chahiye. Off rehne par card "Coming Soon" dikhata hai. ----------
function applyTogglesUI(data) {
  document.getElementById("toggleFeaturedPromo").checked = data.featuredPromoEnabled;
  document.getElementById("toggleSponsoredOffers").checked = data.sponsoredOffersEnabled;
  document.getElementById("togglePlanPro").checked = data.planProAvailable;
  document.getElementById("togglePlanBusiness").checked = data.planBusinessAvailable;

  setPromoCardState("featuredPromo", data.featuredPromoEnabled);
  setPromoCardState("sponsoredOffers", data.sponsoredOffersEnabled);

  document.getElementById("planProPriceText").textContent = `₹${SUBSCRIPTION_PLAN_PRICES.pro}`;
  document.getElementById("planBusinessPriceText").textContent = `₹${SUBSCRIPTION_PLAN_PRICES.business}`;
  setPlanCardState("planPro", data.planProAvailable);
  setPlanCardState("planBusiness", data.planBusinessAvailable);
}

function setPromoCardState(prefix, enabled) {
  const statusText = document.getElementById(`${prefix}StatusText`);
  const btn = document.getElementById(`${prefix}Btn`);
  if (enabled) {
    statusText.textContent = "Available";
    statusText.style.color = "#107c38";
    btn.textContent = "Available — restaurants row mein manage karein";
    btn.className = "btn-current";
    btn.disabled = true; // asli activation neeche wali table se hoti hai
  } else {
    statusText.textContent = "Coming Soon";
    statusText.style.color = "";
    btn.textContent = "Coming Soon";
    btn.className = "btn-coming-soon";
    btn.disabled = true;
  }
}

function setPlanCardState(prefix, available) {
  const chip = document.getElementById(`${prefix}StatusChip`);
  const btn = document.getElementById(`${prefix}Btn`);
  if (available) {
    chip.textContent = "Available";
    chip.className = "plan-status available";
    btn.textContent = "Available — restaurants row mein manage karein";
    btn.className = "btn-current";
  } else {
    chip.textContent = "Coming Soon";
    chip.className = "plan-status coming-soon";
    btn.textContent = "Coming Soon";
    btn.className = "btn-coming-soon";
  }
  btn.disabled = true; // asli plan-activation neeche wali "Monetization Status" table se hoti hai
}

async function saveToggle(field, checked) {
  const msg = document.getElementById("togglesSaveMsg");
  try {
    const res = await adminFetch(`${API}/admin/monetization/toggles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: checked }),
    });
    if (!res.ok) throw new Error();
    msg.style.color = "var(--green)";
    msg.textContent = "✅ Saved.";
    msg.style.display = "block";
    setTimeout(() => (msg.style.display = "none"), 2000);
    loadMonetization();
  } catch (e) {
    msg.style.color = "var(--red)";
    msg.textContent = "❌ Save nahi ho paya.";
    msg.style.display = "block";
  }
}

document.getElementById("toggleFeaturedPromo").addEventListener("change", (e) => saveToggle("featuredPromoEnabled", e.target.checked));
document.getElementById("toggleSponsoredOffers").addEventListener("change", (e) => saveToggle("sponsoredOffersEnabled", e.target.checked));
document.getElementById("togglePlanPro").addEventListener("change", (e) => saveToggle("planProAvailable", e.target.checked));
document.getElementById("togglePlanBusiness").addEventListener("change", (e) => saveToggle("planBusinessAvailable", e.target.checked));

document.getElementById("saveCommissionBtn").addEventListener("click", async () => {
  const btn = document.getElementById("saveCommissionBtn");
  const input = document.getElementById("commissionPercentInput");
  const msgEl = document.getElementById("commissionSaveMsg");
  const value = Number(input.value);

  if (Number.isNaN(value) || value < 0 || value > 100) {
    msgEl.style.display = "block";
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "Commission 0 se 100 ke beech honi chahiye.";
    return;
  }

  btn.disabled = true;
  try {
    const res = await adminFetch(`${API}/admin/monetization/commission`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platformCommissionPercent: value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");

    document.getElementById("commissionPercentDisplay").textContent = `${data.platformCommissionPercent}%`;
    msgEl.style.display = "block";
    msgEl.style.color = "var(--green)";
    msgEl.textContent = "✅ Commission updated.";
  } catch (e) {
    msgEl.style.display = "block";
    msgEl.style.color = "var(--red)";
    msgEl.textContent = "❌ " + e.message;
  } finally {
    btn.disabled = false;
    setTimeout(() => (msgEl.style.display = "none"), 3000);
  }
});

loadMonetization();
