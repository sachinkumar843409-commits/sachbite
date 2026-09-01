# 🛵 SachBite — Food Delivery Website (Full Stack)

Yeh aapki **SachBite** website hai — bilkul same jaise screenshots me thi, plus **poora admin dashboard** with all sections:

- **Customer Home Page** (index.html) — Naya modern Tailwind design, hero, categories, popular restaurants
- **Restaurants Page** (restaurants.html) — Sab restaurants ki list, search/filter
- **Restaurant Menu Page** (restaurant.html) — Restaurant ki detail + poora menu, add to cart
- **Offers Page** (offers.html) — Active discounts/coupons customer ke liye
- **Track Order Page** (track-order.html) — Phone number se order dekhna + **LIVE MAP** jisme delivery boy kaha tak pahucha hai aur kitna time lagega
- **Checkout Page** (checkout.html) — Cart se order place karna + **Live Location** capture (delivery tracking ke liye)
- **Login/Signup** — Simple name + phone based login (header me dikhega)
- **Restaurant Admin Dashboard** (`admin/` folder me, **password-protected**) — 8 sections:
  - 🔒 **Login** (admin/login.html) — Sirf sahi password se hi andar aa sakte hain
  - 🏠 **Dashboard** (admin/overview.html) — Today's stats, last 7 days sales chart, top items, peak hours
  - 📋 **All Orders** (admin/dashboard.html) — Order list, status update, delete/clear orders
  - 🛵 **Live Tracking** (admin/live-tracking.html) — **Map par saare "Out for Delivery" orders ki live position, ETA, distance**
  - 🍽️ **Menu Management** (admin/menu.html) — Items add/edit/delete, available/unavailable toggle
  - 👥 **Customers** (admin/customers.html) — Customer list, repeat customer tag, order history
  - 🏷️ **Offers** (admin/offers.html) — Coupons add/edit/delete, active/expired status
  - 🎨 **Appearance** (admin/appearance.html) — Hero image, promo banner, restaurant photos, menu item photos, offer images — sab seedha upload karke laga sakte hain, built-in file manager ke saath
  - 🏬 **Restaurants** (admin/restaurants.html) — **Naya!** Restaurant add/edit/delete karein, aur "kis restaurant se kitna order/revenue aaya" ka poora report dekhein
  - 📊 **Analytics** (admin/analytics.html) — Sales chart, top-selling items, peak order hours
  - ⚙️ **Settings** (admin/settings.html) — Restaurant info, delivery radius, admin password change
- **Backend** (Node.js + Express) — Real API jo sab kuch save/update/delete karta hai (db.json file me)

---

## 📁 Folder Structure
```
sachbite/
  backend/
    server.js       → Express server + API routes + image upload endpoints
    db.json         → Database (orders, menu, offers, settings, uploads) - JSON file
    uploads/         → Admin ne jo bhi images upload ki hain, wo yahan save hoti hain
    package.json
    start.ps1        → Windows PowerShell auto-start script
  frontend/
    index.html        → Home page
    checkout.html      → Checkout / place order
    overview.html      → Admin Dashboard (overview/stats)
    dashboard.html      → All Orders page
    menu.html          → Menu Management
    customers.html      → Customers
    offers.html         → Offers
    appearance.html      → 🎨 Appearance / Customization panel (naya!)
    analytics.html      → Analytics
    settings.html       → Settings
    css/
      style.css
      dashboard.css
    js/
      main.js, checkout.js, layout.js, dashboard.js,
      overview.js, menu.js, customers.js, offers.js,
      appearance.js, analytics.js, settings.js
```

---

## ▶️ Step 1 — Node.js Install Karein
Agar Node.js already install nahi hai, to yahan se download karein:
👉 https://nodejs.org (LTS version)

Terminal me check karein:
```bash
node -v
npm -v
```

## ▶️ Step 2 — Project Folder Kholen
Zip file ko extract karein, phir terminal me backend folder me jaayein:
```bash
cd sachbite/backend
```

## ▶️ Step 3 — Dependencies Install Karein
```bash
npm install
```
(Isse `express`, `cors`, `multer` (image upload ke liye), `razorpay` (payment gateway ke liye), aur `bcryptjs` (secure password hashing ke liye) install ho jaayenge — internet chahiye hoga iske liye)

