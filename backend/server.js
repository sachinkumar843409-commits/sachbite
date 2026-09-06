const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const bcrypt = require("bcryptjs");
// razorpay-config.js .gitignore me hai (security ke liye), isliye Render (ya kisi bhi
// fresh clone) par ye file exist nahi karti. Agar file mile to usse use karo (local dev),
// warna seedha environment variables se keys utha lo (production/Render ke liye).
let razorpayKeys;
try {
  razorpayKeys = require("./razorpay-config");
} catch (e) {
  razorpayKeys = {
    KEY_ID: process.env.RAZORPAY_KEY_ID,
    KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  };
}
const { sendRestaurantOrderNotifications } = require("./notify");
const { initStore, readDB, writeDB } = require("./mongo-store");

// ---------- CUSTOMER SMS NOTIFICATIONS (SMS Gateway for Android) ----------
// Apne hi Android phone ko SMS-gateway banate hain (sms-gate.app app se) — bilkul
// free, koi per-message charge nahi, SMS aapke phone ke SIM se hi jaata hai.
// Render me SMS_GATEWAY_USERNAME aur SMS_GATEWAY_PASSWORD environment variables
// set karna zaroori hai (app me "Cloud Server" mode se milte hain).
async function sendCustomerSms(phoneNumber, message) {
  const username = process.env.SMS_GATEWAY_USERNAME;
  const password = process.env.SMS_GATEWAY_PASSWORD;

  if (!username || !password) {
    console.warn("⚠️ SMS_GATEWAY_USERNAME/PASSWORD set nahi hai — SMS nahi bheja gaya.");
    return;
  }
  if (!phoneNumber) {
    console.warn("⚠️ Customer ka phone number nahi mila — SMS nahi bheja gaya.");
    return;
  }

  // Number ko +91 format me convert karo (agar already country code nahi hai)
  let formattedPhone = phoneNumber.toString().replace(/\D/g, "");
  if (formattedPhone.length === 10) formattedPhone = "91" + formattedPhone;
  formattedPhone = "+" + formattedPhone;

  try {
    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    const response = await fetch("https://api.sms-gate.app/3rdparty/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        textMessage: { text: message },
        phoneNumbers: [formattedPhone],
      }),
    });
    if (!response.ok) {
      console.error("SMS bhejne me error:", response.status, await response.text());
    }
  } catch (err) {
    console.error("SMS bhejne me error:", err.message);
  }
}

if (!razorpayKeys.KEY_ID || !razorpayKeys.KEY_SECRET) {
  console.warn(
    "⚠️  Razorpay keys nahi mili! RAZORPAY_KEY_ID aur RAZORPAY_KEY_SECRET environment variables set karein (Render > Environment tab), warna payment kaam nahi karega."
  );
} else {
  // DIAGNOSTIC: values ka sirf pehla/aakhri hissa dikhate hain (poora secret kabhi nahi),
  // taaki Render ke Environment tab me galti se aayi extra space/quote pakdi ja sake.
  const mask = (s) => (s.length > 8 ? `${s.slice(0, 4)}...${s.slice(-4)} (length: ${s.length})` : `(length: ${s.length})`);
  console.log("🔍 RAZORPAY_KEY_ID diagnostic:", mask(razorpayKeys.KEY_ID));
  console.log("🔍 RAZORPAY_KEY_SECRET diagnostic:", mask(razorpayKeys.KEY_SECRET));
}

const razorpay = new Razorpay({
  key_id: razorpayKeys.KEY_ID || "rzp_test_placeholder",
  key_secret: razorpayKeys.KEY_SECRET || "placeholder_secret",
});

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "db.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");

// Uploads folder na ho to bana do
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
// Default JSON body limit sirf 100KB hoti hai — lekin humare images ab base64 format
// me JSON ke through bhejte hain (hero banner, menu item photos), jo isse kahin zyada
// bade hote hain. Isliye limit badhakar 8mb kar di, taaki image upload/apply crash na ho.
app.use(express.json({ limit: "8mb" }));

// Admin-only routes ko protect karne wala middleware — token na ho ya galat/expired ho
// to request yahin reject ho jaati hai. Isse koi bhi bina admin login kiye seedha API
// call karke (Postman/curl se) data add/edit/delete nahi kar sakta.
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const now = Date.now();

  if (
    token &&
    currentAdminSession &&
    token === currentAdminSession.token &&
    now - currentAdminSession.issuedAt < SESSION_DURATION_MS
  ) {
    return next();
  }
  return res.status(401).json({ error: "Admin login zaroori hai." });
}

