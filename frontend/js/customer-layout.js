function renderCustomerHeader(activePage) {
  const root = document.getElementById("headerRoot");
  if (!root) return;

  const navItems = [
    { label: "Home", href: "index.html", key: "nav_home" },
    { label: "Restaurants", href: "restaurants.html", key: "nav_restaurants" },
    { label: "Offers", href: "offers.html", key: "nav_offers" },
    { label: "Track Order", href: "track-order.html", key: "nav_track" },
    { label: "About", href: "index.html#about", key: "nav_about" },
    { label: "Contact", href: "index.html#contact", key: "nav_contact" },
  ];

  const navHTML = navItems
    .map(
      (item) =>
        `<a href="${item.href}" data-i18n="${item.key}" class="${item.href === activePage ? "active" : ""}">${item.label}</a>`
    )
    .join("");

  root.innerHTML = `
    <div class="topbar-inner">
      <a href="index.html" class="logo">
        Sach<span>Bite</span> 🛵
        <small data-i18n="tagline">Food delivered with love ❤️</small>
      </a>
      <nav class="main-nav">${navHTML}</nav>
      <div class="topbar-right">
        <div class="location-pill"><span class="pin">📍</span> Kanti, Muzaffarpur <span>▾</span></div>
        <button class="btn" id="langToggleBtn" style="border:1.5px solid var(--primary); background:#fff; color:var(--primary); border-radius:20px; padding:8px 14px; font-weight:700; font-size:13px; cursor:pointer;">हिं</button>
        <button class="btn btn-primary" id="loginBtn" data-i18n="login_signup">Login / Signup</button>
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
  if (typeof applyTranslations === "function") applyTranslations();
  if (typeof initLanguageToggle === "function") initLanguageToggle();

  // Inject the login/signup modal once (shared across pages using this dynamic header)
  if (!document.getElementById("authModal")) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="modal-overlay" id="authModal">
        <div class="modal-box">
          <h3 data-i18n="modal_title">Login / Signup</h3>

          <div id="authStepDetails">
            <div class="form-group">
              <label data-i18n="label_name">Name</label>
              <input type="text" id="authName" data-i18n-placeholder="placeholder_name" placeholder="Your name" />
            </div>
            <div class="form-group">
              <label data-i18n="label_phone">Phone Number</label>
              <input type="text" id="authPhone" data-i18n-placeholder="placeholder_phone" placeholder="10-digit phone number" maxlength="10" />
            </div>
            <div class="form-group">
              <label data-i18n="label_email">Email</label>
              <input type="email" id="authEmail" data-i18n-placeholder="placeholder_email" placeholder="you@example.com" />
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" id="authCancelBtn" data-i18n="cancel">Cancel</button>
              <button class="btn-save" id="authSendOtpBtn" data-i18n="send_otp">Send OTP</button>
            </div>
          </div>

          <div id="authStepOtp" style="display:none;">
            <p id="authWelcomeNote" style="font-size:14px; font-weight:700; padding:10px 12px; border-radius:10px; margin-bottom:10px;"></p>
            <p style="font-size:13px; color:var(--text-gray); margin-bottom:10px;">
              <span data-i18n="otp_sent_to">OTP sent to</span> <span id="authOtpSentTo"></span>
            </p>
            <div class="form-group">
              <label data-i18n="label_otp">Enter OTP</label>
              <input type="text" id="authOtp" data-i18n-placeholder="placeholder_otp" placeholder="4-digit OTP" maxlength="4" inputmode="numeric" />
            </div>
            <p id="authOtpDemoNote" style="font-size:12px; color:var(--primary); font-weight:600; margin-bottom:6px;"></p>
            <div class="modal-actions">
              <button class="btn-cancel" id="authBackBtn" data-i18n="back">← Back</button>
              <button class="btn-save" id="authVerifyOtpBtn" data-i18n="verify_continue">Verify &amp; Continue</button>
            </div>
            <div style="text-align:center; margin-top:10px;">
              <a href="#" id="authResendBtn" data-i18n="resend_otp" style="font-size:12px; color:var(--primary); font-weight:600;">Resend OTP</a>
            </div>
          </div>

          <p id="authError" style="color:#dc2626; font-size:12px; margin-top:10px; display:none;"></p>
        </div>
      </div>`
    );
    if (typeof initAuthUI === "function") initAuthUI();
    if (typeof applyTranslations === "function") applyTranslations();
  }
}
