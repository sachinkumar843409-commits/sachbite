const API = "/api";

function pctChange(today, yesterday) {
  if (yesterday === 0) return today > 0 ? "▲ New" : "No change";
  const diff = (((today - yesterday) / yesterday) * 100).toFixed(0);
  if (diff > 0) return `▲ +${diff}% vs yesterday`;
  if (diff < 0) return `▼ ${diff}% vs yesterday`;
  return "Same as yesterday";
}

async function loadOverview() {
  const res = await fetch(`${API}/analytics`);
  const data = await res.json();

  document.getElementById("todayOrders").textContent = data.todayOrders;
  document.getElementById("todaySales").textContent = `Rs ${data.todaySales}`;
  document.getElementById("pendingOrders").textContent = `${data.pendingOrders} pending`;
  document.getElementById("orderCompare").textContent = pctChange(data.todayOrders, data.yesterdayOrders);
  document.getElementById("salesCompare").textContent = pctChange(data.todaySales, data.yesterdaySales);

  // Bar chart
  const maxVal = Math.max(...data.last7Days.map((d) => d.total), 1);
  const barChart = document.getElementById("barChart");
  barChart.innerHTML = data.last7Days
    .map((d) => {
      const heightPct = Math.max((d.total / maxVal) * 100, 4);
      return `
      <div class="bar-col">
        <div class="bar-value">₹${d.total}</div>
        <div class="bar-fill" style="height:${heightPct}%"></div>
        <div class="bar-label">${d.date}</div>
      </div>`;
    })
    .join("");

  // Top items
  const topItemsList = document.getElementById("topItemsList");
  if (data.topItems.length === 0) {
    topItemsList.innerHTML = "<p style='color:var(--text-gray); font-size:14px;'>Abhi koi order nahi hai.</p>";
  } else {
    topItemsList.innerHTML = data.topItems
      .map(
        (item, i) => `
      <div class="list-row">
        <span class="rank-name"><span class="rank">${i + 1}</span> ${item.name}</span>
        <span>${item.qty} sold · Rs ${item.revenue}</span>
      </div>`
      )
      .join("");
  }

  // Peak hours
  const peakHoursList = document.getElementById("peakHoursList");
  if (data.peakHours.length === 0) {
    peakHoursList.innerHTML = "<p style='color:var(--text-gray); font-size:14px;'>Abhi koi order nahi hai.</p>";
  } else {
    peakHoursList.innerHTML = data.peakHours
      .map(
        (h) => `
      <div class="list-row">
        <span>${h.hour}</span>
        <span>${h.count} orders</span>
      </div>`
      )
      .join("");
  }
}

loadOverview();
