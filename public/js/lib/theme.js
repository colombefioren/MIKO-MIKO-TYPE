const KEY = "typhoon:theme";
const media = matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set();

export function currentTheme() {
  return document.documentElement.dataset.theme || (media.matches ? "dark" : "light");
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Preference only lasts for this page view when storage is blocked.
  }
  for (const listener of listeners) listener(theme);
}

export function toggleTheme() {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
}

export function onThemeChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

media.addEventListener("change", () => {
  if (!document.documentElement.dataset.theme) for (const listener of listeners) listener(currentTheme());
});

// Reads a design token, for canvas-based charts that cannot use CSS variables.
export const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