// Serve the frontend (index.html, dashboard.html, css, js)
app.use(express.static(path.join(__dirname, "..", "frontend")));

// Uploaded images publicly accessible: http://localhost:3000/uploads/xxx.jpg
app.use("/uploads", express.static(UPLOADS_DIR));

// ---------- Image upload (multer) ----------
// IMPORTANT: memoryStorage use karte hain, disk par nahi — kyunki Render free tier
// ka disk temporary hai (service "so jaane" ke baad restart hote hi saari uploaded
// files gayab ho jaati hain, jisse hero banner/menu images "crash"/broken dikhti thi).
// Ab image ko seedha base64 format me MongoDB me save karte hain, jo permanent hai.
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max (base64 me MongoDB me store hoga, size chhota rakhein)
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error("Sirf image files allowed hain (jpg, png, webp, gif, svg)"));
    }
    cb(null, true);
  },
});

// ---------- Helpers ----------
// readDB() / writeDB() ab mongo-store.js se aa rahe hain — MongoDB Atlas me permanently
// save karte hain (agar MONGODB_URI set hai), warna purane db.json file wale tareeke
// par fallback ho jaate hain. Baaki neeche ka poora code bina kisi change ke chalta hai.

function generateOrderId() {
  const num = Math.floor(10000000 + Math.random() * 89999999);
  return "SB" + num;
}

// Security: client se aaye cart items ka price kabhi trust nahi karna — koi bhi browser
// devtools se price badal sakta hai. Yahan har item ka asli price DB ke `menu` collection
// se match karke nikalte hain, taaki koi "₹5000 ka order ₹1 me" na kar sake.
function getTrustedItems(clientItems, menu) {
  const trustedItems = [];
  for (const ci of clientItems || []) {
    const menuItem = menu.find((m) => m.name === ci.name);
    if (!menuItem) {
      return { error: `Item "${ci.name}" menu me nahi mila — order invalid hai.` };
    }
    const qty = Number(ci.qty);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 50) {
      return { error: `"${ci.name}" ki quantity valid nahi hai.` };
    }
    trustedItems.push({
      name: menuItem.name,
      price: menuItem.price, // DB se — client wala price ignore
      qty,
      restaurant: ci.restaurant || null,
    });
  }
  if (trustedItems.length === 0) {
    return { error: "Cart me koi valid item nahi hai." };
  }
  return { items: trustedItems, total: trustedItems.reduce((sum, i) => sum + i.price * i.qty, 0) };
}

function generateId(prefix) {
  const num = Math.floor(100 + Math.random() * 899);
  return prefix + num;
}

// ---------- MEDIA LIBRARY / FILE MANAGER (Appearance panel) ----------

// Upload a new image. Field name must be "image".
// Image ko base64 format me MongoDB ke uploads[] library me save karte hain — isse
// Render restart/sleep hone par bhi image kabhi delete/crash nahi hoti (permanent hai).
app.post("/api/upload", requireAdmin, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Koi image file nahi mili" });

    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    const ext = path.extname(req.file.originalname || "").toLowerCase() || ".jpg";
    const filename = crypto.randomBytes(8).toString("hex") + "-" + Date.now() + ext;

    const db = readDB();
    const fileRecord = {
      filename,
      originalName: req.file.originalname,
      url: dataUrl,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    };
    db.uploads = db.uploads || [];
    db.uploads.unshift(fileRecord);
    writeDB(db);

    res.status(201).json(fileRecord);
  });
});

// List every image in the media library (newest first) — powers the file manager grid
app.get("/api/uploads", (req, res) => {
  const db = readDB();
  res.json(db.uploads || []);
});

// Delete an image from the library (MongoDB me save hai, disk par kuch nahi hai ab)
app.delete("/api/uploads/:filename", requireAdmin, (req, res) => {
  const db = readDB();
  db.uploads = db.uploads || [];
  const exists = db.uploads.some((u) => u.filename === req.params.filename);
  if (!exists) return res.status(404).json({ error: "File library me nahi mili" });

  db.uploads = db.uploads.filter((u) => u.filename !== req.params.filename);
  writeDB(db);
  res.json({ success: true });
});

// ---------- MENU (public - home page) ----------
app.get("/api/menu", (req, res) => {
  const db = readDB();
  res.json(db.menu);
});

// ---------- MENU MANAGEMENT (admin) ----------
app.post("/api/menu", requireAdmin, (req, res) => {
  const db = readDB();
  const { name, price, icon, category, image } = req.body;
  if (!name || !price) return res.status(400).json({ error: "Name and price are required" });

  const newItem = {
    id: generateId("M"),
    name,
    price: Number(price),
    icon: icon || "🍽️",
    category: category || "Other",
    available: true,
    image: image || null,
  };
  db.menu.push(newItem);
  writeDB(db);
  res.status(201).json(newItem);
});

