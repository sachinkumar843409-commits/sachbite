const API = "/api";
let capturedLocation = null;
let previewMap = null;
let businessUpiId = "";
let businessUpiName = "SachBite";

// Business UPI details load karo (Admin Settings se aayenge)
fetch(`${API}/settings`)
  .then((r) => r.json())
  .then((s) => {
    businessUpiId = s.businessUpiId || "";
    businessUpiName = s.businessUpiName || "SachBite";
  })
  .catch(() => {});

function renderCart() {
  const cart = getCart();
  const box = document.getElementById("cartItems");

  if (cart.length === 0) {
    box.innerHTML = "<p style='color:#888'>Cart khali hai. Home page se items add karein.</p>";
  } else {
    box.innerHTML = cart
      .map(
        (item, index) => `
      <div class="cart-item-row">
        <span>${item.name}</span>
        <div class="qty-btns" style="display:flex; align-items:center; gap:8px;">
          <button type="button" onclick="changeCartQty(${index}, -1)">−</button>
          <span style="min-width:18px; text-align:center; font-weight:700;">${item.qty}</span>
          <button type="button" onclick="changeCartQty(${index}, 1)">+</button>
        </div>
        <span style="min-width:60px; text-align:right;">₹${item.price * item.qty}</span>
      </div>`
      )
      .join("");
  }

  const itemTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  document.getElementById("itemTotal").textContent = `₹${itemTotal}`;
  document.getElementById("grandTotal").textContent = `₹${itemTotal}`;
}

// Cart page par qty +/- karne ke liye — qty 0 tak jaaye to item cart se hat jayega
function changeCartQty(index, delta) {
  const cart = getCart();
  const item = cart[index];
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    cart.splice(index, 1);
    showToast("Item hataya gaya", `${item.name} cart se remove ho gaya`, "error");
  }

  saveCart(cart);
  renderCart();
  if (document.getElementById("upiDirectBox").classList.contains("show")) {
    updateUpiDirectDetails();
  }
}

// ---------- Geolocation capture ----------
document.getElementById("useLocationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    showToast("Location support nahi hai", "Aapka browser location share karne ko support nahi karta.", "error");
    return;
  }

  document.getElementById("useLocationBtn").textContent = "📍 Location dhoondh rahe hain...";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      capturedLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      document.getElementById("useLocationBtn").textContent = "📍 Use My Current Location (delivery tracking ke liye)";
      document.getElementById("locationStatus").style.display = "block";

      const mapDiv = document.getElementById("locationPreviewMap");
      mapDiv.style.display = "block";

      if (!previewMap) {
        previewMap = L.map("locationPreviewMap").setView([capturedLocation.lat, capturedLocation.lng], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(previewMap);
        L.marker([capturedLocation.lat, capturedLocation.lng]).addTo(previewMap).bindPopup("Aapki delivery location");
      } else {
        previewMap.setView([capturedLocation.lat, capturedLocation.lng], 15);
      }

      setTimeout(() => previewMap.invalidateSize(), 200);
    },
    (error) => {
      document.getElementById("useLocationBtn").textContent = "📍 Use My Current Location (delivery tracking ke liye)";
      showToast("Location access nahi mila", "Browser me location permission allow karein.", "error");
    }
  );
});

// Agar user logged in hai, uska naam/phone auto-fill kar dein
const loggedInUser = JSON.parse(localStorage.getItem("sachbite_user") || "null");
if (loggedInUser) {
  document.getElementById("custName").value = loggedInUser.name || "";
  document.getElementById("custPhone").value = loggedInUser.phone || "";
}

// ---------- Payment method selection (visual highlight + UPI Direct box) ----------
document.querySelectorAll(".payment-opt input").forEach((input) => {
  input.addEventListener("change", () => {
    document.querySelectorAll(".payment-opt").forEach((label) => label.classList.remove("selected"));
    input.closest(".payment-opt").classList.add("selected");
    toggleUpiDirectBox();
  });
});

function toggleUpiDirectBox() {
  const box = document.getElementById("upiDirectBox");
  const payment = getSelectedPayment();

  if (payment === "UPI (Direct)") {
    box.classList.add("show");
    updateUpiDirectDetails();
  } else {
    box.classList.remove("show");
  }
}

function updateUpiDirectDetails() {
  const cart = getCart();
  const amount = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  document.getElementById("upiAmountDisplay").textContent = `₹${amount}`;

  if (!businessUpiId) {
    document.getElementById("upiQrImage").style.display = "none";
    document.getElementById("upiAppLink").style.display = "none";
    document.getElementById("upiAmountDisplay").insertAdjacentHTML(
      "afterend",
      `<div style="color:var(--red); font-size:13px; font-weight:600;" id="upiNotSetupMsg">⚠️ Abhi UPI ID set nahi hui hai. Cash on Delivery choose karein, ya admin se contact karein.</div>`
    );
    return;
  }

  const note = encodeURIComponent(`SachBite Order`);
  const upiLink = `upi://pay?pa=${encodeURIComponent(businessUpiId)}&pn=${encodeURIComponent(businessUpiName)}&am=${amount}&cu=INR&tn=${note}`;

  document.getElementById("upiAppLink").href = upiLink;
  document.getElementById("upiQrImage").src =
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;
}

