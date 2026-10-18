import { h, emptyState, replaceChildren, skeletonRows } from "../../lib/dom.js";
import { duration, round, timeAgo } from "../../lib/format.js";
import { pageUrl } from "../../lib/routes.js";
import { errorMessage } from "../../lib/toast.js";
import { renderHistoryChart } from "../../game/chart.js";
import { pagination } from "../common/pagination.js";

export const HISTORY_PAGE_SIZE = 10;

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

const tableHead = () =>
  h(
    "div.history-row.board-head",
    {},
    h("span", {}, "When"),
    h("span", {}, "Test"),
    h("span.num", {}, "WPM"),
    h("span.num", {}, "Accuracy"),
    h("span.num", {}, "Time")
  );

// Paged table. `loadPage(page)` resolves to { rows, total }.
function historyTable(loadPage) {
  const rows = h("div", { "aria-live": "polite" });
  const pager = h("div.pagination-slot");
  const summary = h("p.muted.small.pagination-summary");

  async function show(page) {
    rows.setAttribute("aria-busy", "true");
    replaceChildren(rows, skeletonRows(3));
    try {
      const { rows: items, total } = await loadPage(page);
      const totalPages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
      replaceChildren(rows, items.map(historyRow));
      const first = (page - 1) * HISTORY_PAGE_SIZE + 1;
      summary.textContent = `${first} to ${first + items.length - 1} of ${total} tests`;
      replaceChildren(pager, pagination({ page, totalPages, onChange: show, label: "Test history pages" }));
    } catch (error) {
      replaceChildren(rows, h("p.form-error", {}, errorMessage(error)));
    } finally {
      rows.setAttribute("aria-busy", "false");
    }
  }

  show(1);
  return h("div", {}, h("div.card.history-list", {}, tableHead(), rows), h("div.pagination-bar", {}, summary, pager));
}

// Chart of the latest tests plus the paged table of every test.
// `latest` is newest first; `loadPage` fetches one table page.
export function historySection({ latest, loadPage }) {
  if (!latest.length) {
    return emptyState({
      iconName: "keyboard",
      title: "No tests yet",
      body: "Finished tests show up here with speed and accuracy.",
      action: h("a.btn.btn-primary", { href: pageUrl("index.html") }, "Take a test"),
    });
  }

  const canvas = h("canvas", { role: "img", "aria-label": "Speed and accuracy over the latest tests" });
  // Oldest first so the line reads left to right.
  queueMicrotask(() => renderHistoryChart(canvas, [...latest].reverse()));

  return h("div", {}, latest.length > 1 && h("div.card.history-chart", {}, canvas), historyTable(loadPage));
}

// Pages an array kept in memory, for guest results saved in the browser.
export const pageFromArray = (items) => async (page) => ({
  rows: items.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE),
  total: items.length,
});