app.put("/api/menu/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const item = db.menu.find((m) => m.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  const { name, price, icon, category, available, image } = req.body;
  if (name !== undefined) item.name = name;
  if (price !== undefined) item.price = Number(price);
  if (icon !== undefined) item.icon = icon;
  if (category !== undefined) item.category = category;
  if (available !== undefined) item.available = available;
  if (image !== undefined) item.image = image;

  writeDB(db);
  res.json(item);
});

app.delete("/api/menu/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const exists = db.menu.some((m) => m.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Item not found" });

  db.menu = db.menu.filter((m) => m.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// ---------- RESTAURANTS ----------
app.get("/api/restaurants", (req, res) => {
  const db = readDB();
  res.json(db.restaurants);
});

// Add a new restaurant (Admin > Restaurants)
app.post("/api/restaurants", requireAdmin, (req, res) => {
  const db = readDB();
  const { name, tags, rating, reviews, time, badge, icon, image, contactPhone, contactEmail } = req.body;
  if (!name) return res.status(400).json({ error: "Restaurant ka naam zaroori hai" });

  const newRestaurant = {
    id: generateId("R"),
    name,
    tags: tags || "",
    rating: rating ? Number(rating) : 4.5,
    reviews: reviews || "New",
    time: time || "25-35 min",
    badge: badge || "",
    icon: icon || "🍽️",
    image: image || null,
    contactPhone: contactPhone || "",
    contactEmail: contactEmail || "",
  };
  db.restaurants.push(newRestaurant);
  writeDB(db);
  res.status(201).json(newRestaurant);
});

// Update a restaurant (name/tags/badge/rating, or Appearance panel photo)
app.put("/api/restaurants/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const restaurant = db.restaurants.find((r) => r.id === req.params.id);
  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

  const { name, tags, rating, reviews, time, badge, icon, image, contactPhone, contactEmail } = req.body;
  if (name !== undefined) restaurant.name = name;
  if (tags !== undefined) restaurant.tags = tags;
  if (rating !== undefined) restaurant.rating = Number(rating);
  if (reviews !== undefined) restaurant.reviews = reviews;
  if (time !== undefined) restaurant.time = time;
  if (badge !== undefined) restaurant.badge = badge;
  if (icon !== undefined) restaurant.icon = icon;
  if (image !== undefined) restaurant.image = image;
  if (contactPhone !== undefined) restaurant.contactPhone = contactPhone;
  if (contactEmail !== undefined) restaurant.contactEmail = contactEmail;

  writeDB(db);
  res.json(restaurant);
});

// Delete a restaurant
app.delete("/api/restaurants/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const exists = db.restaurants.some((r) => r.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Restaurant not found" });

  db.restaurants = db.restaurants.filter((r) => r.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// Kis restaurant se kitna order hua — item-level restaurant tag ke basis par
app.get("/api/restaurants/sales-report", (req, res) => {
  const db = readDB();
  const report = {}; // restaurantName -> { orders: Set, qty, revenue }

  db.orders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.restaurant || "Direct Order (bina restaurant chune)";
      if (!report[key]) report[key] = { restaurant: key, orderIds: new Set(), qty: 0, revenue: 0 };
      report[key].orderIds.add(order.id);
      report[key].qty += item.qty;
      report[key].revenue += item.qty * item.price;
    });
  });

  const result = Object.values(report)
    .map((r) => ({
      restaurant: r.restaurant,
      totalOrders: r.orderIds.size,
      totalItemsSold: r.qty,
      totalRevenue: r.revenue,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  res.json(result);
});

// Kis payment method se kitna order hua (UPI / Card / Cash on Delivery)
app.get("/api/analytics/payment-methods", (req, res) => {
  const db = readDB();
  const report = {};

  db.orders.forEach((order) => {
    const method = order.customer.payment || "Unknown";
    if (!report[method]) report[method] = { method, count: 0, revenue: 0 };
    report[method].count += 1;
    report[method].revenue += order.grandTotal;
  });

  const result = Object.values(report).sort((a, b) => b.revenue - a.revenue);
  res.json(result);
});

// ---------- RAZORPAY PAYMENTS (UPI / Credit / Debit Card) ----------

// Step 1: Frontend cart total ke liye ek Razorpay "order" banao
app.post("/api/payment/create-order", async (req, res) => {
  try {
    const db = readDB();
    const { items } = req.body;

    const trusted = getTrustedItems(items, db.menu);
    if (trusted.error) {
      return res.status(400).json({ error: trusted.error });
    }
    const amount = trusted.total;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount zaroori hai" });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay paise me leta hai
      currency: "INR",
      receipt: "sachbite_" + Date.now(),
    });

    res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: razorpayKeys.KEY_ID, // Yeh public/safe hai, frontend me use hoti hai
    });
  } catch (err) {
    console.error("Razorpay order create error:", err);
    res.status(500).json({ error: "Payment order nahi ban paya. Razorpay keys check karein." });
  }
});

