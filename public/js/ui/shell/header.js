// Top bar: brand and tab bar on phones, theme toggle, inbox and account menu everywhere.
// This module stays free of Supabase imports so the header can be drawn before the SDK loads.
import { h, icon, replaceChildren } from "../../lib/dom.js";
import { avatar } from "../../lib/avatar.js";
import { assetUrl, NAV, pageUrl, profileUrl } from "../../lib/routes.js";
import { currentTheme, onThemeChange, toggleTheme } from "../../lib/theme.js";

function brand() {
  return h(
    "a.brand",
    { href: pageUrl("index.html"), "aria-label": "Miko-Miko Type home" },
    h("img.brand-mark", { src: assetUrl("mikomiko-mark.webp"), alt: "", width: 34, height: 42 }),
    h("span.brand-name", {}, "Miko-Miko", h("span.brand-type", {}, "Type"))
  );
}

// Bottom tab bar on phones; hidden on larger screens where the sidebar takes over.
function tabBar(active) {
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

// Heavy modules (auth, realtime, dialogs) load on demand so the header never waits on them.
async function logOut() {
  const [{ signOut }, { errorMessage, toast }] = await Promise.all([import("../../services/auth.js"), import("../../lib/toast.js")]);
  try {
    await signOut();
    toast("You are logged out.", "info");
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function openLogin() {
  const { openAuthDialog } = await import("../auth/dialog.js");
  openAuthDialog("login");
}

function accountMenu(account) {
  const menu = h(
    "div.menu",
    { popover: "auto", id: "account-menu" },
    h("div.menu-header", {}, h("strong", {}, account.username)),
    h("a.menu-item", { href: profileUrl(account.id) }, icon("user-circle"), "Your profile"),
    h("button.menu-item", { type: "button", onclick: logOut }, icon("sign-out"), "Log out")
  );
  const trigger = h(
    "button.account-btn",
    { type: "button", popovertarget: "account-menu", "aria-label": `Account menu for ${account.username}` },
    avatar(account, 32),
    h("span.account-name", {}, account.username)
  );
  return [trigger, menu];
}

export function createHeader(root, active) {
  const actions = h("div.header-actions");
  const inbox = h("a.icon-btn.has-badge", { href: pageUrl("pages/friends.html#inbox"), "aria-label": "Inbox" }, icon("bell"));
  let stopLive = () => {};
  let shownKey = null;
  root.classList.add("site-header");
  replaceChildren(root, h("div.header-inner", {}, brand(), tabBar(active), actions));

  return {
    // Draws the guest or account controls; skipped when nothing visible changed.
    show(account) {
      const key = account ? [account.id, account.username, account.avatar_url].join("|") : "guest";
      if (key === shownKey) return;
      shownKey = key;
      stopLive();
      stopLive = () => {};
      if (!account) replaceChildren(actions, themeButton(), h("button.btn.btn-primary.btn-sm", { type: "button", onclick: openLogin }, "Log in"));
      else replaceChildren(actions, themeButton(), inbox, ...accountMenu(account));
    },
    // Starts the live parts once the session is confirmed: unread badge and online presence.
    async goLive(userId) {
      const [{ createInboxBadge }, { joinPresence }] = await Promise.all([import("./inboxBadge.js"), import("../../services/realtime.js")]);
      stopLive();
      const live = createInboxBadge(userId, inbox);
      joinPresence(userId);
      stopLive = live.stop;
    },
    async goOffline() {
      stopLive();
      stopLive = () => {};
      const { leavePresence } = await import("../../services/realtime.js");
      leavePresence();
    },
  };
}
