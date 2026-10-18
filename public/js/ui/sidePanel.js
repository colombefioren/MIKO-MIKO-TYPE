// Community side panel: chats, inbox (notifications) and friends.
import { h, icon, emptyState, replaceChildren, setBusy, skeletonRows } from "../lib/dom.js";
import { avatar } from "../lib/avatar.js";
import { round, timeAgo } from "../lib/format.js";
import { errorMessage, toast } from "../lib/toast.js";
import { profileUrl } from "../lib/routes.js";
import { scheduleBadgeRefresh } from "./shell/inboxBadge.js";
import { openAuthDialog } from "./auth/dialog.js";
import { confirmAction } from "./common/confirm.js";
import { getChatList } from "../services/chat.js";
import {
  clearNotifications,
  describeNotification,
  getNotifications,
  markAllNotificationsRead,
} from "../services/notifications.js";
import {
  acceptFriendRequest,
  getFriendships,
  removeFriendship,
  sendFriendRequest,
} from "../services/friends.js";
import { searchProfiles } from "../services/profiles.js";
import { onOnlineChange } from "../services/realtime.js";

const TABS = [
  { id: "chats", label: "Chats", icon: "chats-circle" },
  { id: "inbox", label: "Inbox", icon: "bell" },
  { id: "friends", label: "Friends", icon: "users-three" },
];

function presenceAvatar(profile, size) {
  return h("span.avatar-wrap", { dataset: { presence: profile.id } }, avatar(profile, size));
}

// Keeps green dots in sync with who is connected right now.
function syncPresence(root, online) {
  for (const wrap of root.querySelectorAll("[data-presence]")) {
    const dot = wrap.querySelector(".online-dot");
    if (online.has(wrap.dataset.presence) && !dot) wrap.append(h("span.online-dot", { title: "Online" }));
    if (!online.has(wrap.dataset.presence) && dot) dot.remove();
  }
}

