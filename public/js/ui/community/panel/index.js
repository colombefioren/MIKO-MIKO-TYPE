// Community side panel with three tabs: chats, inbox and friends.
import { h, emptyState, replaceChildren } from "../../../lib/dom.js";
import { openAuthDialog } from "../../auth/dialog.js";
import { watchPresence } from "../../common/presence.js";
import { createTabs } from "../../common/tabs.js";
import { createChatsTab } from "./chats.js";
import { createFriendsTab } from "./friends.js";
import { createInboxTab } from "./inbox.js";

export function createSidePanel(container, { onOpenChat, onMessage }) {
  let user = null;
  const counts = {
    chats: h("span.count-pill", { hidden: true }),
    inbox: h("span.count-pill", { hidden: true }),
    friends: h("span.count-pill", { hidden: true }),
  };
  const setCount = (id) => (value) => {
    counts[id].textContent = value;
    counts[id].hidden = !value;
  };

  const tabs = createTabs({
    label: "Community panels",
    idPrefix: "side-",
    items: [
      { id: "chats", label: "Chats", icon: "chats-circle", badge: counts.chats },
      { id: "inbox", label: "Inbox", icon: "bell", badge: counts.inbox },
      { id: "friends", label: "Friends", icon: "users-three", badge: counts.friends },
    ],
    onSelect: (id) => {
      if (id === "inbox" && user) inbox.markRead();
    },
  });
  container.replaceChildren(...tabs.elements);
  watchPresence(container);

  const loadChats = createChatsTab({ panel: tabs.panels.chats, setCount: setCount("chats"), onOpenChat, onFindFriends: () => tabs.select("friends") });
  const inbox = createInboxTab({ panel: tabs.panels.inbox, setCount: setCount("inbox") });
  const friends = createFriendsTab({ panel: tabs.panels.friends, setCount: setCount("friends"), onMessage });

  function showGuest() {
    for (const id of ["chats", "inbox"]) {
      setCount(id)(0);
      replaceChildren(
        tabs.panels[id],
        emptyState({
          iconName: id === "chats" ? "chats-circle" : "bell",
          title: "Log in to use this",
          body: "Chats and notifications need an account.",
          action: h("button.btn.btn-primary.btn-sm", { type: "button", onclick: () => openAuthDialog("login") }, "Log in"),
        })
      );
    }
    setCount("friends")(0);
  }

  return {
    select: (id) => tabs.select(id),
    async setUser(next) {
      user = next;
      if (!user) showGuest();
      await Promise.all([user && loadChats(user), user && inbox.load(user), friends.load(user)]);
      if (user && tabs.panels.inbox.hidden === false) inbox.markRead();
    },
    loadChats: () => user && loadChats(user),
    loadInbox: () => user && inbox.load(user),
    refreshFriends: () => friends.refresh(),
  };
}
