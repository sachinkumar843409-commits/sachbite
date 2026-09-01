const API = "/api";

async function loadAnalytics() {
  const res = await fetch(`${API}/analytics`);
  const data = await res.json();

  // ---- Sales bar chart (last 7 days) ----
  const maxSales = Math.max(...data.last7Days.map((d) => d.total), 1);
  document.getElementById("salesBarChart").innerHTML = data.last7Days
    .map((d) => {
      const heightPct = Math.max((d.total / maxSales) * 100, 4);
      return `
      <div class="bar-col">
        <div class="bar-value">₹${d.total}</div>
        <div class="bar-fill" style="height:${heightPct}%"></div>
        <div class="bar-label">${d.date}</div>
      </div>`;
    })
    .join("");

  // ---- Top items horizontal bar chart ----
  const topItemsChart = document.getElementById("topItemsChart");
  if (data.topItems.length === 0) {
    topItemsChart.innerHTML = "<p style='color:var(--text-gray); font-size:14px;'>Abhi koi order nahi hai.</p>";
  } else {
    const maxQty = Math.max(...data.topItems.map((i) => i.qty), 1);
    topItemsChart.innerHTML = data.topItems
      .map((item) => {
        const widthPct = (item.qty / maxQty) * 100;
        return `
        <div class="hbar-row">
          <div class="hbar-label">${item.name}</div>
          <div class="hbar-track"><div class="hbar-fill" style="width:${widthPct}%"></div></div>
          <div class="hbar-value">${item.qty} sold</div>
        </div>`;
      })
      .join("");
  }

  // ---- Peak hours horizontal bar chart ----
  const peakHoursChart = document.getElementById("peakHoursChart");
  if (data.peakHours.length === 0) {
    peakHoursChart.innerHTML = "<p style='color:var(--text-gray); font-size:14px;'>Abhi koi order nahi hai.</p>";
  } else {
    const maxCount = Math.max(...data.peakHours.map((h) => h.count), 1);
    peakHoursChart.innerHTML = data.peakHours
      .map((h) => {
        const widthPct = (h.count / maxCount) * 100;
        return `
        <div class="hbar-row">
          <div class="hbar-label">${h.hour}</div>
          <div class="hbar-track"><div class="hbar-fill" style="width:${widthPct}%"></div></div>
          <div class="hbar-value">${h.count} orders</div>
        </div>`;
      })
      .join("");
  }
  // ---- Payment methods breakdown ----
  const paymentRes = await fetch(`${API}/analytics/payment-methods`);
  const paymentData = await paymentRes.json();
  const paymentChart = document.getElementById("paymentMethodsChart");
  const PAYMENT_ICONS = { "Cash on Delivery": "💵", UPI: "📱", "Credit/Debit Card": "💳" };

  if (paymentData.length === 0) {
    paymentChart.innerHTML = "<p style='color:var(--text-gray); font-size:14px;'>Abhi koi order nahi hai.</p>";
  } else {
    const maxCount = Math.max(...paymentData.map((p) => p.count), 1);
    paymentChart.innerHTML = paymentData
      .map((p) => {
        const widthPct = (p.count / maxCount) * 100;
        const icon = PAYMENT_ICONS[p.method] || "💰";
        return `
        <div class="hbar-row">
          <div class="hbar-label">${icon} ${p.method}</div>
          <div class="hbar-track"><div class="hbar-fill" style="width:${widthPct}%"></div></div>
          <div class="hbar-value">${p.count} orders · ₹${p.revenue}</div>
        </div>`;
      })
      .join("");
  }
}

loadAnalytics();