// Step 2: Payment complete hone ke baad signature verify karo (fraud/tampering se bachne ke liye)
app.post("/api/payment/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ verified: false, error: "Payment details incomplete hain" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", razorpayKeys.KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const verified = expectedSignature === razorpay_signature;
  res.json({ verified });
});

// ---------- ORDERS ----------

// Get all orders (newest first)
app.get("/api/orders", (req, res) => {
  const db = readDB();
  const sorted = [...db.orders].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  res.json(sorted);
});

// Get order stats (Total Orders, Total Sales)
app.get("/api/orders/stats", (req, res) => {
  const db = readDB();
  const totalOrders = db.orders.length;
  const totalSales = db.orders.reduce((sum, o) => sum + o.grandTotal, 0);
  res.json({ totalOrders, totalSales });
});

// Place a new order (from checkout page)
app.post("/api/orders", (req, res) => {
  const db = readDB();
  const { customer, items, location, paymentReference, upiReference } = req.body;

  if (!customer || !items || items.length === 0) {
    return res.status(400).json({ error: "Customer details and items are required" });
  }

  // Security: client ke bheje hue prices trust nahi karte — DB menu se sahi price nikalte hain
  const trusted = getTrustedItems(items, db.menu);
  if (trusted.error) {
    return res.status(400).json({ error: trusted.error });
  }

  const itemTotal = trusted.total;
  const delivery = 0; // FREE delivery, matches design

  let paymentStatus = "Pending";
  if (paymentReference) paymentStatus = "Paid";
  else if (customer.payment === "Cash on Delivery") paymentStatus = "Pending (COD)";
  // UTR ab customer se nahi mangte — payment SMS webhook automatically match karke
  // verify kar dega. Jab tak match na ho, order "Awaiting Verification" me rehta hai
  // aur admin dashboard se bhi manually verify kiya ja sakta hai (backup ke roop me).
  else if (customer.payment === "UPI (Direct)") paymentStatus = "Awaiting Verification (Direct UPI)";

  const newOrder = {
    id: generateOrderId(),
    date: new Date().toISOString(),
    customer,
    items: trusted.items,
    itemTotal,
    delivery,
    grandTotal: itemTotal + delivery,
    status: "Order Confirmed",
    location: location && location.lat && location.lng ? location : null,
    estimatedDeliveryMinutes: 25,
    outForDeliveryAt: null,
    paymentStatus,
    paymentReference: paymentReference || null,
    upiReference: upiReference || null,
  };

  db.orders.push(newOrder);
  writeDB(db);
  res.status(201).json(newOrder);

  // Restaurant(s) ko email notification bhejo (background me — customer ko response
  // wait nahi karana, email fail bhi ho jaye to order par koi asar nahi padega)
  sendRestaurantOrderNotifications(newOrder, db.restaurants).catch((err) =>
    console.error("Restaurant notification error:", err.message)
  );
});

// Admin: Direct UPI payment ko manually "Verified" mark karna (bank/UPI app me
// paisa check karne ke baad) — verify hote hi customer ko SMS chala jata hai
app.patch("/api/orders/:id/payment-status", requireAdmin, async (req, res) => {
  const db = readDB();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.paymentStatus = "Paid (Verified)";
  writeDB(db);

  sendCustomerSms(
    order.customer.phone,
    `SachBite: Aapka payment verify ho gaya hai! Order #${order.id} confirm ho gaya hai. Dhanyawad!`
  );

  res.json(order);
});

// Admin: UTR galat/na milne par order reject karna — customer ko SMS chala jata hai
// taaki wo sahi UTR dobara bhej sake
app.patch("/api/orders/:id/reject-payment", requireAdmin, async (req, res) => {
  const db = readDB();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.paymentStatus = "Payment Rejected (UTR Not Matched)";
  writeDB(db);

  sendCustomerSms(
    order.customer.phone,
    `SachBite: Order #${order.id} ka UTR match nahi hua. Kripya sahi UTR number dobara bhejein ya humse contact karein.`
  );

  res.json(order);
});


