function renderCustomerHeader(activePage) {
  const root = document.getElementById("headerRoot");
  if (!root) return;

  const navItems = [
    { label: "Home", href: "index.html" },
    { label: "Restaurants", href: "restaurants.html" },
    { label: "Offers", href: "offers.html" },
    { label: "Track Order", href: "track-order.html" },
    { label: "About", href: "index.html#about" },
    { label: "Contact", href: "index.html#contact" },
  ];

  const navHTML = navItems
    .map(
      (item) =>
        `<a href="${item.href}" class="${item.href === activePage ? "active" : ""}">${item.label}</a>`
    )
    .join("");

  root.innerHTML = `
    <div class="topbar-inner">
      <a href="index.html" class="logo">
        Sach<span>Bite</span> 🛵
        <small>Food delivered with love ❤️</small>
      </a>
      <nav class="main-nav">${navHTML}</nav>
      <div class="topbar-right">
        <div class="location-pill"><span class="pin">📍</span> Kanti, Muzaffarpur <span>▾</span></div>
        <button class="btn btn-primary" id="loginBtn">Login / Signup</button>
        <a href="checkout.html" class="cart-icon">
          🛒
          <span class="cart-badge" id="cartCount">0</span>
        </a>
      </div>
    </div>
  `;

  if (typeof initAuthUI === "function") initAuthUI();
  if (typeof updateCartCount === "function") updateCartCount();
  if (typeof applySiteSettings === "function") applySiteSettings();

  // Inject the login/signup modal once (shared across pages using this dynamic header)
  if (!document.getElementById("authModal")) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="modal-overlay" id="authModal">
        <div class="modal-box">
          <h3>Login / Signup</h3>

          <div id="authStepDetails">
            <div class="form-group">
              <label>Name</label>
              <input type="text" id="authName" placeholder="Your name" />
            </div>
            <div class="form-group">
              <label>Phone Number</label>
              <input type="text" id="authPhone" placeholder="10-digit phone number" maxlength="10" />
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" id="authCancelBtn">Cancel</button>
              <button class="btn-save" id="authSendOtpBtn">Send OTP</button>
            </div>
          </div>

          <div id="authStepOtp" style="display:none;">
            <p style="font-size:13px; color:var(--text-gray); margin-bottom:10px;">
              <span id="authOtpSentTo"></span> par OTP bhej diya gaya hai.
            </p>
            <div class="form-group">
              <label>Enter OTP</label>
              <input type="text" id="authOtp" placeholder="4-digit OTP" maxlength="4" inputmode="numeric" />
            </div>
            <p id="authOtpDemoNote" style="font-size:12px; color:var(--primary); font-weight:600; margin-bottom:6px;"></p>
            <div class="modal-actions">
              <button class="btn-cancel" id="authBackBtn">← Back</button>
              <button class="btn-save" id="authVerifyOtpBtn">Verify &amp; Continue</button>
            </div>
            <div style="text-align:center; margin-top:10px;">
              <a href="#" id="authResendBtn" style="font-size:12px; color:var(--primary); font-weight:600;">Resend OTP</a>
            </div>
          </div>

          <p id="authError" style="color:#dc2626; font-size:12px; margin-top:10px; display:none;"></p>
        </div>
      </div>`
    );
    if (typeof initAuthUI === "function") initAuthUI();
  }
}
