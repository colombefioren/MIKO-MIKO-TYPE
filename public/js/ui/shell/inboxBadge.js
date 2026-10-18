// Unread counter on the header bell: notifications plus unread messages, kept live.
import { h, icon } from "../../lib/dom.js";
import { pageUrl } from "../../lib/routes.js";
import { getAuthState } from "../../services/auth.js";
import { countUnreadMessages } from "../../services/chat.js";
import { countUnreadNotifications } from "../../services/notifications.js";
import { subscribeToChanges } from "../../services/realtime.js";

let badge = null;
let timer;

async function refresh(userId) {
  if (!badge) return;
  try {
    const [notifications, messages] = await Promise.all([countUnreadNotifications(userId), countUnreadMessages(userId)]);
    const total = notifications + messages;
    badge.textContent = total > 99 ? "99+" : String(total);
    badge.hidden = total === 0;
    badge.parentElement.setAttribute("aria-label", total ? `Inbox, ${total} unread` : "Inbox");
  } catch (error) {
    console.error("Could not count unread items", error);
  }
}

// Pages call this after marking things read so the header catches up.
export function scheduleBadgeRefresh() {
  const { user } = getAuthState();
  if (!user) return;
  clearTimeout(timer);
  timer = setTimeout(() => refresh(user.id), 250);
}

// Returns the bell link and a function that stops its live updates.
export function createInboxBadge(userId) {
  badge = h("span.badge", { hidden: true });
  const link = h("a.icon-btn.has-badge", { href: pageUrl("pages/friends.html#inbox"), "aria-label": "Inbox" }, icon("bell"), badge);
  refresh(userId);
  const stop = subscribeToChanges(
    "badge",
    [
      { table: "notifications", filter: `recipient_id=eq.${userId}` },
      { table: "messages", event: "INSERT" },
    ],
    scheduleBadgeRefresh
  );
  return {
    link,
    stop() {
      stop();
      badge = null;
    },
  };
}
