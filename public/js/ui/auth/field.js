// Form field with a leading icon, optional hint, and a show/hide toggle for passwords.
import { h, icon } from "../../lib/dom.js";

export function field({ id, label, type = "text", autocomplete, hint, iconName, ...rest }) {
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

export function formError() {
  return h("p.form-error", { role: "alert", hidden: true });
}

export function showError(el, message) {
  el.textContent = message;
  el.hidden = !message;
}
