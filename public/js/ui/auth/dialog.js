// Login and sign-up dialog: mascot panel on the left, forms on the right.
import { h, icon } from "../../lib/dom.js";
import { assetUrl } from "../../lib/routes.js";
import { isBackendReady } from "../../lib/supabase.js";
import { buildLoginForm, buildSignupForm } from "./forms.js";

let dialog;

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Log in to save your results and catch up with friends.",
    switchText: "New to Miko-Miko Type?",
    switchAction: "Create an account",
  },
  signup: {
    title: "Create your account",
    subtitle: "Pick a username. It is how your friends will find you.",
    switchText: "Already have an account?",
    switchAction: "Log in",
  },
};

function build() {
  const close = () => dialog.close();
  const tabs = {};
  const panels = {};
  const title = h("h2.auth-title", { id: "auth-title" });
  const subtitle = h("p.auth-subtitle");
  const switchText = h("span");
  const switchButton = h("button.link-btn", { type: "button" });
  let current = "login";

  const select = (mode) => {
    current = mode;
    for (const [name, tab] of Object.entries(tabs)) {
      const active = name === mode;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[name].hidden = !active;
    }
    title.textContent = COPY[mode].title;
    subtitle.textContent = COPY[mode].subtitle;
    switchText.textContent = COPY[mode].switchText;
    switchButton.textContent = COPY[mode].switchAction;
    panels[mode].querySelector("input")?.focus();
  };
  switchButton.addEventListener("click", () => select(current === "login" ? "signup" : "login"));

  for (const [mode, label] of [["login", "Log in"], ["signup", "Sign up"]]) {
    tabs[mode] = h(
      "button.switch-option",
      { type: "button", role: "tab", id: `auth-tab-${mode}`, "aria-controls": `auth-panel-${mode}`, onclick: () => select(mode) },
      label
    );
  }

  panels.login = h("div", { role: "tabpanel", id: "auth-panel-login", "aria-labelledby": "auth-tab-login" }, buildLoginForm(close));
  panels.signup = h(
    "div",
    { role: "tabpanel", id: "auth-panel-signup", "aria-labelledby": "auth-tab-signup" },
    buildSignupForm(close, () => select("login"))
  );

  const logoSrc = assetUrl("mikomiko-logo.webp");

  const main = isBackendReady
    ? [
        h("img.auth-logo-small", { src: logoSrc, alt: "", width: 120, height: 95 }),
        title,
        subtitle,
        h("div.switch", { role: "tablist", "aria-label": "Account" }, tabs.login, tabs.signup),
        panels.login,
        panels.signup,
        h("p.auth-switch", {}, switchText, " ", switchButton),
      ]
    : [
        h("img.auth-logo-small", { src: logoSrc, alt: "", width: 120, height: 95 }),
        h("h2.auth-title", { id: "auth-title" }, "Accounts are offline"),
        h(
          "p.notice",
          {},
          icon("cloud-slash"),
          h("span", {}, "The server is not configured. You can still take typing tests as a guest.")
        ),
      ];

  dialog = h(
    "dialog.dialog.auth-dialog",
    { "aria-labelledby": "auth-title" },
    h(
      "div.auth-shell",
      {},
      h(
        "aside.auth-brand",
        { "aria-hidden": "true" },
        h("img.auth-logo", { src: logoSrc, alt: "", width: 240, height: 189 }),
        h("p.auth-brand-title", {}, "Type with friends."),
        h("p.auth-brand-body", {}, "Save every run, climb the leaderboard and chat while you practise.")
      ),
      h(
        "section.auth-main",
        {},
        h("button.icon-btn.auth-close", { type: "button", "aria-label": "Close", onclick: close }, icon("x")),
        ...main
      )
    )
  );

  // Clicking the backdrop closes the dialog.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  document.body.append(dialog);
  return isBackendReady ? select : null;
}

let selectMode;

export function openAuthDialog(mode = "login") {
  if (!dialog) selectMode = build();
  dialog.showModal();
  selectMode?.(mode);
}
