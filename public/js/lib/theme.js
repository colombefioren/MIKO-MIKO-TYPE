const KEY = "mikomiko:theme";
const listeners = new Set();

export function currentTheme() {
  // Dark navy is the brand look, so it is the default until the user picks light.
  return document.documentElement.dataset.theme || "dark";
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

// Reads a design token, for canvas-based charts that cannot use CSS variables.
export const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
