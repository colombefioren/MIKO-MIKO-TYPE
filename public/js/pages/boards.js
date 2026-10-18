import { $, h, emptyState, replaceChildren, skeletonRows } from "../lib/dom.js";
import { avatar } from "../lib/avatar.js";
import { round } from "../lib/format.js";
import { isBackendReady } from "../lib/supabase.js";
import { errorMessage } from "../lib/toast.js";
import { initShell, pageUrl, profileUrl } from "../ui/shell.js";
import { getAuthState, onAuthChange } from "../services/auth.js";
import { getLeaderboard } from "../services/results.js";
import { subscribeToChanges } from "../services/realtime.js";

const LIMIT = 50;
const rowsEl = $("#board-rows");
const meEl = $("#board-me");
const filter = $("#board-filter");
let loadToken = 0;

function row(entry, { isMe }) {
  return h(
    "div.board-row",
    { role: "row", dataset: { rank: entry.rank }, class: isMe ? "is-me" : "" },
    h("span.board-rank", { role: "cell" }, entry.rank),
    h(
      "span.user-cell",
      { role: "cell" },
      avatar(entry, 36),
      h("a.user-link", { href: profileUrl(entry.user_id) }, entry.username)
    ),
    h("span.num.board-wpm", { role: "cell" }, round(entry.wpm)),
    h("span.num", { role: "cell" }, `${round(entry.accuracy, 1)}%`),
    h("span.num.muted", { role: "cell" }, entry.tests)
  );
}

async function load() {
  const token = ++loadToken;
  const difficulty = new FormData(filter).get("difficulty") || null;
  rowsEl.setAttribute("aria-busy", "true");
  if (!rowsEl.children.length) replaceChildren(rowsEl, skeletonRows(6));

  try {
    // Ask for one extra page so the signed-in user's rank is usually included.
    const entries = await getLeaderboard(difficulty, 200);
    if (token !== loadToken) return;
    const { user } = getAuthState();
    const top = entries.slice(0, LIMIT);

    if (!top.length) {
      replaceChildren(
        rowsEl,
        emptyState({
          iconName: "trophy",
          title: "No results yet",
          body: "Finish a test while logged in to claim the first spot.",
          action: h("a.btn.btn-primary", { href: pageUrl("index.html") }, "Take a test"),
        })
      );
    } else {
      replaceChildren(rowsEl, top.map((entry) => row(entry, { isMe: entry.user_id === user?.id })));
    }

    const mine = user && entries.find((entry) => entry.user_id === user.id);
    replaceChildren(
      meEl,
      mine && mine.rank > LIMIT
        ? h("div.card.board.board-me", { role: "table", "aria-label": "Your rank" }, row(mine, { isMe: true }))
        : null
    );
  } catch (error) {
    console.error("Could not load leaderboard", error);
    replaceChildren(rowsEl, emptyState({ iconName: "warning-circle", title: "Could not load the leaderboard", body: errorMessage(error) }));
  } finally {
    if (token === loadToken) rowsEl.setAttribute("aria-busy", "false");
  }
}

let reloadTimer;
function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(load, 1200);
}

await initShell("boards");

if (!isBackendReady) {
  replaceChildren(
    rowsEl,
    emptyState({ iconName: "cloud-slash", title: "Leaderboard unavailable", body: "The server is not configured, so only guest typing tests work right now." })
  );
  rowsEl.setAttribute("aria-busy", "false");
} else {
  filter.addEventListener("change", load);
  onAuthChange(scheduleReload);
  subscribeToChanges("leaderboard", [{ table: "game_results", event: "INSERT" }], scheduleReload);
  load();
}
