import { calendarDate } from "../lib/format.js";
import { token, onThemeChange } from "../lib/theme.js";

const charts = new WeakMap();

function palette() {
  return {
    accent: token("--accent"),
    muted: token("--text-muted"),
    faint: token("--text-faint"),
    grid: token("--border"),
    error: token("--danger"),
    surface: token("--surface-2"),
    text: token("--text"),
    frost: token("--frost"),
  };
}

function buildConfig(kind, data) {
  const colors = palette();
  const font = { family: token("--font-sans"), size: 12 };
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    animation: matchMedia("(prefers-reduced-motion: reduce)").matches ? false : { duration: 400 },
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colors.surface,
        titleColor: colors.text,
        bodyColor: colors.muted,
        borderColor: colors.grid,
        borderWidth: 1,
        padding: 10,
        titleFont: font,
        bodyFont: font,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: colors.faint, font, maxTicksLimit: 10 }, border: { color: colors.grid } },
      y: { beginAtZero: true, grid: { color: colors.grid }, ticks: { color: colors.faint, font, precision: 0 }, border: { display: false } },
    },
  };

  if (kind === "results") {
    return {
      type: "line",
      data: {
        labels: data.map((sample) => `${Math.round(sample.second)}s`),
        datasets: [
          { label: "wpm", data: data.map((s) => s.wpm), borderColor: colors.accent, backgroundColor: colors.accent, borderWidth: 2, pointRadius: 0, tension: 0.35 },
          { label: "raw", data: data.map((s) => s.raw), borderColor: colors.frost, borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0, tension: 0.35 },
          {
            label: "errors",
            type: "scatter",
            data: data.map((s, i) => (s.errors ? { x: i, y: s.errors } : null)).filter(Boolean),
            yAxisID: "errors",
            backgroundColor: colors.error,
            pointStyle: "crossRot",
            pointRadius: 4,
            borderColor: colors.error,
          },
        ],
      },
      options: {
        ...base,
        scales: {
          ...base.scales,
          errors: { display: data.some((s) => s.errors > 0), position: "right", beginAtZero: true, grid: { display: false }, ticks: { color: colors.faint, font, precision: 0 }, border: { display: false } },
        },
      },
    };
  }

  // Profile history: one point per test, oldest first.
  return {
    type: "line",
    data: {
      labels: data.map((row) => calendarDate(row.created_at)),
      datasets: [
        { label: "wpm", data: data.map((row) => Number(row.wpm)), borderColor: colors.accent, backgroundColor: colors.accent, borderWidth: 2, pointRadius: 2.5, tension: 0.3 },
        { label: "accuracy", data: data.map((row) => Number(row.accuracy)), borderColor: colors.frost, borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0, tension: 0.3 },
      ],
    },
    options: base,
  };
}

const latest = new Map();

function render(canvas, kind, data) {
  if (typeof window.Chart !== "function") return;
  charts.get(canvas)?.destroy();
  charts.set(canvas, new window.Chart(canvas, buildConfig(kind, data)));
}

// Redraw with the new colours when the theme changes.
onThemeChange(() => {
  for (const [canvas, { kind, data }] of latest) {
    if (canvas.isConnected) render(canvas, kind, data);
    else latest.delete(canvas);
  }
});

// Chart.js loads with `defer`, so wait for the window load event if needed.
function draw(canvas, kind, data) {
  latest.set(canvas, { kind, data });
  if (typeof window.Chart === "function") render(canvas, kind, data);
  else window.addEventListener("load", () => render(canvas, kind, latest.get(canvas).data), { once: true });
}

export const renderResultsChart = (canvas, samples) => draw(canvas, "results", samples);
export const renderHistoryChart = (canvas, rows) => draw(canvas, "history", rows);
