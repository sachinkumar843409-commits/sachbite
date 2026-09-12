// ---------- LANGUAGE TOGGLE (Hindi / English) ----------
// Har customer-facing page me is file ko sabse pehle load karein.
// Static text ke liye HTML me data-i18n="key" attribute lagayein — yeh script
// page load hote hi aur language switch hote hi us element ka text badal deta hai.
// Dynamic (JS se generate hone wala) text ke liye t("key") function call karein.

const TRANSLATIONS = {
  // ---------- Header / Navigation ----------
  nav_home: { en: "Home", hi: "होम" },
  nav_restaurants: { en: "Restaurants", hi: "रेस्टोरेंट" },
  nav_offers: { en: "Offers", hi: "ऑफर्स" },
  nav_track: { en: "Track Order", hi: "ऑर्डर ट्रैक करें" },
  nav_about: { en: "About", hi: "हमारे बारे में" },
  nav_contact: { en: "Contact", hi: "संपर्क करें" },
  login_signup: { en: "Login / Signup", hi: "लॉगिन / साइनअप" },
  tagline: { en: "Food delivered with love ❤️", hi: "प्यार से डिलीवर किया गया खाना ❤️" },

  // ---------- Hero Section ----------
  hero_tag: { en: "🔥 FRESH FOOD • FAST DELIVERY", hi: "🔥 ताज़ा खाना • तेज़ डिलीवरी" },
  hero_title_1: { en: "Delicious food from SachBite,", hi: "SachBite से स्वादिष्ट खाना," },
  hero_title_2: { en: "just a bite away.", hi: "बस एक बाइट दूर." },
  hero_desc: {
    en: "Discover delicious food from restaurants near you and get it delivered straight to your door.",
    hi: "अपने आस-पास के रेस्टोरेंट से स्वादिष्ट खाना खोजें और सीधे अपने घर तक डिलीवर करवाएं।",
  },
  search_placeholder: { en: "Search for pizza, burger, momos...", hi: "पिज़्ज़ा, बर्गर, मोमोज खोजें..." },
  search_btn: { en: "Search", hi: "खोजें" },
  delivering_near: { en: "📍 Delivering near", hi: "📍 यहां डिलीवरी हो रही है" },
  fast_delivery: { en: "Fast Delivery", hi: "तेज़ डिलीवरी" },
  launch_badge_title: { en: "Now Live", hi: "अब लाइव" },
  launch_badge_location: { en: "in Kanti, Muzaffarpur", hi: "कांटी, मुजफ्फरपुर में" },
  todays_offer: { en: "🔥 TODAY'S OFFER", hi: "🔥 आज का ऑफर" },

  // ---------- Sections ----------
  craving_heading: { en: "What are you craving?", hi: "आपका मन क्या खाने का है?" },
  popular_restaurants: { en: "Popular restaurants", hi: "लोकप्रिय रेस्टोरेंट" },
  view_all: { en: "View all →", hi: "सभी देखें →" },
  promo_heading: { en: "🏷️ HUNGRY?", hi: "🏷️ भूख लगी है?" },
  promo_sub: { en: "Let's fix that! 😊", hi: "चलिए इसे ठीक करते हैं! 😊" },
  promo_desc: {
    en: "Order your favourite food from restaurants near you with SachBite.",
    hi: "SachBite के साथ अपने पसंदीदा खाने का ऑर्डर करें।",
  },
  explore_food: { en: "Explore Food →", hi: "खाना देखें →" },
  about_heading: { en: "About Us", hi: "हमारे बारे में" },
  contact_heading: { en: "Contact Us", hi: "संपर्क करें" },
  email_us: { en: "Email us", hi: "ईमेल करें" },
  call_us: { en: "Call us", hi: "कॉल करें" },
  support: { en: "Support", hi: "सहायता" },
  support_hours: { en: "24x7 Support", hi: "24x7 सहायता उपलब्ध" },
  location_label: { en: "Location", hi: "स्थान" },
  footer_text: { en: "Food delivered with love ❤️", hi: "प्यार से डिलीवर किया गया खाना ❤️" },

  // ---------- Auth Modal ----------
  modal_title: { en: "Login / Signup", hi: "लॉगिन / साइनअप" },
  label_name: { en: "Name", hi: "नाम" },
  placeholder_name: { en: "Your name", hi: "आपका नाम" },
  label_phone: { en: "Phone Number", hi: "फ़ोन नंबर" },
  placeholder_phone: { en: "10-digit phone number", hi: "10 अंकों का फ़ोन नंबर" },
  label_email: { en: "Email", hi: "ईमेल" },
  placeholder_email: { en: "you@example.com", hi: "aapka@email.com" },
  cancel: { en: "Cancel", hi: "रद्द करें" },
  send_otp: { en: "Send OTP", hi: "OTP भेजें" },
  label_otp: { en: "Enter OTP", hi: "OTP डालें" },
  placeholder_otp: { en: "4-digit OTP", hi: "4 अंकों का OTP" },
  back: { en: "← Back", hi: "← वापस" },
  verify_continue: { en: "Verify & Continue", hi: "वेरीफाई करें और जारी रखें" },
  resend_otp: { en: "Resend OTP", hi: "OTP दोबारा भेजें" },
  otp_sent_to: { en: "OTP sent to", hi: "यह OTP भेजा गया है:" },

  // ---------- Restaurants page ----------
  all_restaurants: { en: "🍴 All Restaurants", hi: "🍴 सभी रेस्टोरेंट" },
  choose_restaurant: { en: "Choose your favourite restaurant and order.", hi: "अपनी पसंद का रेस्टोरेंट चुनें और ऑर्डर करें।" },
  search_restaurant: { en: "Search restaurant or cuisine...", hi: "रेस्टोरेंट या खाने का प्रकार खोजें..." },

  // ---------- Offers page ----------
  todays_offers_heading: { en: "🏷️ Today's Offers", hi: "🏷️ आज के ऑफर्स" },

  // ---------- Track Order page ----------
  track_heading: { en: "📦 Track Your Order", hi: "📦 अपना ऑर्डर ट्रैक करें" },
  track_desc: { en: "All your orders (newest first) will show here.", hi: "यहां आपके सारे ऑर्डर (नए से पुराने) दिखेंगे।" },
  phone_placeholder: { en: "Phone number", hi: "फ़ोन नंबर" },
  track_btn: { en: "🔄 Refresh", hi: "🔄 रीफ्रेश करें" },

  // ---------- Restaurant detail page ----------
  menu_heading: { en: "Menu", hi: "मेन्यू" },

  // ---------- Checkout page ----------
  your_cart: { en: "🛒 Your Cart", hi: "🛒 आपकी कार्ट" },
  item_total: { en: "Item Total", hi: "आइटम का कुल" },
  delivery: { en: "Delivery", hi: "डिलीवरी" },
  free: { en: "FREE", hi: "मुफ़्त" },
  grand_total: { en: "Grand Total", hi: "कुल राशि" },
  delivery_details: { en: "📍 Delivery Details", hi: "📍 डिलीवरी विवरण" },
  label_fullname: { en: "Name", hi: "नाम" },
  placeholder_fullname: { en: "Your full name", hi: "आपका पूरा नाम" },
  label_address: { en: "Address", hi: "पता" },
  placeholder_address: { en: "Delivery address", hi: "डिलीवरी का पता" },
  label_instructions: { en: "Special Instructions (optional)", hi: "विशेष निर्देश (वैकल्पिक)" },
  placeholder_instructions: { en: "e.g. less spicy, don't ring bell", hi: "जैसे: कम मिर्ची, बेल न बजाएं" },
  use_location: { en: "📍 Use My Current Location (for delivery tracking)", hi: "📍 मेरा वर्तमान स्थान इस्तेमाल करें (डिलीवरी ट्रैकिंग के लिए)" },
  location_captured: { en: "✅ Location captured! Delivery boy will deliver here.", hi: "✅ स्थान सेव हो गया! डिलीवरी बॉय यहीं डिलीवर करेगा।" },
  payment_method: { en: "💳 Payment Method", hi: "💳 भुगतान का तरीका" },
  cod: { en: "Cash on Delivery", hi: "डिलीवरी पर नकद भुगतान" },
  upi_direct: { en: "UPI (Google Pay / PhonePe / Paytm) — Direct", hi: "UPI (गूगल पे / फोनपे / पेटीएम) — सीधा" },
  card: { en: "Credit / Debit Card", hi: "क्रेडिट / डेबिट कार्ड" },
  place_order: { en: "Place Order", hi: "ऑर्डर करें" },
  pay_this_amount: { en: "Pay this amount:", hi: "यह राशि भुगतान करें:" },
  pay_via_upi: { en: "📱 Pay via UPI App", hi: "📱 UPI ऐप से भुगतान करें" },
  upi_note_1: {
    en: "On mobile, tap the button above (GPay/PhonePe will open directly), or scan the QR code.",
    hi: "मोबाइल पर ऊपर वाला बटन दबाएं (GPay/PhonePe सीधे खुलेगा), या QR कोड स्कैन करें।",
  },
  utr_label: { en: "Enter UPI Transaction/Reference ID (UTR) after payment", hi: "भुगतान के बाद UPI ट्रांजेक्शन/रेफरेंस आईडी (UTR) डालें" },
  utr_placeholder: { en: "e.g. 123456789012", hi: "जैसे: 123456789012" },
  upi_note_2: {
    en: "In Direct UPI, money comes straight to our account — after paying, please enter your UTR number, we'll verify and confirm your order. Card payment is secured via Razorpay.",
    hi: "Direct UPI में पैसा सीधे हमारे अकाउंट में आता है — भुगतान के बाद UTR नंबर ज़रूर भरें, हम वेरीफाई करके ऑर्डर कन्फर्म कर देंगे। कार्ड भुगतान Razorpay से सुरक्षित होता है।",
  },
};