## ▶️ Step 4 — Server Start Karein
```bash
npm start
```
Terminal me yeh dikhega:
```
🛵 SachBite server chal raha hai: http://localhost:3000
```

## ▶️ Step 5 — Website Kholen
Browser me yeh links kholein:

| Page | URL |
|---|---|
| 🏠 Home Page | http://localhost:3000/index.html |
| 🍴 Restaurants | http://localhost:3000/restaurants.html |
| 🏷️ Offers (customer) | http://localhost:3000/offers.html |
| 📦 Track Order (live map ke saath) | http://localhost:3000/track-order.html |
| 🛒 Checkout (location capture ke saath) | http://localhost:3000/checkout.html |
| 🔒 **Admin Login** | http://localhost:3000/admin/login.html |
| 🏠 Admin Dashboard (login ke baad) | http://localhost:3000/admin/overview.html |
| 🛵 Live Tracking (admin) | http://localhost:3000/admin/live-tracking.html |
| 📋 All Orders (admin) | http://localhost:3000/admin/dashboard.html |
| 🍽️ Menu Management (admin) | http://localhost:3000/admin/menu.html |
| 👥 Customers (admin) | http://localhost:3000/admin/customers.html |
| 🏷️ Offers (admin) | http://localhost:3000/admin/offers.html |
| 🎨 Appearance (admin) | http://localhost:3000/admin/appearance.html |
| 🏬 Restaurants (admin) | http://localhost:3000/admin/restaurants.html |
| 📊 Analytics (admin) | http://localhost:3000/admin/analytics.html |
| ⚙️ Settings (admin) | http://localhost:3000/admin/settings.html |

Sab pages ke andar navigation links diye hain — ek se doosre par easily jaa sakte hain.

**⚠️ Admin ka default password:** `admin123` — **isse turant Settings page se change kar lein!**
Ab koi bhi seedha `admin/overview.html` type karke andar nahi ghus sakta — pehle `admin/login.html` par sahi password dena hoga.

## 🛵 Live Delivery Tracking kaise kaam karta hai
1. Customer checkout karte waqt **"Use My Current Location"** button dabata hai — browser location permission maangega, allow karna hoga.
2. Jab admin us order ka status **"Out for Delivery"** karta hai, tab se delivery boy ka **simulated** movement start ho jaata hai (restaurant se customer ki location tak, 25 minute ke andar).
3. Customer **Track Order** page par live map dekh sakta hai — 🛵 icon dheere-dheere restaurant se uske address tak move karta hai, saath me ETA aur distance bhi dikhta hai.
4. Admin **Live Tracking** page par ek saath saare active deliveries dekh sakta hai.

**Important:** Yeh ek **simulated** tracking hai (time ke hisaab se calculate hoti hai) — asli GPS wala delivery boy app nahi hai, kyunki uske liye real delivery riders ke phone me GPS-sharing app chahiye hoga. Agar aapko real riders ka live GPS chahiye, batayein — uske liye alag rider app banani padegi jo apni location backend ko bhejti rahe.


---

## ✅ Kaise Test Karein (Full Flow)
1. `index.html` par jaakar "What are you craving?" me kisi category (jaise **Pizza**) par click karein → item cart me add ho jayega.
2. Cart icon 🛒 par click karke `checkout.html` par jaayein.
3. Apna Name, Phone, Address bharein → **"Place Order"** button dabayein.
4. Ab `dashboard.html` kholein — aapka naya order **"All Orders"** me dikhega, saath hi 3 sample orders already dale hue hain (jaise screenshot me the).
5. Dashboard me kisi order ke "Update Status" me se koi bhi status (Preparing / Out for Delivery / Delivered) click karein — status turant update ho jaayega.
6. "Delete Order" ya "Clear All Orders" button se orders remove kar sakte hain.

Sab kuch **real backend** se connect hai — data `backend/db.json` file me save hota hai, browser band karne ke baad bhi data safe rehta hai.

---

## 🆕 Ab Sab Kuch Admin Se Control Hota Hai