// Update order status
app.patch("/api/orders/:id/status", requireAdmin, (req, res) => {
  const db = readDB();
  const { status } = req.body;
  const validStatuses = ["Order Confirmed", "Preparing", "Out for Delivery", "Delivered"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.status = status;
  if (status === "Out for Delivery" && !order.outForDeliveryAt) {
    order.outForDeliveryAt = new Date().toISOString();
  }
  writeDB(db);
  res.json(order);
});

// ---------- LIVE DELIVERY TRACKING (simulated) ----------
function toRad(deg) {
  return (deg * Math.PI) / 180;
}
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeDeliveryProgress(order, restaurantLocation) {
  if (!order.location || order.status !== "Out for Delivery" || !order.outForDeliveryAt) {
    return null;
  }
  const totalMinutes = order.estimatedDeliveryMinutes || 25;
  const elapsedMinutes = (Date.now() - new Date(order.outForDeliveryAt).getTime()) / 60000;
  const progress = Math.min(Math.max(elapsedMinutes / totalMinutes, 0), 1);

  const start = restaurantLocation;
  const end = order.location;
  const currentLat = start.lat + (end.lat - start.lat) * progress;
  const currentLng = start.lng + (end.lng - start.lng) * progress;

  const remainingKm = distanceKm(currentLat, currentLng, end.lat, end.lng);
  const etaMinutes = Math.max(Math.round(totalMinutes * (1 - progress)), progress >= 1 ? 0 : 1);

  return {
    progressPercent: Math.round(progress * 100),
    currentLat,
    currentLng,
    distanceRemainingKm: Math.round(remainingKm * 10) / 10,
    etaMinutes,
    arrived: progress >= 1,
  };
}

// Progress for a single order (used by customer Track Order page)
app.get("/api/orders/:id/delivery-progress", (req, res) => {
  const db = readDB();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  const progress = computeDeliveryProgress(order, db.settings.restaurantLocation);
  res.json({
    restaurantLocation: db.settings.restaurantLocation,
    customerLocation: order.location,
    status: order.status,
    progress,
  });
});

// All active "Out for Delivery" orders with live position (used by Admin Live Tracking page)
app.get("/api/deliveries/live", (req, res) => {
  const db = readDB();
  const active = db.orders
    .filter((o) => o.status === "Out for Delivery")
    .map((o) => ({
      id: o.id,
      customerName: o.customer.name,
      customerAddress: o.customer.address,
      location: o.location,
      progress: computeDeliveryProgress(o, db.settings.restaurantLocation),
    }))
    .filter((o) => o.location); // sirf woh jinke paas location data hai

  res.json({
    restaurantLocation: db.settings.restaurantLocation,
    deliveries: active,
  });
});

// Delete a single order
app.delete("/api/orders/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const exists = db.orders.some((o) => o.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Order not found" });

  db.orders = db.orders.filter((o) => o.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// Clear all orders
app.delete("/api/orders", requireAdmin, (req, res) => {
  const db = readDB();
  db.orders = [];
  writeDB(db);
  res.json({ success: true });
});

// ---------- CUSTOMERS (derived from orders) ----------
app.get("/api/customers", (req, res) => {
  const db = readDB();
  const map = {};

  db.orders.forEach((order) => {
    const phone = order.customer.phone;
    if (!map[phone]) {
      map[phone] = {
        name: order.customer.name,
        phone: order.customer.phone,
        address: order.customer.address,
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: order.date,
      };
    }
    map[phone].totalOrders += 1;
    map[phone].totalSpent += order.grandTotal;
    if (new Date(order.date) > new Date(map[phone].lastOrderDate)) {
      map[phone].lastOrderDate = order.date;
      map[phone].name = order.customer.name;
      map[phone].address = order.customer.address;
    }
  });

  const customers = Object.values(map).sort(
    (a, b) => new Date(b.lastOrderDate) - new Date(a.lastOrderDate)
  );
  res.json(customers);
});

// Order history for a specific customer (by phone)
app.get("/api/customers/:phone/orders", (req, res) => {
  const db = readDB();
  const orders = db.orders
    .filter((o) => o.customer.phone === req.params.phone)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(orders);
});

// ---------- OFFERS ----------
app.get("/api/offers", (req, res) => {
  const db = readDB();
  res.json(db.offers);
});

app.post("/api/offers", requireAdmin, (req, res) => {
  const db = readDB();
  const { title, discount, validFrom, validUntil, image } = req.body;
  if (!title || !discount || !validUntil) {
    return res.status(400).json({ error: "Title, discount aur validUntil zaroori hain" });
  }
  const newOffer = {
    id: generateId("OFF"),
    title,
    discount,
    validFrom: validFrom || new Date().toISOString().slice(0, 10),
    validUntil,
    image: image || null,
  };
  db.offers.push(newOffer);
  writeDB(db);
  res.status(201).json(newOffer);
});

app.put("/api/offers/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const offer = db.offers.find((o) => o.id === req.params.id);
  if (!offer) return res.status(404).json({ error: "Offer not found" });

  const { title, discount, validFrom, validUntil, image } = req.body;
  if (title !== undefined) offer.title = title;
  if (discount !== undefined) offer.discount = discount;
  if (validFrom !== undefined) offer.validFrom = validFrom;
  if (validUntil !== undefined) offer.validUntil = validUntil;
  if (image !== undefined) offer.image = image;

  writeDB(db);
  res.json(offer);
});

