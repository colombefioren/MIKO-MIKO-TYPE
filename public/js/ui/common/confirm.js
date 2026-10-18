import { h } from "../../lib/dom.js";

// Promise-based replacement for window.confirm built on <dialog>.
export function confirmAction({ title, body, confirmLabel = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const dialog = h(
      "dialog.dialog",
      { "aria-labelledby": "confirm-title" },
      h("h2.dialog-title", { id: "confirm-title" }, title),
      body && h("p.muted", { style: { marginTop: "8px" } }, body),
      h(
        "form.dialog-actions",
        { method: "dialog", style: { marginTop: "20px" } },
        h("button.btn.btn-secondary", { value: "cancel", autofocus: true }, "Cancel"),
        h(`button.btn.${danger ? "btn-danger" : "btn-primary"}`, { value: "confirm" }, confirmLabel)
      )
    );
    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue === "confirm");
      dialog.remove();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close("cancel");
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}
