export function createResultsChart(wpmHistory, accuracyHistory, difficulty) {
  const ctx = document.getElementById("results-chart");

  // destroy previous chart if it exists
  if (ctx.chart) {
    ctx.chart.destroy();
  }
  const labels = wpmHistory.map((_, index) => `${index + 1}`);

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "WPM",
          data: wpmHistory,
          borderColor: "#FF6B35",
          backgroundColor: "rgba(255, 107, 53, 0.1)",
          borderWidth: 2,
          tension: 0.3,
          pointBackgroundColor: "#FF6B35",
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Accuracy",
          data: accuracyHistory,
          borderColor: "#2596D1",
          backgroundColor: "rgba(37, 150, 209, 0.1)",
          borderWidth: 2,
          tension: 0.3,
          pointBackgroundColor: "#2596D1",
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#E2E8F0",
            font: {
              size: 14,
            },
          },
        },
        title: {
          display: true,
          text: `Typing Performance (${difficulty} Mode)`,
          color: "#FFFFFF",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        tooltip: {
          backgroundColor: "#1E293B",
          titleColor: "#FF6B35",
          bodyColor: "#E2E8F0",
          borderColor: "#334155",
          borderWidth: 1,
          padding: 12,
          usePointStyle: true,
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(226, 232, 240, 0.1)",
          },
          ticks: {
            color: "#E2E8F0",
          },
        },
        y: {
          beginAtZero: false,
          grid: {
            color: "rgba(226, 232, 240, 0.1)",
          },
          ticks: {
            color: "#E2E8F0",
          },
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
    },
  });

  ctx.chart = chart;

  return chart;
}

export async function captureChartImage() {
  try {
    const chartCanvas = document.getElementById("results-chart");
    const chart = chartCanvas.chart;

    if (!chart) {
      throw new Error("Chart instance not found");
    }

    const captureContainer = document.createElement("div");
    captureContainer.style.position = "fixed";
    captureContainer.style.left = "-9999px";
    captureContainer.style.backgroundColor = "#0F172A";
    captureContainer.style.padding = "20px";
    captureContainer.style.width = "600px";

    const title = document.createElement("h3");
    title.textContent = "Miko-Miko Type";
    title.style.color = "#FFFFFF";
    title.style.textAlign = "center";
    title.style.marginBottom = "15px";
    title.style.fontFamily = "inherit";

    const chartImage = new Image();
    chartImage.src = chart.toBase64Image();
    chartImage.style.width = "100%";
    chartImage.style.height = "auto";
    chartImage.style.borderRadius = "8px";

    captureContainer.appendChild(title);
    captureContainer.appendChild(chartImage);
    document.body.appendChild(captureContainer);

    const canvas = await html2canvas(captureContainer, {
      backgroundColor: "#0F172A",
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    document.body.removeChild(captureContainer);

    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Error capturing chart image:", error);
    return fallbackCapture();
  }
}

async function fallbackCapture() {
  const chartContainer = document.querySelector(".chart-container");
  const canvas = await html2canvas(chartContainer, {
    backgroundColor: "#0F172A",
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: true,
  });
  return canvas.toDataURL("image/png");
}
