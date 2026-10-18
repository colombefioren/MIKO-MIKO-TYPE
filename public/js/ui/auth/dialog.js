import { h, icon, setBusy } from "../../lib/dom.js";
import { assetUrl } from "../../lib/routes.js";
import { isBackendReady } from "../../lib/supabase.js";
import { errorMessage, toast } from "../../lib/toast.js";
import { signIn, signUp, USERNAME_PATTERN } from "../../services/auth.js";

let dialog;

function field({ id, label, type = "text", autocomplete, hint, iconName, ...rest }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const input = h("input.input.has-icon", { id, name: id, type, autocomplete, required: true, "aria-describedby": hintId, ...rest });
  let toggle = null;
  if (type === "password") {
    toggle = h("button.input-action", { type: "button", "aria-label": "Show password", "aria-pressed": "false" }, icon("eye"));
    toggle.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      toggle.setAttribute("aria-pressed", String(show));
      toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
      toggle.replaceChildren(icon(show ? "eye-slash" : "eye"));
      input.focus();
    });
  }
  return h(
    "div.field",
    {},
    h("label.field-label", { for: id }, label),
    h("div.input-wrap", {}, icon(iconName, "input-icon"), input, toggle),
    hint && h("p.field-hint", { id: hintId }, hint)
  );
}

function formError() {
  return h("p.form-error", { role: "alert", hidden: true });
}

function showError(el, message) {
  el.textContent = message;
  el.hidden = !message;
}

function buildLoginForm(close) {
  const error = formError();
  const form = h(
    "form.stack",
    { novalidate: false },
    field({ id: "login-email", label: "Email", type: "email", autocomplete: "email", iconName: "envelope-simple", placeholder: "you@example.com" }),
    field({ id: "login-password", label: "Password", type: "password", autocomplete: "current-password", iconName: "lock-simple" }),
    error,
    h("button.btn.btn-primary.btn-block.btn-lg", { type: "submit" }, "Log in")
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError(error, "");
    const restore = setBusy(form.querySelector("[type=submit]"), "Logging in");
    try {
      await signIn(form.elements["login-email"].value.trim(), form.elements["login-password"].value);
      form.reset();
      close();
      toast("Welcome back.", "success");
    } catch (err) {
      showError(error, errorMessage(err));
    } finally {
      restore();
    }
  });
  return form;
}

function buildSignupForm(close, showLogin) {
  const error = formError();
  const form = h(
    "form.stack",
    {},
    field({
      id: "signup-username",
      label: "Username",
      autocomplete: "username",
      iconName: "at",
      placeholder: "mimi_types",
      // Escaped dash: HTML patterns compile with the `v` flag.
      pattern: "[A-Za-z0-9_.\\-]{3,24}",
      minlength: 3,
      maxlength: 24,
      hint: "3 to 24 characters: letters, numbers, dot, dash or underscore.",
    }),
    field({ id: "signup-email", label: "Email", type: "email", autocomplete: "email", iconName: "envelope-simple", placeholder: "you@example.com" }),
    field({
      id: "signup-password",
      label: "Password",
      type: "password",
      autocomplete: "new-password",
      iconName: "lock-simple",
      minlength: 8,
      hint: "At least 8 characters.",
    }),
    error,
    h("button.btn.btn-primary.btn-block.btn-lg", { type: "submit" }, "Create account")
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError(error, "");
    const username = form.elements["signup-username"].value.trim();
    const email = form.elements["signup-email"].value.trim();
    const password = form.elements["signup-password"].value;

    if (!USERNAME_PATTERN.test(username)) return showError(error, "Choose a username with 3 to 24 letters, numbers, dots, dashes or underscores.");
    if (password.length < 8) return showError(error, "Use a password with at least 8 characters.");

    const restore = setBusy(form.querySelector("[type=submit]"), "Creating account");
    try {
      const needsConfirmation = await signUp(email, password, username);
      form.reset();
      if (needsConfirmation) {
        showLogin();
        toast("Check your inbox to confirm your email, then log in.", "info", 8000);
      } else {
        close();
        toast(`Welcome to Miko-Miko Type, ${username}.`, "success");
      }
    } catch (err) {
      showError(error, errorMessage(err));
    } finally {
      restore();
    }
  });
  return form;
}

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