- **📍 Location** — Settings page se address badlein, poori website (header, home page) me turant update ho jayegi.
- **📧 Contact Info** — Settings page se apna email aur support hours (jaise "24x7 Support") set karein, home page ke Contact section me dikhega.
- **🔥 Home Page Offer Banner** — Settings page se hero section ka "Up to 50% OFF" wala text change karein.
- **🏬 Restaurant Discounts (jaise "20% OFF", "FREE DELIVERY")** — Admin → Restaurants page se har restaurant ka apna badge/offer text set karein, home page turant update hoga.
- **➕ Restaurant Add/Edit/Delete** — Admin → Restaurants page se naye restaurants add karein, purane edit/delete karein.
- **📊 Kis Restaurant Se Kitna Order Hua** — Jab customer kisi restaurant ke menu page se order karta hai (restaurant.html), woh order us restaurant ke against track hota hai. Admin → Restaurants page ke neeche "Restaurant-wise Sales Report" me total orders, items sold, aur revenue dikhta hai. (Home page ki categories se seedha order karne par "Direct Order" ke naam se track hota hai, kyunki wahan koi restaurant select nahi hota.)

## 🔄 Website Ko Aage Khud Update Karna
Yeh poori website plain HTML/CSS/JavaScript (frontend) aur Node.js (backend) me bani hai — koi complex build-tool nahi. Kabhi bhi kisi bhi file ko:
1. `frontend/` folder ki `.html`, `.css`, `.js` files kisi bhi text editor (Notepad, VS Code) se edit kar sakte hain.
2. `backend/server.js` me naye API routes add kar sakte hain.
3. Change karne ke baad bas server restart karein (`Ctrl+C` phir `npm start`) aur browser refresh karein — turant dikh jayega.

Agar kabhi confuse ho ya naya feature chahiye ho, mujhe bata dijiye — step by step bana denge.

## 🎨 Appearance Panel — Apni Photos Upload Karna

Ab website me sirf free stock photos (LoremFlickr/Unsplash) hi nahi, balki **admin apni khud ki photos bhi seedha upload kar sakta hai** — koi code edit karne ki zaroorat nahi.

**Admin → Appearance** (`admin/appearance.html`) me jaake:
- **Hero Image** — home page ke top-right wali badi image
- **Promo Banner** — home page ke bottom "Hungry?" section ka background
- **Restaurant Photos** — har restaurant ki card + detail page banner
- **Menu Item Photos** — har dish ki photo (na ho to emoji icon fallback ho jaata hai)
- **Offer Images** — offers page par har coupon ke saath chhoti image (optional)

Kaise kaam karta hai:
1. Kisi bhi item ke "🖼️ Change Image" button par click karein — ek **file manager popup** khulega.
2. Naya photo upload karne ke liye upar drag-drop karein ya click karke computer se choose karein (max 5MB, jpg/png/webp/gif/svg).
3. Upload hote hi wo photo turant us item par lag jaati hai — aur saath hi **library** me bhi save ho jaati hai, taaki agli baar dobara upload kiye bina wahi photo kisi aur item (jaise 2 alag menu items) me bhi reuse kar sakein.
4. Library me se koi purani photo hataani ho to uske upar 🗑️ icon se delete kar sakte hain.

Photos `backend/uploads/` folder me save hoti hain aur `backend/db.json` ki `uploads` list me track hoti hain — server restart hone par bhi safe rehti hain (agar aap `backend` folder ko hi move/deploy karte hain).

**Fallback:** Agar kisi item ki photo upload nahi ki gayi hai, to purani wali free LoremFlickr/Unsplash photo hi dikhti rahegi — website kabhi bhi "broken image" nahi dikhayegi.

Agar direct code se bhi image URL set karna ho (bina panel use kiye), to `frontend/js/images.js` me `SPECIFIC_UNSPLASH`/`FOOD_IMAGE_KEYWORDS` objects abhi bhi wahi kaam karte hain — wo sirf tab use hote hain jab upload wali photo maujood na ho.

## 💳 Real Payment (UPI / Card) — Razorpay Setup

Ab website me **real Razorpay payment gateway** connected hai — customer UPI ya Credit/Debit Card se pay kar sakta hai.

