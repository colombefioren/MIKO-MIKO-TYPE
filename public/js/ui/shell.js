// Shared page chrome: header, navigation, account menu, theme toggle and unread badge.
import { h, icon, replaceChildren } from "../lib/dom.js";
import { avatar } from "../lib/avatar.js";
import { isBackendReady } from "../lib/supabase.js";
import { currentTheme, onThemeChange, toggleTheme } from "../lib/theme.js";
import { errorMessage, toast } from "../lib/toast.js";
import { getAuthState, initAuth, onAuthChange, signOut } from "../services/auth.js";
import { countUnreadNotifications } from "../services/notifications.js";
import { countUnreadMessages } from "../services/chat.js";
import { joinPresence, leavePresence, subscribeToChanges } from "../services/realtime.js";
import { openAuthDialog } from "./authDialog.js";
import { createSidebar } from "./sidebar.js";

const ROOT = new URL("../../../", import.meta.url);
export const pageUrl = (path) => new URL(path, ROOT).href;
export const profileUrl = (userId) => pageUrl(`pages/profile.html?id=${encodeURIComponent(userId)}`);

// Same pages, labels and icons as the original Miko-Miko sidebar.
const NAV = [
  { id: "type", label: "Type", icon: "keyboard", href: "index.html" },
  { id: "profile", label: "Profile", icon: "horse", href: "pages/profile.html" },
  { id: "community", label: "Community", icon: "users-three", href: "pages/friends.html" },
  { id: "boards", label: "Boards", icon: "medal", href: "pages/boards.html" },
];

let badgeEl;
let stopBadgeFeed = () => {};

function brand() {
  return h(
    "a.brand",
    { href: pageUrl("index.html"), "aria-label": "Miko-Miko Type home" },
    h("img.brand-mark", { src: pageUrl("public/assets/images/mikomiko-mark.webp"), alt: "", width: 34, height: 42 }),
    h("span.brand-name", {}, "Miko-Miko", h("span.brand-type", {}, "Type"))
  );
}

function nav(active) {
  return h(
    "nav.site-nav",
    { "aria-label": "Main" },
    NAV.map((item) =>
      h(
        "a.nav-link",
        { href: pageUrl(item.href), "aria-current": item.id === active ? "page" : undefined },
        icon(item.icon),
        h("span", {}, item.label)
      )
    )
  );
}

function themeButton() {
  const button = h("button.icon-btn", { type: "button", onclick: toggleTheme });
  const sync = () => {
    const dark = currentTheme() === "dark";
    button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    replaceChildren(button, icon(dark ? "sun" : "moon"));
  };
  sync();
  onThemeChange(sync);
  return button;
}

function userMenu(profile) {
  const menu = h(
    "div.menu",
    { popover: "auto", id: "account-menu" },
    h("div.menu-header", {}, h("strong", {}, profile?.username ?? "Account")),
    h("a.menu-item", { href: profileUrl(profile?.id ?? "") }, icon("user-circle"), "Your profile"),
    h(
      "button.menu-item",
      {
        type: "button",
        onclick: async () => {
          try {
            await signOut();
            toast("You are logged out.", "info");
          } catch (error) {
            toast(errorMessage(error), "error");
          }
        },
      },
      icon("sign-out"),
      "Log out"
    )
  );
  const trigger = h(
    "button.account-btn",
    { type: "button", popovertarget: "account-menu", "aria-label": `Account menu for ${profile?.username ?? "you"}` },
    avatar(profile, 32),
    h("span.account-name", {}, profile?.username ?? "")
  );
  return [trigger, menu];
}

async function refreshBadge(userId) {
  if (!badgeEl) return;
  try {
    const [notifications, messages] = await Promise.all([countUnreadNotifications(userId), countUnreadMessages(userId)]);
    const total = notifications + messages;
    badgeEl.textContent = total > 99 ? "99+" : String(total);
    badgeEl.hidden = total === 0;
    badgeEl.parentElement.setAttribute("aria-label", total ? `Inbox, ${total} unread` : "Inbox");
  } catch (error) {
    console.error("Could not count unread items", error);
  }
}

let badgeTimer;
export function scheduleBadgeRefresh() {
  const { user } = getAuthState();
  if (!user) return;
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => refreshBadge(user.id), 250);
}

function renderActions(container, { user, profile }) {
  stopBadgeFeed();
  badgeEl = null;

  if (!user) {
    leavePresence();
    replaceChildren(
      container,
      themeButton(),
      h("button.btn.btn-primary.btn-sm", { type: "button", onclick: () => openAuthDialog("login") }, "Log in")
    );
    return;
  }

  badgeEl = h("span.badge", { hidden: true });
  const inbox = h("a.icon-btn.has-badge", { href: pageUrl("pages/friends.html#inbox"), "aria-label": "Inbox" }, icon("bell"), badgeEl);
  replaceChildren(container, themeButton(), inbox, ...userMenu(profile ?? { id: user.id, username: user.email }));

  joinPresence(user.id);
  refreshBadge(user.id);
  stopBadgeFeed = subscribeToChanges(
    "badge",
    [
      { table: "notifications", filter: `recipient_id=eq.${user.id}` },
      { table: "messages", event: "INSERT" },
    ],
    scheduleBadgeRefresh
  );
}

// Renders the header into <header data-shell> and resolves with the auth state.
export async function initShell(active) {
  const header = document.querySelector("[data-shell]");
  const actions = h("div.header-actions");
  header.classList.add("site-header");
  replaceChildren(header, h("div.header-inner", {}, brand(), nav(active), actions));
  // The typing page starts with the sidebar collapsed so the text gets the room, like before.
  header.before(createSidebar({ items: NAV, active, pageUrl, collapsedByDefault: active === "type" }));

  if (!isBackendReady) {
    renderActions(actions, { user: null, profile: null });
    return getAuthState();
  }

  const state = await initAuth();
  // Token refreshes also notify listeners; only re-render when what is shown changes.
  const keyOf = ({ user, profile }) => [user?.id, profile?.username, profile?.avatar_url].join("|");
  let shownKey = keyOf(state);
  renderActions(actions, state);
  onAuthChange((next) => {
    if (keyOf(next) === shownKey) return;
    shownKey = keyOf(next);
    renderActions(actions, next);
  });
  return state;
}
