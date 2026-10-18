import { h, icon } from "./dom.js";

const ICONS = { success: "check-circle", error: "warning-circle", info: "info" };
let region;

function getRegion() {
  if (!region) {
    region = h("div.toast-region", { role: "status", "aria-live": "polite" });
    document.body.append(region);
  }
  return region;
}

export function toast(message, type = "info", timeout = 4000) {
  const item = h("div.toast", { dataset: { type } }, icon(ICONS[type] ?? ICONS.info), h("span", {}, message));
  getRegion().append(item);
  setTimeout(() => {
    item.classList.add("is-leaving");
    item.addEventListener("animationend", () => item.remove(), { once: true });
    // Fallback when animations are disabled.
    setTimeout(() => item.remove(), 400);
  }, timeout);
}

// Turns Supabase and network errors into short, readable messages.
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  const message = error?.message ?? "";
  if (/failed to fetch|network/i.test(message)) return "Network error. Check your connection.";
  if (/invalid login credentials/i.test(message)) return "Wrong email or password.";
  if (/email not confirmed/i.test(message)) return "Confirm your email first, then log in.";
  if (/already registered/i.test(message)) return "An account with this email already exists.";
  if (/duplicate key.*username|profiles_username_lower_idx/i.test(message)) return "That username is taken.";
  if (/row-level security/i.test(message)) return "You are not allowed to do that.";
  return message || fallback;
}
