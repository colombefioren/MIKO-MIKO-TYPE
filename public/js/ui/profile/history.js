import { h, emptyState } from "../../lib/dom.js";
import { duration, round, timeAgo } from "../../lib/format.js";
import { pageUrl } from "../../lib/routes.js";
import { renderHistoryChart } from "../../game/chart.js";

function historyRow(result) {
  return h(
    "div.history-row",
    {},
    h("span", { title: new Date(result.created_at).toLocaleString() }, timeAgo(result.created_at)),
    h("span.muted", {}, `${result.difficulty}, ${result.word_count} words`),
    h("span.num", {}, round(result.wpm)),
    h("span.num", {}, `${round(result.accuracy, 1)}%`),
    h("span.num.muted", {}, duration(result.duration_ms))
  );
}

// Chart of the latest tests plus a table of the 20 most recent.
export function historySection(results) {
  if (!results.length) {
    return emptyState({
      iconName: "keyboard",
      title: "No tests yet",
      body: "Finished tests show up here with speed and accuracy.",
      action: h("a.btn.btn-primary", { href: pageUrl("index.html") }, "Take a test"),
    });
  }

  const canvas = h("canvas", { role: "img", "aria-label": "Speed and accuracy over the latest tests" });
  // Oldest first so the line reads left to right.
  queueMicrotask(() => renderHistoryChart(canvas, [...results].reverse()));

  return h(
    "div",
    {},
    results.length > 1 && h("div.card.history-chart", {}, canvas),
    h(
      "div.card.history-list",
      {},
      h(
        "div.history-row.board-head",
        {},
        h("span", {}, "When"),
        h("span", {}, "Test"),
        h("span.num", {}, "WPM"),
        h("span.num", {}, "Accuracy"),
        h("span.num", {}, "Time")
      ),
      results.slice(0, 20).map(historyRow)
    )
  );
}
