// Top bar: brand and tab bar on phones, theme toggle, inbox and account menu everywhere.
import { h, icon, replaceChildren } from "../../lib/dom.js";
import { avatar } from "../../lib/avatar.js";
import { assetUrl, NAV, pageUrl, profileUrl } from "../../lib/routes.js";
import { currentTheme, onThemeChange, toggleTheme } from "../../lib/theme.js";
import { errorMessage, toast } from "../../lib/toast.js";
import { signOut } from "../../services/auth.js";
import { joinPresence, leavePresence } from "../../services/realtime.js";
import { openAuthDialog } from "../auth/dialog.js";
import { createInboxBadge } from "./inboxBadge.js";

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

async function logOut() {
  try {
    await signOut();
    toast("You are logged out.", "info");
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

function accountMenu(profile) {
  const menu = h(
    "div.menu",
    { popover: "auto", id: "account-menu" },
    h("div.menu-header", {}, h("strong", {}, profile.username)),
    h("a.menu-item", { href: profileUrl(profile.id) }, icon("user-circle"), "Your profile"),
    h("button.menu-item", { type: "button", onclick: logOut }, icon("sign-out"), "Log out")
  );
  const trigger = h(
    "button.account-btn",
    { type: "button", popovertarget: "account-menu", "aria-label": `Account menu for ${profile.username}` },
    avatar(profile, 32),
    h("span.account-name", {}, profile.username)
  );
  return [trigger, menu];
}

export function createHeader(root, active) {
  const actions = h("div.header-actions");
  let stopBadge = () => {};
  root.classList.add("site-header");
  replaceChildren(root, h("div.header-inner", {}, brand(), tabBar(active), actions));

  return {
    // Shows the guest or signed-in controls for the given auth state.
    render({ user, profile }) {
      stopBadge();
      stopBadge = () => {};
      if (!user) {
        leavePresence();
        replaceChildren(actions, themeButton(), h("button.btn.btn-primary.btn-sm", { type: "button", onclick: () => openAuthDialog("login") }, "Log in"));
        return;
      }
      const inbox = createInboxBadge(user.id);
      stopBadge = inbox.stop;
      replaceChildren(actions, themeButton(), inbox.link, ...accountMenu(profile ?? { id: user.id, username: user.email }));
      joinPresence(user.id);
    },
  };
}
