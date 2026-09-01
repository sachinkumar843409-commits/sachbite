// ---------- Toast Notification (styled, animated — replaces alert()) ----------
function ensureToastContainer() {
  let c = document.getElementById("sbToastContainer");
  if (!c) {
    c = document.createElement("div");
    c.id = "sbToastContainer";
    document.body.appendChild(c);
  }
  return c;
}

function showToast(title, message, type = "success") {
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = "sb-toast" + (type === "error" ? " sb-toast-error" : "");
  const icon = type === "error" ? "⚠️" : "✅";
  toast.innerHTML = `
    <div class="sb-toast-icon">${icon}</div>
    <div class="sb-toast-body">
      <div class="sb-toast-title">${title}</div>
      <div class="sb-toast-msg">${message}</div>
    </div>
    <button class="sb-toast-close" aria-label="Close">✕</button>
    <div class="sb-toast-progress"></div>
  `;
  container.appendChild(toast);

  // Trigger entrance animation on next frame
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("sb-toast-show")));

  const remove = () => {
    toast.classList.remove("sb-toast-show");
    toast.classList.add("sb-toast-hide");
    setTimeout(() => toast.remove(), 350);
  };

  const timer = setTimeout(remove, 2600);
  toast.querySelector(".sb-toast-close").addEventListener("click", () => {
    clearTimeout(timer);
    remove();
  });
}

// ---------- Cart helpers (localStorage) — shared across all customer pages ----------
function getCart() {
  return JSON.parse(localStorage.getItem("sachbite_cart") || "[]");
}
function saveCart(cart) {
  localStorage.setItem("sachbite_cart", JSON.stringify(cart));
  updateCartCount();
}
function addToCart(name, price, restaurantName) {
  const cart = getCart();
  const existing = cart.find((i) => i.name === name && i.restaurant === (restaurantName || null));
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ name, price, qty: 1, restaurant: restaurantName || null });
  }
  saveCart(cart);
  showToast("Cart me add ho gaya!", `${name}${restaurantName ? " • " + restaurantName : ""}`, "success");
}
function updateCartCount() {
  const cart = getCart();
  const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
  const el = document.getElementById("cartCount");
  if (el) el.textContent = totalQty;
}
updateCartCount();