function getSelectedPayment() {
  const checked = document.querySelector(".payment-opt input:checked");
  return checked ? checked.value : "Cash on Delivery";
}

document.getElementById("placeOrderBtn").addEventListener("click", async () => {
  const cart = getCart();
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const payment = getSelectedPayment();

  // Bina login kiye order place nahi ho sakta — customer ko login modal dikha dein
  const currentUser = JSON.parse(localStorage.getItem("sachbite_user") || "null");
  if (!currentUser) {
    showToast("Login zaroori hai", "Order place karne ke liye pehle Login/Signup karein.", "error");
    if (typeof resetAuthModal === "function") resetAuthModal();
    document.getElementById("authModal")?.classList.add("show");
    return;
  }

  if (cart.length === 0) {
    showToast("Cart khali hai", "Pehle kuch order karein.", "error");
    return;
  }
  if (!name || !phone || !address) {
    showToast("Details adhuri hain", "Please Name, Phone aur Address bharein.", "error");
    return;
  }
  if (!capturedLocation) {
    showToast("Location zaroori hai", "Delivery tracking ke liye 'Use My Current Location' button dabakar location share karein.", "error");
    return;
  }

  const customer = { name, phone, address, payment };

  if (payment === "Cash on Delivery") {
    // Seedha order place karo, koi payment gateway nahi chahiye
    await finalizeOrder(customer, cart, null, null);
  } else if (payment === "UPI (Direct)") {
    const upiReference = document.getElementById("upiReferenceInput").value.trim();
    if (!businessUpiId) {
      showToast("UPI abhi setup nahi hai", "Cash on Delivery choose karein.", "error");
      return;
    }
    if (!upiReference) {
      showToast("UTR number zaroori hai", "Payment karne ke baad UPI transaction/reference ID bharein.", "error");
      return;
    }
    if (!/^\d{12}$/.test(upiReference)) {
      showToast("Please fill correct UTR", "UTR number sahi 12-digit ka hona chahiye — apne payment app/SMS me check karke dobara bharein.", "error");
      return;
    }
    await finalizeOrder(customer, cart, null, upiReference);
  } else {
    // Credit/Debit Card — Razorpay checkout widget kholo
    await startRazorpayPayment(customer, cart);
  }
});

// ---------- Razorpay Payment Flow (UPI / Credit / Debit Card) ----------
async function startRazorpayPayment(customer, cart) {
  const btn = document.getElementById("placeOrderBtn");
  btn.disabled = true;
  btn.textContent = "Payment window khul raha hai...";

  try {
    const orderRes = await fetch(`${API}/payment/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart }),
    });

    if (!orderRes.ok) {
      const errData = await orderRes.json().catch(() => ({}));
      throw new Error(errData.error || "Payment order nahi ban paya");
    }
    const orderData = await orderRes.json();

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "SachBite",
      description: "Food Order Payment",
      order_id: orderData.orderId,
      prefill: {
        name: customer.name,
        contact: customer.phone,
      },
      theme: { color: "#ff7a1a" },
      handler: async function (response) {
        // Payment successful — ab signature verify karo
        const verifyRes = await fetch(`${API}/payment/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });
        const verifyData = await verifyRes.json();

        if (verifyData.verified) {
          await finalizeOrder(customer, cart, response.razorpay_payment_id, null);
        } else {
          showToast("Payment verify nahi ho paya", "Agar paisa kata hai to support se contact karein.", "error");
          resetPlaceOrderBtn();
        }
      },
      modal: {
        ondismiss: function () {
          resetPlaceOrderBtn();
        },
      },
    };

    const rzp = new Razorpay(options);
    rzp.on("payment.failed", function (response) {
      showToast("Payment fail ho gaya", response.error.description || "Dobara try karein.", "error");
      resetPlaceOrderBtn();
    });
    rzp.open();
  } catch (e) {
    showToast("Payment shuru nahi ho paya", e.message || "Server chal raha hai check karein.", "error");
    resetPlaceOrderBtn();
  }
}

function resetPlaceOrderBtn() {
  const btn = document.getElementById("placeOrderBtn");
  btn.disabled = false;
  btn.textContent = "Place Order";
}

// ---------- Final step: SachBite order create karo ----------
async function finalizeOrder(customer, cart, paymentReference, upiReference) {
  const body = {
    customer,
    items: cart,
    location: capturedLocation,
    paymentReference,
    upiReference,
  };

  try {
    const res = await fetch(`${API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Order fail hua");
    const order = await res.json();

    localStorage.removeItem("sachbite_cart");
    showToast("✅ Order Confirmed!", `Order ID: ${order.id} — Track Order page pe redirect ho rahe hain...`, "success");
    setTimeout(() => {
      window.location.href = `track-order.html?phone=${encodeURIComponent(customer.phone)}`;
    }, 1400);
  } catch (e) {
    showToast("Order place nahi ho paya", "Server chal raha hai check karein.", "error");
    resetPlaceOrderBtn();
  }
}

renderCart();
