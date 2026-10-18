// Unread counter on the header bell: notifications plus unread messages, kept live.
import { h } from "../../lib/dom.js";
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

// Puts a live unread counter on the given bell link. Returns a function that stops it.
export function createInboxBadge(userId, link) {
  link.querySelector(".badge")?.remove();
  badge = h("span.badge", { hidden: true });
  link.append(badge);
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
    stop() {
      stop();
      badge?.remove();
      badge = null;
    },
  };
}