app.delete("/api/offers/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const exists = db.offers.some((o) => o.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Offer not found" });

  db.offers = db.offers.filter((o) => o.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// ---------- SETTINGS ----------
app.get("/api/settings", (req, res) => {
  const db = readDB();
  const { adminPassword, adminPasswordHash, adminSecurityAnswerHash, ...safeSettings } = db.settings;
  res.json(safeSettings);
});

app.put("/api/settings", requireAdmin, (req, res) => {
  const db = readDB();
  const allowedFields = [
    "restaurantName",
    "address",
    "openTime",
    "closeTime",
    "deliveryRadiusKm",
    "adminName",
    "heroImage",
    "bannerImage",
    "heroAnimation",
    "heroFoodAnimation",
    "heroFoodEmojis",
    "contactEmail",
    "contactPhone",
    "contactAddress",
    "supportHours",
    "heroOfferTag",
    "heroOfferTitle",
    "heroOfferSubtitle",
    "aboutText",
    "businessUpiId",
    "businessUpiName",
  ];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) db.settings[field] = req.body[field];
  });

  // Password change (optional, requires current password match)
  if (req.body.newPassword) {
    if (!req.body.currentPassword || !bcrypt.compareSync(req.body.currentPassword, db.settings.adminPasswordHash)) {
      return res.status(400).json({ error: "Current password galat hai" });
    }
    if (req.body.newPassword.length < 6) {
      return res.status(400).json({ error: "Naya password kam se kam 6 characters ka hona chahiye" });
    }
    db.settings.adminPasswordHash = bcrypt.hashSync(req.body.newPassword, 10);
  }

  writeDB(db);
  const { adminPassword, adminPasswordHash, adminSecurityAnswerHash, ...safeSettings } = db.settings;
  res.json(safeSettings);
});

// ---------- ANALYTICS ----------
app.get("/api/analytics", (req, res) => {
  const db = readDB();
  const orders = db.orders;

  const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };

  const today = startOfDay(new Date());
  const yesterday = today - 24 * 60 * 60 * 1000;

  let todayOrders = 0, todaySales = 0, yesterdayOrders = 0, yesterdaySales = 0;
  const pendingOrders = orders.filter((o) => o.status !== "Delivered").length;

  // Last 7 days sales
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = today - i * 24 * 60 * 60 * 1000;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const dayLabel = new Date(dayStart).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const dayTotal = orders
      .filter((o) => {
        const t = new Date(o.date).getTime();
        return t >= dayStart && t < dayEnd;
      })
      .reduce((sum, o) => sum + o.grandTotal, 0);
    last7Days.push({ date: dayLabel, total: dayTotal });
  }

  orders.forEach((o) => {
    const t = new Date(o.date).getTime();
    if (t >= today) {
      todayOrders++;
      todaySales += o.grandTotal;
    } else if (t >= yesterday && t < today) {
      yesterdayOrders++;
      yesterdaySales += o.grandTotal;
    }
  });

  // Top selling items
  const itemMap = {};
  orders.forEach((o) => {
    o.items.forEach((i) => {
      if (!itemMap[i.name]) itemMap[i.name] = { name: i.name, qty: 0, revenue: 0 };
      itemMap[i.name].qty += i.qty;
      itemMap[i.name].revenue += i.qty * i.price;
    });
  });
  const topItems = Object.values(itemMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Peak order hours
  const hourMap = {};
  orders.forEach((o) => {
    const hour = new Date(o.date).getHours();
    const label = hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;
    hourMap[label] = (hourMap[label] || 0) + 1;
  });
  const peakHours = Object.entries(hourMap)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    todayOrders,
    todaySales,
    yesterdayOrders,
    yesterdaySales,
    pendingOrders,
    last7Days,
    topItems,
    peakHours,
  });
});

