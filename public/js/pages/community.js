import { $, emptyState, replaceChildren } from "../lib/dom.js";
import { isBackendReady } from "../lib/supabase.js";
import { errorMessage, toast } from "../lib/toast.js";
import { initShell } from "../ui/shell/index.js";
import { createFeed } from "../ui/feed.js";
import { createSidePanel } from "../ui/sidePanel.js";
import { createChatWindow } from "../ui/chatWindow.js";
import { getAuthState, onAuthChange } from "../services/auth.js";
import { openChatWith } from "../services/chat.js";
import { getProfile } from "../services/profiles.js";
import { subscribeToChanges } from "../services/realtime.js";

const postsEl = $("#posts");
const sidePanelEl = $("#side-panel");

const state = await initShell("community");

if (!isBackendReady) {
  postsEl.setAttribute("aria-busy", "false");
  replaceChildren(
    postsEl,
    emptyState({ iconName: "cloud-slash", title: "Community unavailable", body: "The server is not configured, so only guest typing tests work right now." })
  );
  sidePanelEl.hidden = true;
} else {
  const feed = createFeed({
    composerSlot: $("#composer-slot"),
    list: postsEl,
    loadMoreButton: $("#load-more-btn"),
    newPostsButton: $("#new-posts-btn"),
  });

  let sidePanel;
  const chat = createChatWindow({ onActivity: () => sidePanel.loadChats() });

  async function openChatWithUser(other) {
    const { user } = getAuthState();
    if (!user) return;
    try {
      const chatId = await openChatWith(other.id);
      await chat.open({ id: chatId, other }, user);
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  sidePanel = createSidePanel(sidePanelEl, {
    onOpenChat: (target) => chat.open(target, getAuthState().user),
  });

  let stopFeed = () => {};

  async function start({ user, profile }) {
    stopFeed();
    chat.close();
    const viewer = user ? { id: user.id, profile } : null;
    await Promise.all([feed.setUser(viewer), sidePanel.setUser(user, { openChatWithUser })]);

    // One websocket channel carries every live update this page needs.
    const specs = [
      { table: "posts" },
      { table: "likes" },
      { table: "comments" },
    ];
    if (user) {
      specs.push(
        { table: "messages", event: "INSERT" },
        { table: "notifications", filter: `recipient_id=eq.${user.id}` },
        { table: "friendships" }
      );
    }
    stopFeed = subscribeToChanges("community", specs, async (change) => {
      if (change.table === "messages") {
        await chat.receive(change.new);
        sidePanel.loadChats();
      } else if (change.table === "notifications") {
        sidePanel.loadInbox();
      } else if (change.table === "friendships") {
        sidePanel.refreshFriends();
      } else {
        feed.handleChange(change);
      }
    });

    // Deep links: ?chat=<userId> from a profile, #inbox from the header bell.
    if (location.hash === "#inbox") sidePanel.select("inbox");
    const chatWith = new URLSearchParams(location.search).get("chat");
    if (user && chatWith) {
      history.replaceState(null, "", location.pathname + location.hash);
      const other = await getProfile(chatWith).catch(() => null);
      if (other) openChatWithUser(other);
    }
  }

  await start(state);

  let shownUserId = state.user?.id ?? null;
  onAuthChange((next) => {
    if ((next.user?.id ?? null) === shownUserId) return;
    shownUserId = next.user?.id ?? null;
    start(next);
  });

  window.addEventListener("hashchange", () => {
    if (location.hash === "#inbox") sidePanel.select("inbox");
  });
}
