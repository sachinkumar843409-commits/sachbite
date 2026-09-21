// Delivery Partner Auth Guard — delivery-dashboard.html ke top me include karein.
// Agar valid token nahi hai to delivery-login.html par bhej deta hai.

(async function guardDeliveryPage() {
  const token = sessionStorage.getItem("sachbite_delivery_token");

  if (!token) {
    window.location.href = "delivery-login.html";
    return;
  }

  try {
    const res = await fetch("/api/delivery-auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      sessionStorage.removeItem("sachbite_delivery_token");
      window.location.href = "delivery-login.html";
    }
  } catch (e) {
    console.warn("Delivery auth check fail hua, server chal raha hai check karein.");
  }
})();

function deliveryLogout() {
  const token = sessionStorage.getItem("sachbite_delivery_token");
  fetch("/api/delivery-auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).finally(() => {
    sessionStorage.removeItem("sachbite_delivery_token");
    window.location.href = "delivery-login.html";
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

// Delivery partner ke sab data-badalne/fetch wale API calls is function se
// karne hain, taaki har request ke saath token (Authorization header) apne
// aap jud jaaye.
async function deliveryFetch(url, options = {}) {
  const token = sessionStorage.getItem("sachbite_delivery_token");
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token || ""}` };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    sessionStorage.removeItem("sachbite_delivery_token");
    window.location.href = "delivery-login.html";
  }
  return res;
}
