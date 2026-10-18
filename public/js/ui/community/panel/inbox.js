// Inbox tab: friend requests, accepted requests, likes and comments.
import { h, icon, emptyState, replaceChildren } from "../../../lib/dom.js";
import { avatar } from "../../../lib/avatar.js";
import { timeAgo } from "../../../lib/format.js";
import { profileUrl } from "../../../lib/routes.js";
import { errorMessage, toast } from "../../../lib/toast.js";
import { clearNotifications, describeNotification, getNotifications, markAllNotificationsRead } from "../../../services/notifications.js";
import { confirmAction } from "../../common/confirm.js";
import { scheduleBadgeRefresh } from "../../shell/inboxBadge.js";

function notificationRow(item) {
  const { icon: iconName, text } = describeNotification(item.type);
  const href = item.post_id ? `#post-${item.post_id}` : profileUrl(item.actor?.id ?? "");
  return h(
    `a.list-row${item.read_at ? "" : ".is-unread"}`,
    { href },
    item.actor ? avatar(item.actor, 36) : icon(iconName),
    h("span.list-main", {}, h("span.list-title", {}, item.actor?.username ?? "Someone"), h("span.list-sub", {}, text)),
    h("span.list-side", {}, icon(iconName), timeAgo(item.created_at))
  );
}

export function createInboxTab({ panel, setCount }) {
  let unread = 0;
  let user = null;

  async function clearAll() {
    if (!(await confirmAction({ title: "Clear your inbox?", confirmLabel: "Clear", danger: true }))) return;
    try {
      await clearNotifications(user.id);
      await load(user);
      scheduleBadgeRefresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function load(nextUser) {
    user = nextUser;
    try {
      const items = await getNotifications(user.id);
      unread = items.filter((item) => !item.read_at).length;
      setCount(unread);
      const toolbar = h(
        "div.panel-toolbar",
        {},
        h("span.muted.small", {}, unread ? `${unread} unread` : "All caught up"),
        items.length > 0 && h("button.btn.btn-ghost.btn-sm", { type: "button", onclick: clearAll }, "Clear all")
      );
      const list = items.length
        ? h("div.list", {}, items.map(notificationRow))
        : emptyState({ iconName: "bell", title: "Nothing new", body: "Friend requests, likes and comments land here." });
      replaceChildren(panel, toolbar, list);
    } catch (error) {
      replaceChildren(panel, h("p.form-error", {}, errorMessage(error)));
    }
  }

  // Called when the tab is opened: everything shown counts as read.
  async function markRead() {
    if (!user || !unread) return;
    try {
      await markAllNotificationsRead(user.id);
      unread = 0;
      setCount(0);
      scheduleBadgeRefresh();
    } catch (error) {
      console.error("Could not mark notifications read", error);
    }
  }

  return { load, markRead };
}
