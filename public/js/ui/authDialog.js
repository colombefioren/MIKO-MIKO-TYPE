import { h, icon, setBusy } from "../lib/dom.js";
import { isBackendReady } from "../lib/supabase.js";
import { errorMessage, toast } from "../lib/toast.js";
import { signIn, signUp, USERNAME_PATTERN } from "../services/auth.js";

let dialog;

function field({ id, label, type = "text", autocomplete, hint, ...rest }) {
  const hintId = hint ? `${id}-hint` : undefined;
  return h(
    "div.field",
    {},
    h("label.field-label", { for: id }, label),
    h("input.input", { id, name: id, type, autocomplete, required: true, "aria-describedby": hintId, ...rest }),
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
    field({ id: "login-email", label: "Email", type: "email", autocomplete: "email" }),
    field({ id: "login-password", label: "Password", type: "password", autocomplete: "current-password" }),
    error,
    h("button.btn.btn-primary.btn-block", { type: "submit" }, "Log in")
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
      // Escaped dash: HTML patterns compile with the `v` flag.
      pattern: "[A-Za-z0-9_.\\-]{3,24}",
      minlength: 3,
      maxlength: 24,
      hint: "3 to 24 characters: letters, numbers, dot, dash or underscore.",
    }),
    field({ id: "signup-email", label: "Email", type: "email", autocomplete: "email" }),
    field({
      id: "signup-password",
      label: "Password",
      type: "password",
      autocomplete: "new-password",
      minlength: 8,
      hint: "At least 8 characters.",
    }),
    error,
    h("button.btn.btn-primary.btn-block", { type: "submit" }, "Create account")
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
        toast(`Welcome to Typhoon, ${username}.`, "success");
      }
    } catch (err) {
      showError(error, errorMessage(err));
    } finally {
      restore();
    }
  });
  return form;
}

function build() {
  const close = () => dialog.close();
  const tabs = {};
  const panels = {};

  const select = (mode) => {
    for (const [name, tab] of Object.entries(tabs)) {
      const active = name === mode;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[name].hidden = !active;
    }
    panels[mode].querySelector("input")?.focus();
  };

  for (const [mode, label] of [["login", "Log in"], ["signup", "Sign up"]]) {
    tabs[mode] = h(
      "button.tab",
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

  const body = isBackendReady
    ? [h("div.tabs", { role: "tablist", "aria-label": "Account" }, tabs.login, tabs.signup), panels.login, panels.signup]
    : [
        h(
          "p.notice",
          {},
          icon("cloud-slash"),
          h("span", {}, "Accounts are unavailable because the server is not configured. You can still take typing tests as a guest.")
        ),
      ];

  dialog = h(
    "dialog.dialog",
    { "aria-labelledby": "auth-title" },
    h(
      "div.dialog-header",
      {},
      h("h2.dialog-title", { id: "auth-title" }, "Your Typhoon account"),
      h("button.icon-btn", { type: "button", "aria-label": "Close", onclick: close }, icon("x"))
    ),
    ...body
  );

  // Clicking the backdrop closes the dialog.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  document.body.append(dialog);
  return select;
}

let selectMode;

export function openAuthDialog(mode = "login") {
  if (!dialog) selectMode = build();
  dialog.showModal();
  selectMode?.(mode);
}
