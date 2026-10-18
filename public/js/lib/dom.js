// Small DOM helpers. User content is always set through textContent, never innerHTML.

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// h("button.btn.btn-primary", { type: "button", onclick }, "Save")
export function h(tag, props = {}, ...children) {
  const [name, ...classes] = tag.split(".");
  const el = document.createElement(name || "div");
  if (classes.length) el.classList.add(...classes);

  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") el.classList.add(...String(value).split(/\s+/).filter(Boolean));
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key === "style" && typeof value === "object") {
      for (const [prop, v] of Object.entries(value)) {
        if (prop.startsWith("--")) el.style.setProperty(prop, v);
        else el.style[prop] = v;
      }
    }
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value);
    else if (key in el && typeof value !== "string") el[key] = value;
    else el.setAttribute(key, value === true ? "" : value);
  }

  appendAll(el, children);
  return el;
}

export function append(el, ...children) {
  appendAll(el, children);
  return el;
}

function appendAll(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function icon(name, extra = "") {
  return h("i", { class: `ph ph-${name} ${extra}`.trim(), "aria-hidden": "true" });
}

export function replaceChildren(el, ...children) {
  el.replaceChildren();
  appendAll(el, children);
  return el;
}

// Sets a button into a busy state and returns a function that restores it.
export function setBusy(button, label = "Working") {
  const previous = [...button.childNodes];
  const wasDisabled = button.disabled;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  replaceChildren(button, h("span.spinner", { "aria-hidden": "true" }), label);
  return () => {
    button.disabled = wasDisabled;
    button.removeAttribute("aria-busy");
    button.replaceChildren(...previous);
  };
}

export function emptyState({ iconName, title, body, action }) {
  return h(
    "div.empty-state",
    {},
    icon(iconName, "empty-state-icon"),
    h("p.empty-state-title", {}, title),
    body && h("p.empty-state-body", {}, body),
    action
  );
}

export function skeletonRows(count, className = "skeleton-row") {
  return Array.from({ length: count }, () => h(`div.skeleton.${className}`, { "aria-hidden": "true" }));
}
