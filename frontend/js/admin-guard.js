// Admin Auth Guard — har admin page ke top me include karein (login.html chhodkar)
// Agar valid token nahi hai to login page par bhej deta hai

(async function guardAdminPage() {
  const token = sessionStorage.getItem("sachbite_admin_token");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      sessionStorage.removeItem("sachbite_admin_token");
      window.location.href = "login.html";
    }
  } catch (e) {
    // Server unreachable — abhi block mat karo, sirf console warning
    console.warn("Admin auth check fail hua, server chal raha hai check karein.");
  }
})();

function adminLogout() {
  const token = sessionStorage.getItem("sachbite_admin_token");
  fetch("/api/admin/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).finally(() => {
    sessionStorage.removeItem("sachbite_admin_token");
    window.location.href = "login.html";
  });
}

// ---------- escapeHtml ----------
// Customer-submitted data (name, phone, address wagera) jab admin panel me dikhaya
// jaata hai, use HTML me daalne se pehle escape karna zaroori hai — warna koi customer
// order place karte waqt apne "naam" me <script> daal kar admin ke browser me code
// chala sakta hai (stored XSS) aur admin ka login token churaa sakta hai. Har jagah
// jahan bhi customer data ko innerHTML me daala jaaye, usse pehle escapeHtml() se guzarna
// chahiye.
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------- adminFetch ----------
// Admin panel ke sab data-badalne wale API calls (add/edit/delete) is function se
// karne hain, taaki har request ke saath admin token (Authorization header) apne aap
// jud jaaye. Backend ab in requests ko token ke bina reject kar deta hai — isse koi
// bhi bina login kiye seedha API call karke data change nahi kar sakta.
async function adminFetch(url, options = {}) {
  const token = sessionStorage.getItem("sachbite_admin_token");
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token || ""}` };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    sessionStorage.removeItem("sachbite_admin_token");
    window.location.href = "login.html";
  }
  return res;
}
