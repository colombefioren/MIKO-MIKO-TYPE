import { h } from "../../lib/dom.js";
import { round } from "../../lib/format.js";

// Same numbers the database keeps on profiles, computed for guest results kept in the browser.
export function summarizeResults(results) {
  if (!results.length) return { tests: 0, bestWpm: 0, avgWpm: 0, bestAccuracy: 0, avgAccuracy: 0 };
  const wpm = results.map((r) => Number(r.wpm));
  const acc = results.map((r) => Number(r.accuracy));
  const avg = (list) => list.reduce((sum, value) => sum + value, 0) / list.length;
  return { tests: results.length, bestWpm: Math.max(...wpm), avgWpm: avg(wpm), bestAccuracy: Math.max(...acc), avgAccuracy: avg(acc) };
}

export function profileStats(profile) {
  return {
    tests: profile.tests_count,
    bestWpm: profile.best_wpm,
    avgWpm: profile.avg_wpm,
    bestAccuracy: profile.best_accuracy,
    avgAccuracy: profile.avg_accuracy,
  };
}

export function statGrid({ tests, bestWpm, avgWpm, bestAccuracy, avgAccuracy }) {
  const tile = (label, value, feature = false) =>
    h(`div.card.stat-tile${feature ? ".is-feature" : ""}`, {}, h("p.stat-label", {}, label), h("p.stat-value", {}, value));
  return h(
    "div.stat-grid",
    {},
    tile("Best wpm", round(bestWpm), true),
    tile("Average wpm", round(avgWpm)),
    tile("Best accuracy", `${round(bestAccuracy, 1)}%`),
    tile("Average accuracy", `${round(avgAccuracy, 1)}%`),
    tile("Tests", tests)
  );
}
