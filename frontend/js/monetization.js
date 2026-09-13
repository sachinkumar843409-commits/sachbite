const API = "/api";

const PLAN_OPTIONS = ["free", "pro", "business"];
const STATUS_OPTIONS = ["active", "inactive", "pending"];

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

    if (!data.restaurants || data.restaurants.length === 0) {
      wrap.innerHTML = `<p style="color:var(--text-gray); font-size:14px;">Koi restaurant listed nahi hai abhi.</p>`;
      return;
    }

    const rows = data.restaurants
      .map(
        (r) => `
      <tr data-id="${r.id}">
        <td>${escapeHtml(r.name)}</td>
        <td><select class="f-plan">${optionsHTML(PLAN_OPTIONS, r.subscriptionPlan)}</select></td>
        <td><select class="f-status">${optionsHTML(STATUS_OPTIONS, r.subscriptionStatus)}</select></td>
        <td><select class="f-featured">${optionsHTML(STATUS_OPTIONS, r.featuredStatus)}</select></td>
        <td><input type="date" class="f-start" value="${toDateInputValue(r.subscriptionStart)}" /></td>
        <td><input type="date" class="f-end" value="${toDateInputValue(r.subscriptionEnd)}" /></td>
        <td>
          <button class="btn-save-mon" onclick="saveRestaurantMonetization('${r.id}', this)">Save</button>
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