const LANG_KEY = "sachbite_lang";

function getLang() {
  return localStorage.getItem(LANG_KEY) || "hi";
}

function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  applyTranslations();
  updateLangToggleUI();
  if (typeof renderAuthUI === "function") renderAuthUI();
}

// JS se dynamic text banate waqt yeh function use karein: t("key")
function t(key) {
  const entry = TRANSLATIONS[key];
  if (!entry) return key;
  return entry[getLang()] || entry.en || key;
}

// Page ke saare data-i18n="key" wale elements ka text update karta hai
function applyTranslations() {
  const lang = getLang();
  document.documentElement.lang = lang === "hi" ? "hi" : "en";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const entry = TRANSLATIONS[key];
    if (entry) el.textContent = entry[lang] || entry.en;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const entry = TRANSLATIONS[key];
    if (entry) el.placeholder = entry[lang] || entry.en;
  });
}

function updateLangToggleUI() {
  const btn = document.getElementById("langToggleBtn");
  if (!btn) return;
  btn.textContent = getLang() === "hi" ? "EN" : "हिं";
  btn.title = getLang() === "hi" ? "Switch to English" : "हिंदी में बदलें";
}

function initLanguageToggle() {
  const btn = document.getElementById("langToggleBtn");
  if (btn && !btn.dataset.wired) {
    btn.addEventListener("click", () => {
      setLang(getLang() === "hi" ? "en" : "hi");
    });
    btn.dataset.wired = "true";
  }
  updateLangToggleUI();
}

