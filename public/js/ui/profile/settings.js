// Settings tab on your own profile: username, bio and password.
import { h, setBusy } from "../../lib/dom.js";
import { errorMessage, toast } from "../../lib/toast.js";
import { changePassword, USERNAME_PATTERN } from "../../services/auth.js";
import { updateProfile } from "../../services/profiles.js";

function charCounter(field, max) {
  const counter = h("span.composer-count", { "aria-live": "polite" });
  const update = () => (counter.textContent = `${field.value.length} / ${max}`);
  field.addEventListener("input", update);
  update();
  return counter;
}

// Wires a form whose submit saves something, with busy state and toasts.
function onSave(form, busyLabel, save) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const restore = setBusy(form.querySelector("[type=submit]"), busyLabel);
    try {
      await save();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      restore();
    }
  });
}

function usernameForm(user, profile, onChange) {
  const input = h("input.input", {
    id: "settings-username",
    value: profile.username,
    required: true,
    minlength: 3,
    maxlength: 24,
    pattern: "[A-Za-z0-9_.\\-]{3,24}",
    autocomplete: "username",
    "aria-describedby": "settings-username-hint",
  });
  const form = h(
    "form.stack",
    {},
    h("h2.section-title", {}, "Username"),
    h(
      "div.field",
      {},
      h("label.field-label", { for: "settings-username" }, "Username"),
      h("div.inline-form", {}, input, h("button.btn.btn-primary", { type: "submit" }, "Save")),
      h("p.field-hint", { id: "settings-username-hint" }, "Letters, numbers, dot, dash or underscore. Shown to everyone.")
    )
  );
  onSave(form, "Saving", async () => {
    const username = input.value.trim();
    if (!USERNAME_PATTERN.test(username)) throw new Error("Use 3 to 24 letters, numbers, dots, dashes or underscores.");
    onChange(await updateProfile(user.id, { username }));
    toast("Username updated.", "success");
  });
  return form;
}

function bioForm(user, profile, onChange) {
  const input = h("textarea.textarea", { id: "settings-bio", maxlength: 280, rows: 3 }, profile.bio ?? "");
  const form = h(
    "form.stack",
    {},
    h("h2.section-title", {}, "Bio"),
    h("div.field", {}, h("label.field-label", { for: "settings-bio" }, "About you"), input),
    h("div.composer-footer", {}, charCounter(input, 280), h("button.btn.btn-primary", { type: "submit" }, "Save bio"))
  );
  onSave(form, "Saving", async () => {
    onChange(await updateProfile(user.id, { bio: input.value.trim() }));
    toast("Bio updated.", "success");
  });
  return form;
}

function passwordForm(user) {
  const field = (id, label, autocomplete) =>
    h(
      "div.field",
      {},
      h("label.field-label", { for: id }, label),
      h("input.input", { id, name: id, type: "password", required: true, autocomplete, minlength: id === "current-password" ? undefined : 8 })
    );
  const error = h("p.form-error", { role: "alert", hidden: true });
  const form = h(
    "form.stack",
    {},
    h("h2.section-title", {}, "Password"),
    h("div.field", {}, h("label.field-label", { for: "settings-email" }, "Email"), h("input.input", { id: "settings-email", type: "email", value: user.email, disabled: true })),
    field("current-password", "Current password", "current-password"),
    field("new-password", "New password", "new-password"),
    field("confirm-password", "Confirm new password", "new-password"),
    error,
    h("div", {}, h("button.btn.btn-primary", { type: "submit" }, "Update password"))
  );

  // Errors stay inline under the form instead of a toast.
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const { elements } = form;
    const current = elements["current-password"].value;
    const next = elements["new-password"].value;
    const fail = (message) => {
      error.textContent = message;
      error.hidden = false;
    };
    error.hidden = true;
    if (next.length < 8) return fail("Use at least 8 characters for the new password.");
    if (next !== elements["confirm-password"].value) return fail("The new passwords do not match.");
    if (next === current) return fail("Pick a password different from the current one.");

    const restore = setBusy(form.querySelector("[type=submit]"), "Updating");
    try {
      await changePassword(current, next);
      form.reset();
      elements["settings-email"].value = user.email;
      toast("Password updated.", "success");
    } catch (err) {
      fail(errorMessage(err));
    } finally {
      restore();
    }
  });
  return form;
}

export function settingsSection(user, profile, onChange) {
  return h(
    "div.settings-grid",
    {},
    h("div.card", {}, usernameForm(user, profile, onChange)),
    h("div.card", {}, bioForm(user, profile, onChange)),
    h("div.card", {}, passwordForm(user))
  );
}
