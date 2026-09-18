// Restaurant Partner Auth Guard — partner-dashboard.html ke top me include karein.
// Agar valid token nahi hai to partner-login.html par bhej deta hai.

(async function guardPartnerPage() {
  const token = sessionStorage.getItem("sachbite_partner_token");

  if (!token) {
    window.location.href = "partner-login.html";
    return;
  }

  try {
    const res = await fetch("/api/restaurant-auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      sessionStorage.removeItem("sachbite_partner_token");
      window.location.href = "partner-login.html";
    }
  } catch (e) {
    console.warn("Partner auth check fail hua, server chal raha hai check karein.");
  }
})();

function partnerLogout() {
  const token = sessionStorage.getItem("sachbite_partner_token");
  fetch("/api/restaurant-auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).finally(() => {
    sessionStorage.removeItem("sachbite_partner_token");
    window.location.href = "partner-login.html";
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Partner ke sab data-badalne/fetch wale API calls is function se karne hain,
// taaki har request ke saath partner token (Authorization header) apne aap jud jaaye.
async function partnerFetch(url, options = {}) {
  const token = sessionStorage.getItem("sachbite_partner_token");
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token || ""}` };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    sessionStorage.removeItem("sachbite_partner_token");
    window.location.href = "partner-login.html";
  }
  return res;
}
