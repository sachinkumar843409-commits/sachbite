const NAV_ITEMS = [
  { label: "🏠 Dashboard", href: "overview.html" },
  { label: "📋 All Orders", href: "dashboard.html" },
  { label: "🛵 Live Tracking", href: "live-tracking.html" },
  { label: "🏬 Restaurants", href: "restaurants.html" },
  { label: "🍽️ Menu Management", href: "menu.html" },
  { label: "👥 Customers", href: "customers.html" },
  { label: "🏷️ Offers", href: "offers.html" },
  { label: "🎨 Appearance", href: "appearance.html" },
  { label: "📊 Analytics", href: "analytics.html" },
  { label: "⚙️ Settings", href: "settings.html" },
];

function renderSidebar(activeHref) {
  const root = document.getElementById("sidebarRoot");
  if (!root) return;

  const navHTML = NAV_ITEMS.map(
    (item) => `<a href="${item.href}" class="${item.href === activeHref ? "active" : ""}">${item.label}</a>`
  ).join("");

  root.innerHTML = `
    <div class="logo">Sach<span>Bite</span> 🛵</div>
    <div class="tagline">Food delivered with love ❤️</div>

    <nav class="side-nav">${navHTML}</nav>

    <div class="promo-box">
      <h4>Hungry?<br />Let's fix that! 😊</h4>
      <p>Order your favourite food from restaurants near you.</p>
      <button onclick="window.location.href='../index.html'">Explore Food →</button>
    </div>

    <div class="side-user">
      <div class="avatar">SB</div>
      <div>
        <div class="name">Sachin Mishra</div>
        <div class="role">Admin</div>
      </div>
      <button onclick="adminLogout()" style="margin-left:auto; background:none; border:none; cursor:pointer; font-size:18px;" title="Logout">🚪</button>
    </div>
  `;
}

function renderTopbar(title, extraHTML = "") {
  const root = document.getElementById("topbarRoot");
  if (!root) return;

  root.innerHTML = `
    <div class="topbar-left">
      <div class="menu-icon" id="mobileMenuBtn">☰</div>
      <h1>${title}</h1>
    </div>
    <div class="topbar-right">
      <div class="location-pill">📍 Kanti, Muzaffarpur <span>▾</span></div>
      <div class="bell">🔔<span class="dot" id="notifCount">0</span></div>
      ${extraHTML}
    </div>
  `;

  // Mobile: hamburger (☰) dabane se sidebar slide-in hokar khulta hai, backdrop dabane se band
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.getElementById("sidebarRoot");
  let backdrop = document.getElementById("sidebarBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "sidebarBackdrop";
    backdrop.className = "sidebar-backdrop";
    document.body.appendChild(backdrop);
  }
  function closeSidebar() {
    sidebar?.classList.remove("open");
    backdrop.classList.remove("open");
  }
  if (menuBtn && !menuBtn.dataset.wired) {
    menuBtn.addEventListener("click", () => {
      sidebar?.classList.toggle("open");
      backdrop.classList.toggle("open");
    });
    menuBtn.dataset.wired = "true";
  }
  backdrop.onclick = closeSidebar;

  // Notification count = pending orders
  fetch("/api/orders/stats")
    .then((r) => r.json())
    .then((s) => {
      const el = document.getElementById("notifCount");
      if (el) el.textContent = s.totalOrders;
    })
    .catch(() => {});
}
