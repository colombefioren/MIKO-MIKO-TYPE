// Accessible tabs: arrow keys move between tabs, and only the selected panel is shown.
import { h, icon } from "../../lib/dom.js";

// items: [{ id, label, icon?, badge?, content? }]
// With `hash: true` the selected tab is kept in the URL hash and follows hash changes.
export function createTabs({ label, items, initial, idPrefix = "", className = "tabs", hash = false, onSelect }) {
  const list = h(`div.${className}`, { role: "tablist", "aria-label": label });
  const tabs = {};
  const panels = {};
  const ids = items.map((item) => item.id);

  function select(id, { focus = false } = {}) {
    if (!tabs[id]) return;
    for (const other of ids) {
      const active = other === id;
      tabs[other].setAttribute("aria-selected", String(active));
      tabs[other].tabIndex = active ? 0 : -1;
      panels[other].hidden = !active;
    }
    if (focus) tabs[id].focus();
    if (hash && location.hash.slice(1) !== id) history.replaceState(null, "", `${location.pathname}${location.search}#${id}`);
    onSelect?.(id);
  }

  items.forEach((item, index) => {
    const tab = h(
      "button.tab",
      { type: "button", role: "tab", id: `${idPrefix}tab-${item.id}`, "aria-controls": `${idPrefix}panel-${item.id}`, onclick: () => select(item.id) },
      item.icon && icon(item.icon),
      item.label,
      item.badge
    );
    tab.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (step) select(ids[(index + step + ids.length) % ids.length], { focus: true });
    });
    tabs[item.id] = tab;
    panels[item.id] = h("div", { role: "tabpanel", id: `${idPrefix}panel-${item.id}`, "aria-labelledby": `${idPrefix}tab-${item.id}` }, item.content);
    list.append(tab);
  });

  if (hash) window.addEventListener("hashchange", () => select(location.hash.slice(1)));
  select(ids.includes(initial) ? initial : ids[0]);

  return { list, panels, select, elements: [list, ...Object.values(panels)] };
}