**Kaise kaam karta hai:**
1. Checkout par customer "UPI" ya "Credit/Debit Card" select karta hai aur "Place Order" dabata hai.
2. Razorpay ka secure payment popup khulta hai (abhi **Test Mode** me hai).
3. Payment successful hone ke baad, backend signature verify karta hai (security ke liye — koi fake payment na bhej sake).
4. Verify hone ke baad order confirm hota hai aur "Paid" status ke saath admin dashboard me dikhta hai.

**⚠️ Abhi Test Mode me hai:**
- Keys `backend/razorpay-config.js` file me hain — yeh **Test Keys** hain, koi real paisa nahi katega.
- Test payment karne ke liye Razorpay ka test card use karein: Card number `4111 1111 1111 1111`, koi bhi future expiry date, koi bhi CVV.
- Test UPI ke liye: `success@razorpay` UPI ID use karein.

**Real (Live) payment lene ke liye:**
1. Razorpay Dashboard (razorpay.com) par jaakar KYC complete karein (PAN, bank account details).
2. KYC approve hone ke baad Dashboard me "Live Mode" activate hoga, wahan se **Live Key ID aur Live Key Secret** milegi.
3. `backend/razorpay-config.js` file me Test Keys ko Live Keys se replace kar dein.
4. Bas — ab real UPI/Card payments accept hone lagenge. Razorpay har transaction par ~2% fee leta hai jo automatically kat jaati hai.

**🔒 Security note:** `razorpay-config.js` file me Key Secret hai — is file ko kabhi bhi public GitHub repo me push na karein (`.gitignore` me already add kar diya hai).

## 📧 Restaurant Order Notification (Email)

Jab bhi koi customer order place karta hai, us restaurant ko turant **email notification** ja sakta hai jiska item order hua hai — taaki wo khana taiyar karna shuru kar de.

**Setup karne ke liye:**
1. **Admin Dashboard → Restaurants** page par jaakar har restaurant ka **Contact Email** field bharein (Edit button se).
2. Backend server ke environment variables me apni SMTP details daalein:
   - `SMTP_HOST` (Gmail ke liye: `smtp.gmail.com`)
   - `SMTP_PORT` (Gmail ke liye: `587`)
   - `SMTP_USER` (aapka bhejne wala email address)
   - `SMTP_PASS` (Gmail App Password — **normal Gmail password nahi chalega**)
   - Local testing ke liye `backend/.env` file bana sakte hain (dotenv install karke) ya seedhe terminal me set kar sakte hain. Render par ye **Environment** tab me daalein.
3. **Gmail App Password kaise banayein:** Google Account → Security → 2-Step Verification ON karein → "App Passwords" search karein → "Mail" ke liye naya 16-digit password generate karein → wahi `SMTP_PASS` me daalein.

Agar ye environment variables set nahi hain, to email silently skip ho jaata hai — order phir bhi normal create hota hai, koi crash nahi hota. Admin Restaurants page par bhi dikhega agar kisi restaurant ka contact email missing hai (⚠️ warning ke saath).

**📞 Phone/SMS/WhatsApp notification ke baare me (honesty ke saath):** Contact Phone field abhi sirf record/reference ke liye hai — asli automatic SMS ya WhatsApp message bhejne ke liye Twilio, Fast2SMS, ya Gupshup jaisi paid service ka account aur API key chahiye hota hai, jo hum abhi is project me include nahi kar sakte kyunki uske liye aapka apna account/API key zaroori hai. Filhal email hi automatic notification ka tareeka hai. Baad me agar aap koi SMS API le lete hain, to `backend/notify.js` file me ek chhota sa addition karke SMS bhi enable kiya ja sakta hai.

## 🗄️ Permanent Free Database — MongoDB Atlas

Pehle data `db.json` file me store hota tha, jo free hosting (Render Free) par restart/redeploy hone par **reset ho sakta tha**. Ab data **MongoDB Atlas** (free-forever database, 512 MB, koi expiry nahi, koi card nahi chahiye) me save hota hai — permanently.

