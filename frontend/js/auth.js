// Customer Signup/Login — OTP verification ke saath (backend: /api/auth/send-otp, /api/auth/verify-otp)

let pendingAuthPhone = null;
let pendingAuthName = null;

function getLoggedInUser() {
  const raw = localStorage.getItem("sachbite_user");
  return raw ? JSON.parse(raw) : null;
}

function getAuthToken() {
  return localStorage.getItem("sachbite_token");
}

function renderAuthUI() {
  const btn = document.getElementById("loginBtn");
  if (!btn) return;
  const user = getLoggedInUser();

  if (user) {
    btn.textContent = `👋 ${user.name.split(" ")[0]}`;
    btn.classList.remove("btn-primary");
    btn.classList.add("user-pill");
  } else {
    btn.textContent = "Login / Signup";
    btn.classList.add("btn-primary");
    btn.classList.remove("user-pill");
  }
}

function resetAuthModal() {
  const details = document.getElementById("authStepDetails");
  const otpStep = document.getElementById("authStepOtp");
  const error = document.getElementById("authError");
  const otpInput = document.getElementById("authOtp");
  if (details) details.style.display = "block";
  if (otpStep) otpStep.style.display = "none";
  if (error) error.style.display = "none";
  if (otpInput) otpInput.value = "";
}

function showAuthError(msg) {
  const el = document.getElementById("authError");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}

async function sendOtp() {
  const name = document.getElementById("authName").value.trim();
  const phone = document.getElementById("authPhone").value.trim();

  document.getElementById("authError").style.display = "none";

  if (!name || !phone) return showAuthError("Name aur Phone Number dono bharna zaroori hai.");
  if (!/^[0-9]{10}$/.test(phone)) return showAuthError("Sahi 10-digit phone number bharein.");

  const btn = document.getElementById("authSendOtpBtn");
  btn.disabled = true;
  btn.textContent = "Sending...";

  try {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "OTP bhejne me dikkat hui.");

    pendingAuthPhone = phone;
    pendingAuthName = name;

    document.getElementById("authOtpSentTo").textContent = `+91 ${phone}`;

    // Naye customer ko "Sign In" aur purane customer ko "Login" wala friendly message dikhayein
    const welcomeNote = document.getElementById("authWelcomeNote");
    if (welcomeNote) {
      if (data.isNewUser) {
        welcomeNote.textContent = "🆕 Naya account bana rahe hain — Sign In karein!";
        welcomeNote.style.background = "#e6f4ea";
        welcomeNote.style.color = "#166534";
      } else {
        welcomeNote.textContent = "👋 Wapas swagat hai — Login karein!";
        welcomeNote.style.background = "#eef2ff";
        welcomeNote.style.color = "#3730a3";
      }
    }

    // Agar SMS gateway setup nahi hai to backend testing OTP bhej deta hai, warna yeh khali rahega
    document.getElementById("authOtpDemoNote").textContent = data.demoOtp
      ? `📩 Demo mode: aapka OTP hai ${data.demoOtp}`
      : "";

    document.getElementById("authStepDetails").style.display = "none";
    document.getElementById("authStepOtp").style.display = "block";
    document.getElementById("authOtp").focus();
  } catch (e) {
    showAuthError(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Send OTP";
  }
}

async function verifyOtp() {
  const otp = document.getElementById("authOtp").value.trim();
  document.getElementById("authError").style.display = "none";

  if (!otp) return showAuthError("OTP daalna zaroori hai.");

  const btn = document.getElementById("authVerifyOtpBtn");
  btn.disabled = true;
  btn.textContent = "Verifying...";

  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: pendingAuthPhone, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "OTP verify nahi ho paya.");

    localStorage.setItem("sachbite_user", JSON.stringify(data.user));
    localStorage.setItem("sachbite_token", data.token);
    window.dispatchEvent(new CustomEvent("sachbite:login"));

    document.getElementById("authModal").classList.remove("show");
    resetAuthModal();
    renderAuthUI();
    alert(`Welcome, ${data.user.name}! 🎉`);
  } catch (e) {
    showAuthError(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Verify & Continue";
  }
}

function initAuthUI() {
  const btn = document.getElementById("loginBtn");
  if (btn && !btn.dataset.authWired) {
    btn.addEventListener("click", () => {
      const user = getLoggedInUser();
      if (user) {
        if (confirm(`${user.name}, kya aap logout karna chahte hain?`)) {
          const token = getAuthToken();
          if (token) {
            fetch("/api/auth/logout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            }).catch(() => {});
          }
          localStorage.removeItem("sachbite_user");
          localStorage.removeItem("sachbite_token");
          renderAuthUI();
        }
        return;
      }
      resetAuthModal();
      document.getElementById("authModal")?.classList.add("show");
    });
    btn.dataset.authWired = "true";
  }

  const cancelBtn = document.getElementById("authCancelBtn");
  if (cancelBtn && !cancelBtn.dataset.authWired) {
    cancelBtn.addEventListener("click", () => {
      document.getElementById("authModal").classList.remove("show");
    });
    cancelBtn.dataset.authWired = "true";
  }

  const backBtn = document.getElementById("authBackBtn");
  if (backBtn && !backBtn.dataset.authWired) {
    backBtn.addEventListener("click", () => resetAuthModal());
    backBtn.dataset.authWired = "true";
  }

  const sendBtn = document.getElementById("authSendOtpBtn");
  if (sendBtn && !sendBtn.dataset.authWired) {
    sendBtn.addEventListener("click", sendOtp);
    sendBtn.dataset.authWired = "true";
  }

  const verifyBtn = document.getElementById("authVerifyOtpBtn");
  if (verifyBtn && !verifyBtn.dataset.authWired) {
    verifyBtn.addEventListener("click", verifyOtp);
    verifyBtn.dataset.authWired = "true";
  }

  const otpInput = document.getElementById("authOtp");
  if (otpInput && !otpInput.dataset.authWired) {
    otpInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") verifyOtp();
    });
    otpInput.dataset.authWired = "true";
  }

  const resendBtn = document.getElementById("authResendBtn");
  if (resendBtn && !resendBtn.dataset.authWired) {
    resendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      sendOtp();
    });
    resendBtn.dataset.authWired = "true";
  }

  renderAuthUI();
}

initAuthUI();