export function createSidePanel(container, { onOpenChat }) {
  let user = null;
  let active = "chats";
  let online = new Set();
  const panels = {};
  const tabs = {};
  const counts = {};

  const tabList = h("div.tabs", { role: "tablist", "aria-label": "Community panels" });
  for (const tab of TABS) {
    counts[tab.id] = h("span.count-pill", { hidden: true });
    tabs[tab.id] = h(
      "button.tab",
      { type: "button", role: "tab", id: `side-tab-${tab.id}`, "aria-controls": `side-panel-${tab.id}`, onclick: () => select(tab.id) },
      icon(tab.icon),
      tab.label,
      counts[tab.id]
    );
    panels[tab.id] = h("div", { role: "tabpanel", id: `side-panel-${tab.id}`, "aria-labelledby": `side-tab-${tab.id}` });
    tabList.append(tabs[tab.id]);
  }
  container.replaceChildren(tabList, ...Object.values(panels));

  onOnlineChange((ids) => {
    online = ids;
    syncPresence(container, online);
  });

  function setCount(tab, value) {
    counts[tab].textContent = value;
    counts[tab].hidden = !value;
  }

  function select(id) {
    active = id;
    for (const tab of TABS) {
      tabs[tab.id].setAttribute("aria-selected", String(tab.id === id));
      panels[tab.id].hidden = tab.id !== id;
    }
    if (id === "inbox" && user) markInboxRead();
  }

  // ---------------------------------------------------------------- Chats

  async function loadChats() {
    if (!user) return;
    if (!panels.chats.children.length) replaceChildren(panels.chats, skeletonRows(3));
    try {
      const chats = await getChatList();
      setCount("chats", chats.reduce((sum, chat) => sum + Number(chat.unread_count), 0));
      if (!chats.length) {
        replaceChildren(
          panels.chats,
          emptyState({
            iconName: "chats-circle",
            title: "No conversations yet",
            body: "Message a friend to start chatting.",
            action: h("button.btn.btn-secondary.btn-sm", { type: "button", onclick: () => select("friends") }, "Find friends"),
          })
        );
        return;
      }
      replaceChildren(
        panels.chats,
        h(
          "div.list",
          {},
          chats.map((chat) => {
            const other = { id: chat.other_id, username: chat.other_username, avatar_url: chat.other_avatar_url };
            const unread = Number(chat.unread_count);
            const preview = chat.last_message ? `${chat.last_sender_id === user.id ? "You: " : ""}${chat.last_message}` : "No messages yet";
            return h(
              `button.list-row${unread ? ".is-unread" : ""}`,
              { type: "button", onclick: () => onOpenChat({ id: chat.chat_id, other }) },
              presenceAvatar(other, 40),
              h("span.list-main", {}, h("span.list-title", {}, other.username), h("span.list-sub", {}, preview)),
              h("span.list-side", {}, timeAgo(chat.last_message_at), unread ? h("span.count-pill", {}, unread) : null)
            );
          })
        )
      );
      syncPresence(panels.chats, online);
    } catch (error) {
      replaceChildren(panels.chats, h("p.form-error", {}, errorMessage(error)));
    }
  }

  // ---------------------------------------------------------------- Inbox

  async function loadInbox() {
    if (!user) return;
    try {
      const items = await getNotifications(user.id);
      const unread = items.filter((item) => !item.read_at).length;
      setCount("inbox", unread);
      const toolbar = h(
        "div.panel-toolbar",
        {},
        h("span.muted.small", {}, unread ? `${unread} unread` : "All caught up"),
        items.length
          ? h(
              "button.btn.btn-ghost.btn-sm",
              {
                type: "button",
                onclick: async () => {
                  if (!(await confirmAction({ title: "Clear your inbox?", confirmLabel: "Clear", danger: true }))) return;
                  try {
                    await clearNotifications(user.id);
                    await loadInbox();
                    scheduleBadgeRefresh();
                  } catch (error) {
                    toast(errorMessage(error), "error");
                  }
                },
              },
              "Clear all"
            )
          : null
      );
      const list = items.length
        ? h(
            "div.list",
            {},
            items.map((item) => {
              const { icon: iconName, text } = describeNotification(item.type);
              const href = item.post_id ? `#post-${item.post_id}` : profileUrl(item.actor?.id ?? "");
              return h(
                `a.list-row${item.read_at ? "" : ".is-unread"}`,
                { href },
                item.actor ? avatar(item.actor, 36) : icon(iconName),
                h(
                  "span.list-main",
                  {},
                  h("span.list-title", {}, item.actor?.username ?? "Someone"),
                  h("span.list-sub", {}, text)
                ),
                h("span.list-side", {}, icon(iconName), timeAgo(item.created_at))
              );
            })
          )
        : emptyState({ iconName: "bell", title: "Nothing new", body: "Friend requests, likes and comments land here." });
      replaceChildren(panels.inbox, toolbar, list);
    } catch (error) {
      replaceChildren(panels.inbox, h("p.form-error", {}, errorMessage(error)));
    }
  }

  async function markInboxRead() {
    if (!Number(counts.inbox.textContent)) return;
    try {
      await markAllNotificationsRead(user.id);
      setCount("inbox", 0);
      scheduleBadgeRefresh();
    } catch (error) {
      console.error("Could not mark notifications read", error);
    }
  }

  // ---------------------------------------------------------------- Friends

  const searchInput = h("input.input", { type: "search", placeholder: "Search typists by username", "aria-label": "Search typists" });
  const friendsBody = h("div");
  panels.friends.append(h("div.search", {}, icon("magnifying-glass"), searchInput), friendsBody);
  let friendships = { friends: [], incoming: [], outgoing: [] };

  const run = (label, action, success) => async (event) => {
    const restore = setBusy(event.currentTarget, label);
    try {
      await action();
      if (success) toast(success, "success");
      await refreshFriends();
    } catch (error) {
      restore();
      toast(errorMessage(error), "error");
    }
  };

  function personRow(profile, actions, sub) {
    return h(
      "div.list-row",
      {},
      presenceAvatar(profile, 40),
      h(
        "span.list-main",
        {},
        h("a.list-title.user-link", { href: profileUrl(profile.id) }, profile.username),
        h("span.list-sub", {}, sub ?? `Best ${round(profile.best_wpm)} wpm`)
      ),
      h("span.list-actions", {}, actions)
    );
  }

  const iconAction = (label, iconName, onclick, extra = "") =>
    h(`button.icon-btn${extra}`, { type: "button", "aria-label": label, title: label, onclick }, icon(iconName));

  function friendRow(row) {
    return personRow(row.other, [
      iconAction(`Message ${row.other.username}`, "chat-circle", () => onOpenChatWithUser(row.other)),
      iconAction(`Unfriend ${row.other.username}`, "user-minus", async (event) => {
        const button = event.currentTarget;
        const ok = await confirmAction({ title: `Remove ${row.other.username}?`, body: "You will no longer be able to message each other.", confirmLabel: "Unfriend", danger: true });
        if (ok) run("", () => removeFriendship(row.id), "Friend removed.")({ currentTarget: button });
      }),
    ]);
  }

  function renderFriends() {
    const { friends, incoming, outgoing } = friendships;
    setCount("friends", incoming.length);
    const sections = [];
    if (incoming.length) {
      sections.push(
        h("p.list-heading", {}, "Requests"),
        incoming.map((row) =>
          personRow(
            row.other,
            [
              iconAction("Accept", "check", run("", () => acceptFriendRequest(row.id), `You and ${row.other.username} are now friends.`), ".is-active"),
              iconAction("Decline", "x", run("", () => removeFriendship(row.id))),
            ],
            "Wants to be friends"
          )
        )
      );
    }
    if (friends.length) sections.push(h("p.list-heading", {}, `Friends (${friends.length})`), friends.map(friendRow));
    if (outgoing.length) {
      sections.push(
        h("p.list-heading", {}, "Sent"),
        outgoing.map((row) => personRow(row.other, [iconAction("Cancel request", "x", run("", () => removeFriendship(row.id), "Request cancelled."))], "Request pending"))
      );
    }
    if (!sections.length) {
      sections.push(emptyState({ iconName: "users-three", title: "No friends yet", body: "Search for a username above to send a request." }));
    }
    replaceChildren(friendsBody, h("div.list", {}, sections));
    syncPresence(friendsBody, online);
  }

  function relationOf(profileId) {
    const { friends, incoming, outgoing } = friendships;
    const find = (rows) => rows.find((row) => row.other.id === profileId);
    if (find(friends)) return { kind: "friend", row: find(friends) };
    if (find(incoming)) return { kind: "incoming", row: find(incoming) };
    if (find(outgoing)) return { kind: "outgoing", row: find(outgoing) };
    return { kind: "none" };
  }

  let searchToken = 0;
  async function renderSearch(term) {
    const token = ++searchToken;
    replaceChildren(friendsBody, skeletonRows(2));
    try {
      const results = await searchProfiles(term, user.id);
      if (token !== searchToken) return;
      if (!results.length) {
        replaceChildren(friendsBody, emptyState({ iconName: "magnifying-glass", title: "No typists found", body: `Nobody matches "${term}".` }));
        return;
      }
      replaceChildren(
        friendsBody,
        h(
          "div.list",
          {},
          results.map((profile) => {
            const { kind, row } = relationOf(profile.id);
            if (kind === "friend") return friendRow(row);
            if (kind === "incoming") return personRow(profile, [iconAction("Accept", "check", run("", () => acceptFriendRequest(row.id), "Friend added."), ".is-active")], "Wants to be friends");
            if (kind === "outgoing") return personRow(profile, [iconAction("Cancel request", "x", run("", () => removeFriendship(row.id)))], "Request pending");
            return personRow(profile, [iconAction(`Add ${profile.username}`, "user-plus", run("", () => sendFriendRequest(user.id, profile.id), "Friend request sent."))]);
          })
        )
      );
      syncPresence(friendsBody, online);
    } catch (error) {
      replaceChildren(friendsBody, h("p.form-error", {}, errorMessage(error)));
    }
  }

  async function refreshFriends() {
    if (!user) return;
    try {
      friendships = await getFriendships(user.id);
    } catch (error) {
      replaceChildren(friendsBody, h("p.form-error", {}, errorMessage(error)));
      return;
    }
    const term = searchInput.value.trim();
    if (term) renderSearch(term);
    else renderFriends();
  }

  let searchTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const term = searchInput.value.trim();
    searchTimer = setTimeout(() => (term ? renderSearch(term) : renderFriends()), 250);
  });

  let onOpenChatWithUser = () => {};

  return {
    select,
    async setUser(next, { openChatWithUser }) {
      user = next;
      onOpenChatWithUser = openChatWithUser;
      if (!user) {
        for (const tab of TABS) {
          setCount(tab.id, 0);
          if (tab.id === "friends") {
            searchInput.parentElement.hidden = true;
            replaceChildren(friendsBody, emptyState({ iconName: "users-three", title: "Find your friends", body: "Log in to add friends and chat." }));
          } else {
            replaceChildren(
              panels[tab.id],
              emptyState({
                iconName: tab.icon,
                title: "Log in to use this",
                body: "Chats and notifications need an account.",
                action: h("button.btn.btn-primary.btn-sm", { type: "button", onclick: () => openAuthDialog("login") }, "Log in"),
              })
            );
          }
        }
        select(active);
        return;
      }
      searchInput.parentElement.hidden = false;
      select(active);
      await Promise.all([loadChats(), loadInbox(), refreshFriends()]);
      if (active === "inbox") markInboxRead();
    },
    loadChats,
    loadInbox,
    refreshFriends,
    get friends() {
      return friendships.friends;
    },
  };
}