**Setup (ek baar karna hai):**
1. cloud.mongodb.com par free account banayein
2. "Build a Database" → **M0 (Free)** select karein → Create
3. Database User banayein (username + password) — password yaad rakhein
4. Network Access me "Allow access from anywhere" (`0.0.0.0/0`) add karein
5. "Connect" → "Drivers" se apna **Connection String** copy karein (jaisa `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/`)
6. Render (ya jahan bhi deploy karein) ke **Environment** tab me naya variable add karein:
   - `MONGODB_URI` = wahi connection string (password sahi jagah bharke)

Server start hote hi purana `db.json` ka data automatically ek baar MongoDB me copy ho jayega (seed), uske baad sab kuch wahi se permanently save/load hoga.

**Agar `MONGODB_URI` set nahi karte:** Koi dikkat nahi — server apne aap purane `db.json` file wale tareeke par chal jayega, bas free hosting par data permanent nahi rahega (jaisa pehle tha).



## 🔒 Security Fixes (Important — Live Karne Se Pehle Padhein)

Code review ke dauraan 3 zaroori security gaps mile aur fix kar diye gaye:

1. **Price Tampering:** Pehle order ka total price browser (client) se aata tha — koi bhi devtools se price badal sakta tha. Ab server khud DB se asli price nikal kar total banata hai, client ka price ignore hota hai.
2. **Unprotected Admin APIs:** Admin panel ka login sirf page dikhne/na-dikhne ko control karta tha, lekin uske peeche ki APIs (restaurant/menu/offers add-edit-delete, order status/delete, settings) bina login ke bhi seedhe call ki ja sakti thi. Ab har admin-only API par login-check middleware hai.
3. **Stored XSS (Admin Dashboard):** Customer order karte waqt apne "Naam"/"Address" field me malicious script daal sakta tha, jo Admin Dashboard, Customers page, aur Live Tracking page khulte hi chal jaata — isse admin ka login token churaya ja sakta tha. Ab saara customer data admin panel me dikhane se pehle safely escape hota hai.

Agar aap khud bhi code me kabhi customer-submitted data (naam, address, review, comment wagera) kahin display karein, to hamesha `escapeHtml()` (frontend/js/admin-guard.js me defined) se guzaar kar hi `innerHTML` me daalein.

## 🔐 Admin Security (Bank-jaisi Authentication)

Admin login ab kaafi zyada secure hai:

- **🔒 Password Hashing** — Password kabhi bhi plain text me store nahi hoti, `bcrypt` se hash hoke save hoti hai (jaise banks karte hain). Purani plain-text password automatically ek baar hash ho jayegi jab server pehli baar start hoga.
- **🚫 Login Lockout** — 5 galat password attempts ke baad, login **15 minute ke liye lock** ho jaata hai. Isse koi bhi password guess karke bar-bar try nahi kar sakta.
- **⏳ Session Expiry** — Login session sirf **12 ghante** ke liye valid rehta hai, uske baad automatically dobara login karna padega.
- **🛡️ Forgot Password (Security Question)** — Login page par "Password bhool gaye?" link se, ek security sawaal ka sahi jawaab dekar naya password set kar sakte hain.

**Security Question set karna zaroori hai** (pehli baar): Admin login karke **Settings → Forgot Password Recovery** panel me jaakar apna sawaal-jawaab set kar lein, warna "Password bhool gaye?" feature kaam nahi karega.

**Ismein kya nahi hai (honesty ke saath):** Yeh real bank jaisa 100% secure nahi hai — real banks OTP-via-SMS, hardware tokens, IP-based fraud detection, aur dedicated security teams use karte hain. Yeh ek single-admin demo website ke liye "kaafi mazboot" security hai, lekin agar yeh production me real paise/data ke saath use ho, to aur professional security audit karwana sahi rahega.

## 🛠️ Aage Kya Add Kar Sakte Hain
- Real SMS gateway (Twilio/MSG91) — abhi OTP demo mode me response me hi dikh jaata hai
- Real payment gateway (Razorpay/Stripe) — abhi sirf "Cash on Delivery" hai
- Multiple restaurants ka alag-alag menu
- SQLite/MongoDB database (abhi simple JSON file use ho raha hai)

Koi bhi feature add karwana ho to bata dijiye, step-by-step bana denge! 🙌
