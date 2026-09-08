// ---------- Restaurant Order Notification ----------
// Jab bhi koi customer order place karta hai, is module ka kaam hai us restaurant ko
// EMAIL bhejna jiska item order hua hai, taaki wo turant khana taiyar karna shuru kar sake.
//
// SETUP (zaroori):
// Environment variables set karein (Render > Environment tab, ya local .env file):
//   SMTP_HOST   -> e.g. smtp.gmail.com
//   SMTP_PORT   -> e.g. 587
//   SMTP_USER   -> aapka bhejne wala email, e.g. sachbite.orders@gmail.com
//   SMTP_PASS   -> Gmail "App Password" (normal password nahi chalega, App Password banana padega)
//
// Agar Gmail use kar rahe hain:
//  1. Google Account > Security > 2-Step Verification ON karein
//  2. "App Passwords" search karke ek naya 16-digit password generate karein "Mail" ke liye
//  3. Wahi 16-digit password SMTP_PASS me daalein (apna normal Gmail password NAHI)
//
// Agar ye environment variables set nahi hain, to ye module silently skip ho jayega
// (order phir bhi normal create hota rahega, sirf email nahi jayega) — koi crash nahi hoga.
//
// NOTE — SMS/WhatsApp: Restaurant ke phone number par direct SMS/WhatsApp bhejne ke liye
// ek paid third-party service (jaise Twilio, Fast2SMS, Gupshup) ka account aur API key
// chahiye hoti hai, jo hum abhi is project me include nahi kar sakte (aapke paas uska
// account/API key nahi hai). Filhal contactPhone sirf reference/record ke liye store ho raha
// hai (admin ise dekh sakta hai), aur asli automatic notification EMAIL ke through jaati hai.
// Baad me agar aap kisi SMS service ka API key le lein, to sendRestaurantOrderNotification()
// function me ek chhota sa addition karke SMS bhi bhej sakte hain.

const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // Email configure nahi hai, gracefully skip karenge
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465, // 465 = SSL, 587 = TLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Agar Gmail se connect hone mein atak jaaye (jo cloud server se kabhi hota hai),
    // to 10 second me hi fail ho jaaye — taaki user "Sending..." pe hamesha atka na rahe
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
  return transporter;
}

/**
 * Order ke items ko restaurant name ke hisaab se group karta hai.
 * Jo items kisi restaurant se linked nahi hain (home page ke generic category items),
 * unhe "Unassigned" group me daal dete hain — inke liye koi restaurant notification nahi jaati.
 */
function groupItemsByRestaurant(items) {
  const groups = {};
  items.forEach((item) => {
    const key = item.restaurant || "__unassigned__";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

/**
 * Order place hone ke baad har relevant restaurant ko email notification bhejta hai.
 * @param {object} order - newly created order object
 * @param {array} restaurants - db.restaurants (taaki contactEmail/contactPhone mil sake)
 */
async function sendRestaurantOrderNotifications(order, restaurants) {
  const t = getTransporter();
  if (!t) {
    console.log("ℹ️  SMTP configure nahi hai — restaurant email notification skip ho gaya. (SMTP_HOST/SMTP_USER/SMTP_PASS set karein.)");
    return;
  }

  const groups = groupItemsByRestaurant(order.items || []);

  for (const [restaurantName, items] of Object.entries(groups)) {
    if (restaurantName === "__unassigned__") continue; // koi restaurant tag nahi, skip

    const restaurant = restaurants.find((r) => r.name === restaurantName);
    if (!restaurant || !restaurant.contactEmail) continue; // is restaurant ka email set hi nahi hai

    const itemsList = items
      .map((i) => `  • ${i.name} x${i.qty} — ₹${i.price * i.qty}`)
      .join("\n");
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    const mailOptions = {
      from: `"SachBite Orders" <${process.env.SMTP_USER}>`,
      to: restaurant.contactEmail,
      subject: `🔔 Naya Order Aaya Hai! (${order.id}) — ${restaurantName}`,
      text: `Namaste ${restaurantName},

Aapke restaurant ke liye ek naya order aaya hai. Kripya turant taiyar karna shuru karein.

Order ID: ${order.id}
Time: ${new Date(order.date).toLocaleString("en-IN")}

Items:
${itemsList}

Subtotal: ₹${subtotal}

Customer:
  Naam: ${order.customer?.name || "-"}
  Phone: ${order.customer?.phone || "-"}
  Address: ${order.customer?.address || "-"}
  Payment: ${order.customer?.payment || "-"}

Please food ko jaldi se jaldi taiyar karke rakhein, delivery partner jald hi pickup ke liye aayega.

— SachBite Team`,
    };

    try {
      await t.sendMail(mailOptions);
      console.log(`✅ Order notification email bheja gaya: ${restaurantName} <${restaurant.contactEmail}>`);
    } catch (err) {
      console.error(`❌ ${restaurantName} ko email bhejne me error:`, err.message);
    }
  }
}

/**
 * Customer ko OTP email se bhejta hai (SMS ki jagah — bilkul free, koi phone app nahi chahiye).
 * Agar SMTP configure nahi hai to silently false return karta hai (crash nahi karta).
 */
async function sendOtpEmail(email, otp) {
  const t = getTransporter();
  if (!t) {
    console.log("ℹ️  SMTP configure nahi hai — OTP email nahi bhej paaye.");
    return false;
  }
  try {
    await t.sendMail({
      from: `"SachBite" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `SachBite Login OTP: ${otp}`,
      text: `Namaste,\n\nAapka SachBite login OTP hai: ${otp}\n\nYeh 5 minute me expire ho jayega. Kisi ke saath share na karein.\n\n— SachBite Team`,
    });
    return true;
  } catch (err) {
    console.error("OTP email bhejne me error:", err.message);
    return false;
  }
}

module.exports = { sendRestaurantOrderNotifications, sendOtpEmail };