// ---------- CUSTOMER AUTHENTICATION (Signup/Login via OTP) ----------
// Note: Is project me koi real SMS gateway (Twilio/MSG91 etc.) connect nahi hai,
// isliye OTP generate hoke seedha response me bhi bhej diya jaata hai (demoOtp) taaki
// bina SMS ke bhi test kiya ja sake. Production me jaane se pehle yahan ek real SMS
// provider laga kar demoOtp field hata dena chahiye.
let otpStore = {}; // phone -> { otp, name, expiresAt }
let customerTokens = {}; // token -> phone

app.post("/api/auth/send-otp", async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "Name aur phone number dono zaroori hain" });
  if (!/^[0-9]{10}$/.test(phone)) return res.status(400).json({ error: "Sahi 10-digit phone number bharein" });

  const otp = String(Math.floor(1000 + Math.random() * 9000));
  otpStore[phone] = { otp, name, expiresAt: Date.now() + 5 * 60 * 1000 };

  // Naya customer hai ya pehle se account hai — frontend isse sahi popup message dikhayega
  const db = readDB();
  const isNewUser = !(db.accounts || []).some((a) => a.phone === phone);

  console.log(`[OTP] ${phone} ke liye OTP generate hua: ${otp}`);

  const smsConfigured = !!(process.env.SMS_GATEWAY_USERNAME && process.env.SMS_GATEWAY_PASSWORD);
  if (smsConfigured) {
    await sendCustomerSms(phone, `SachBite: Aapka OTP hai ${otp}. Yeh 5 minute me expire ho jayega. Kisi ke saath share na karein.`);
    res.json({ success: true, isNewUser });
  } else {
    // SMS gateway abhi setup nahi hai — testing ke liye OTP response me bhi bhej dete hain
    res.json({ success: true, isNewUser, demoOtp: otp });
  }
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  const record = otpStore[phone];

  if (!record) return res.status(400).json({ error: "Pehle OTP request karein" });
  if (Date.now() > record.expiresAt) {
    delete otpStore[phone];
    return res.status(400).json({ error: "OTP expire ho gaya, dobara bhejwayein" });
  }
  if (!otp || String(otp).trim() !== record.otp) {
    return res.status(401).json({ error: "Galat OTP, dobara check karein" });
  }

  delete otpStore[phone];

  const db = readDB();
  db.accounts = db.accounts || [];
  let account = db.accounts.find((a) => a.phone === phone);
  if (!account) {
    account = { id: generateId("U"), name: record.name, phone, createdAt: new Date().toISOString() };
    db.accounts.push(account);
    writeDB(db);
  }

  const token = crypto.randomBytes(20).toString("hex");
  customerTokens[token] = phone;

  res.json({ success: true, token, user: { name: account.name, phone: account.phone } });
});

app.post("/api/auth/logout", (req, res) => {
  const { token } = req.body;
  if (token) delete customerTokens[token];
  res.json({ success: true });
});

// ---------- ADMIN AUTHENTICATION (hardened) ----------
// - Password hamesha bcrypt se HASH hoke store hoti hai (kabhi plain text nahi)
// - 5 galat attempts ke baad 15 minute ke liye login lock ho jaata hai
// - Login session (token) 12 ghante baad automatically expire ho jaata hai
// - "Forgot Password" security question ke through reset ho sakta hai
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

let currentAdminSession = null; // { token, issuedAt }
let loginAttempts = { count: 0, lockUntil: 0 };

// Agar db.json me purani plain-text password hai to use ek baar hash kar do (migration)
function migratePlainPasswordIfNeeded() {
  const db = readDB();
  if (db.settings.adminPassword && !db.settings.adminPasswordHash) {
    db.settings.adminPasswordHash = bcrypt.hashSync(db.settings.adminPassword, 10);
    delete db.settings.adminPassword;
    writeDB(db);
    console.log("[Security] Admin password ab securely hashed karke store ki gayi hai.");
  }
}
migratePlainPasswordIfNeeded();