// ---------- Shared security helpers (XSS-safe rendering) ----------
// Kisi bhi user/admin-entered text (item name, restaurant name, etc.) ko HTML me
// dikhane se pehle iska use karein — warna koi bhi naam me malicious code daal kar
// sabhi customers ke browser me chala sakta hai (Stored XSS).
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

// onclick="..." jaise inline JS string attributes ke andar text daalte waqt iska
// use karein (escapeHtml se alag — yeh quotes/backslash escape karta hai, HTML tags nahi)
function escapeJs(str) {
  return String(str == null ? "" : str)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

// ---------- Mobile hamburger nav (customer header) ----------
// Chhoti screen par nav links hamburger ke peeche chale jaate hain — yahan unhe
// open/close karne ka logic hai, keyboard (Escape) aur outside-click se close bhi
// hota hai (accessibility requirement).
function initMobileNav() {
  const toggle = document.getElementById("mobileNavToggle");
  const nav = document.getElementById("mainNav");
  if (!toggle || !nav) return;
  if (toggle.dataset.wired) return; // dobara render hone par dobara wire na ho
  toggle.dataset.wired = "true";

  function closeNav() {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
  function openNav() {
    nav.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (nav.classList.contains("open")) closeNav();
    else openNav();
  });

  document.addEventListener("click", (e) => {
    if (nav.classList.contains("open") && !nav.contains(e.target) && e.target !== toggle) {
      closeNav();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      closeNav();
      toggle.focus();
    }
  });

  // Nav link dabate hi menu band ho jaaye (mobile par better UX)
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
}

document.addEventListener("DOMContentLoaded", () => {
  applyTranslations();
  initLanguageToggle();
  initMobileNav();
});
