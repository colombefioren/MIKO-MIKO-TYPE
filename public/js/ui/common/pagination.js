// Previous / next buttons with compact page numbers: 1 … 4 5 6 … 17
import { h, icon } from "../../lib/dom.js";

function pageNumbers(page, totalPages) {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

export function pagination({ page, totalPages, onChange, label = "Pagination" }) {
  if (totalPages <= 1) return null;
  const go = (target) => () => onChange(target);
  return h(
    "nav.pagination",
    { "aria-label": label },
    h("button.page-btn", { type: "button", "aria-label": "Previous page", disabled: page <= 1, onclick: go(page - 1) }, icon("caret-left")),
    pageNumbers(page, totalPages).map((n) =>
      n === null
        ? h("span.page-gap", { "aria-hidden": "true" }, "…")
        : h(
            "button.page-btn",
            { type: "button", "aria-current": n === page ? "page" : undefined, "aria-label": `Page ${n}`, onclick: go(n) },
            n
          )
    ),
    h("button.page-btn", { type: "button", "aria-label": "Next page", disabled: page >= totalPages, onclick: go(page + 1) }, icon("caret-right"))
  );
}
