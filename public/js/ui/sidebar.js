// Desktop sidebar from the original Miko-Miko layout: logo, navigation with the active
// page highlighted, and a collapse toggle (also Ctrl + Esc). Phones use the bottom tab bar instead.
import { h, icon } from "../lib/dom.js";

const KEY = "mikomiko:sidebar-collapsed";

function readCollapsed(fallback) {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === null ? fallback : saved === "true";
  } catch {
    return fallback;
  }
}

function saveCollapsed(value) {
  try {
    localStorage.setItem(KEY, String(value));
  } catch {
    // The choice only lasts for this page view.
  }
}

export function createSidebar({ items, active, pageUrl, collapsedByDefault }) {
  const highlight = h("span.sidebar-highlight", { "aria-hidden": "true" });
  const links = items.map((item) =>
    h(
      "a.sidebar-link",
      {
        href: pageUrl(item.href),
        "aria-current": item.id === active ? "page" : undefined,
        dataset: { tooltip: item.label },
      },
      icon(item.icon, "sidebar-icon"),
      h("span.sidebar-label", {}, item.label)
    )
  );
  const current = links[items.findIndex((item) => item.id === active)] ?? null;

  const toggle = h(
    "button.sidebar-toggle",
    { type: "button", "aria-controls": "sidebar", title: "Toggle the sidebar (Ctrl + Esc)" },
    icon("caret-left")
  );

  const sidebar = h(
    "aside.sidebar",
    { id: "sidebar", "aria-label": "Sidebar" },
    h(
      "a.sidebar-logo",
      { href: pageUrl("index.html"), "aria-label": "Miko-Miko Type home" },
      h("img.sidebar-logo-full", { src: pageUrl("public/assets/images/mikomiko-logo.webp"), alt: "", width: 170, height: 134 }),
      h("img.sidebar-logo-mark", { src: pageUrl("public/assets/images/mikomiko-mark.webp"), alt: "", width: 44, height: 55 })
    ),
    h("nav.sidebar-nav", { "aria-label": "Main" }, highlight, links),
    h("p.sidebar-hint", {}, h("kbd", {}, "Ctrl"), " + ", h("kbd", {}, "Esc"), " toggles the sidebar"),
    toggle
  );

  // The highlight sits behind the current page's link only.
  function moveTo(link, { instant = false } = {}) {
    if (!link) {
      highlight.style.opacity = "0";
      return;
    }
    if (instant) highlight.style.transition = "none";
    highlight.style.opacity = "1";
    highlight.style.transform = `translateY(${link.offsetTop}px)`;
    highlight.style.height = `${link.offsetHeight}px`;
    for (const other of links) other.classList.toggle("is-lit", other === link);
    if (instant) {
      highlight.getBoundingClientRect();
      highlight.style.transition = "";
    }
  }

  function setCollapsed(collapsed, { remember = false } = {}) {
    document.documentElement.classList.toggle("sidebar-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", collapsed ? "Expand the sidebar" : "Collapse the sidebar");
    if (remember) saveCollapsed(collapsed);
  }

  const isCollapsed = () => document.documentElement.classList.contains("sidebar-collapsed");
  toggle.addEventListener("click", () => setCollapsed(!isCollapsed(), { remember: true }));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && event.ctrlKey) {
      event.preventDefault();
      setCollapsed(!isCollapsed(), { remember: true });
    }
  });

  // Link sizes change while the sidebar animates, so keep the highlight on its link.
  new ResizeObserver(() => moveTo(current, { instant: true })).observe(sidebar);

  setCollapsed(readCollapsed(collapsedByDefault));
  requestAnimationFrame(() => moveTo(current, { instant: true }));
  return sidebar;
}