app.post("/api/admin/login", (req, res) => {
  const now = Date.now();

  if (loginAttempts.lockUntil > now) {
    const minsLeft = Math.ceil((loginAttempts.lockUntil - now) / 60000);
    return res.status(429).json({
      error: `Bahut zyada galat attempts ho gaye hain. ${minsLeft} minute baad dobara try karein.`,
    });
  }

  const db = readDB();
  const { password } = req.body;
  const hash = db.settings.adminPasswordHash;

  const isValid = password && hash && bcrypt.compareSync(password, hash);

  if (!isValid) {
    loginAttempts.count += 1;
    if (loginAttempts.count >= MAX_LOGIN_ATTEMPTS) {
      loginAttempts.lockUntil = now + LOCKOUT_DURATION_MS;
      loginAttempts.count = 0;
      return res.status(429).json({
        error: `${MAX_LOGIN_ATTEMPTS} galat attempts ho gaye. 15 minute ke liye login lock kar diya gaya hai.`,
      });
    }
    const remaining = MAX_LOGIN_ATTEMPTS - loginAttempts.count;
    return res.status(401).json({ error: `Galat password. ${remaining} attempts baaki hain.` });
  }

  // Successful login
  loginAttempts = { count: 0, lockUntil: 0 };
  currentAdminSession = {
    token: crypto.randomBytes(24).toString("hex"),
    issuedAt: now,
  };
  res.json({ success: true, token: currentAdminSession.token });
});

app.post("/api/admin/verify", (req, res) => {
  const { token } = req.body;
  const now = Date.now();

  if (
    currentAdminSession &&
    token === currentAdminSession.token &&
    now - currentAdminSession.issuedAt < SESSION_DURATION_MS
  ) {
    return res.json({ valid: true });
  }

  currentAdminSession = null;
  res.status(401).json({ valid: false });
});

app.post("/api/admin/logout", (req, res) => {
  currentAdminSession = null;
  res.json({ success: true });
});

// ---------- FORGOT PASSWORD (Security Question) ----------
app.get("/api/admin/security-question", (req, res) => {
  const db = readDB();
  if (!db.settings.adminSecurityAnswerHash) {
    return res.status(404).json({ error: "Security question set nahi hai. Pehle Settings me jaake set karein." });
  }
  res.json({ question: db.settings.adminSecurityQuestion });
});

app.post("/api/admin/forgot-password", (req, res) => {
  const db = readDB();
  const { answer, newPassword } = req.body;

  if (!db.settings.adminSecurityAnswerHash) {
    return res.status(400).json({ error: "Security question set nahi hai. Admin se contact karein." });
  }
  if (!answer || !newPassword) {
    return res.status(400).json({ error: "Answer aur naya password dono zaroori hain" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Naya password kam se kam 6 characters ka hona chahiye" });
  }

  const answerMatches = bcrypt.compareSync(answer.trim().toLowerCase(), db.settings.adminSecurityAnswerHash);
  if (!answerMatches) {
    return res.status(401).json({ error: "Security answer galat hai" });
  }

  db.settings.adminPasswordHash = bcrypt.hashSync(newPassword, 10);
  writeDB(db);
  loginAttempts = { count: 0, lockUntil: 0 };
  res.json({ success: true });
});

// Set/update the security question — sirf logged-in admin kar sakta hai
app.post("/api/admin/security-question", (req, res) => {
  const { token, question, answer, currentPassword } = req.body;
  const now = Date.now();

  if (!currentAdminSession || token !== currentAdminSession.token || now - currentAdminSession.issuedAt >= SESSION_DURATION_MS) {
    return res.status(401).json({ error: "Pehle login karein" });
  }

  const db = readDB();
  if (!currentPassword || !bcrypt.compareSync(currentPassword, db.settings.adminPasswordHash)) {
    return res.status(401).json({ error: "Current password galat hai" });
  }
  if (!question || !answer) {
    return res.status(400).json({ error: "Question aur answer dono zaroori hain" });
  }

  db.settings.adminSecurityQuestion = question;
  db.settings.adminSecurityAnswerHash = bcrypt.hashSync(answer.trim().toLowerCase(), 10);
  writeDB(db);
  res.json({ success: true });
});

// Global error handler — koi bhi error (jaise "request too large") HTML page ki jagah
// hamesha JSON me hi wapas bheja jaaye, warna frontend ka res.json() crash ho jata hai.
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Image/data bahut badi hai. Chhoti image try karein." });
  }
  res.status(500).json({ error: "Server me kuch galat ho gaya. Dobara try karein." });
});

// Server start karne se pehle data store (MongoDB ya local file) load karna zaroori hai,
// warna readDB() ko khaali/purana data mil sakta hai.
initStore().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🛵 SachBite server chal raha hai: http://localhost:${PORT}`);
    console.log(`   Home page:      http://localhost:${PORT}/index.html`);
    console.log(`   Admin Dashboard: http://localhost:${PORT}/dashboard.html\n`);
  });
});
