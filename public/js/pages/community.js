import { $, emptyState, replaceChildren } from "../lib/dom.js";
import { isBackendReady } from "../lib/supabase.js";
import { errorMessage, toast } from "../lib/toast.js";
import { getAuthState, onAuthChange } from "../services/auth.js";
import { openChatWith } from "../services/chat.js";
import { getProfile } from "../services/profiles.js";
import { subscribeToChanges } from "../services/realtime.js";
import { createChatWindow } from "../ui/community/chatWindow.js";
import { createFeed } from "../ui/community/feed/index.js";
import { createSidePanel } from "../ui/community/panel/index.js";
import { initShell } from "../ui/shell/index.js";

const postsEl = $("#posts");
const sidePanelEl = $("#side-panel");

function showUnavailable() {
  postsEl.setAttribute("aria-busy", "false");
  replaceChildren(
    postsEl,
    emptyState({ iconName: "cloud-slash", title: "Community unavailable", body: "The server is not configured, so only guest typing tests work right now." })
  );
  sidePanelEl.hidden = true;
}

function startCommunity(initialState) {
  const feed = createFeed({
    composerSlot: $("#composer-slot"),
    list: postsEl,
    loadMoreButton: $("#load-more-btn"),
    newPostsButton: $("#new-posts-btn"),
  });
  const chat = createChatWindow({ onActivity: () => sidePanel.loadChats() });

  async function openChatWithUser(other) {
    const { user } = getAuthState();
    if (!user) return;
    try {
      await chat.open({ id: await openChatWith(other.id), other }, user);
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  const sidePanel = createSidePanel(sidePanelEl, {
    onOpenChat: (target) => chat.open(target, getAuthState().user),
    onMessage: openChatWithUser,
  });

  // One websocket channel carries every live update this page needs.
  function subscribe(user) {
    const specs = [{ table: "posts" }, { table: "likes" }, { table: "comments" }];
    if (user) {
      specs.push(
        { table: "messages", event: "INSERT" },
        { table: "notifications", filter: `recipient_id=eq.${user.id}` },
        { table: "friendships" }
      );
    }
    return subscribeToChanges("community", specs, async (change) => {
      if (change.table === "messages") {
        await chat.receive(change.new);
        sidePanel.loadChats();
      } else if (change.table === "notifications") sidePanel.loadInbox();
      else if (change.table === "friendships") sidePanel.refreshFriends();
      else feed.handleChange(change);
    });
  }

  // Deep links: ?chat=<userId> from a profile, #inbox from the header bell.
  async function followDeepLinks(user) {
    if (location.hash === "#inbox") sidePanel.select("inbox");
    const chatWith = new URLSearchParams(location.search).get("chat");
    if (!user || !chatWith) return;
    history.replaceState(null, "", location.pathname + location.hash);
    const other = await getProfile(chatWith).catch(() => null);
    if (other) openChatWithUser(other);
  }

  let stop = () => {};
  async function start({ user, profile }) {
    stop();
    chat.close();
    await Promise.all([feed.setUser(user ? { id: user.id, profile } : null), sidePanel.setUser(user)]);
    stop = subscribe(user);
    await followDeepLinks(user);
  }

  start(initialState);

  let shownUserId = initialState.user?.id ?? null;
  onAuthChange((next) => {
    if ((next.user?.id ?? null) === shownUserId) return;
    shownUserId = next.user?.id ?? null;
    start(next);
  });
  window.addEventListener("hashchange", () => {
    if (location.hash === "#inbox") sidePanel.select("inbox");
  });
}

const state = await initShell("community");
if (isBackendReady) startCommunity(state);
else showUnavailable();
