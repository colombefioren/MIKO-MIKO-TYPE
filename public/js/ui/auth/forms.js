// Login and sign-up forms with inline errors and busy states.
import { h, setBusy } from "../../lib/dom.js";
import { errorMessage, toast } from "../../lib/toast.js";
import { signIn, signUp, USERNAME_PATTERN } from "../../services/auth.js";
import { field, formError, showError } from "./field.js";

export function buildLoginForm(close) {
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

export function buildSignupForm(close, showLogin) {
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
