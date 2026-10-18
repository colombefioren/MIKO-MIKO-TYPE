// Green dots on avatars of people connected right now (real presence state only).
import { h } from "../../lib/dom.js";
import { avatar } from "../../lib/avatar.js";
import { getOnlineIds, onOnlineChange } from "../../services/realtime.js";

export function presenceAvatar(profile, size) {
  return h("span.avatar-wrap", { dataset: { presence: profile.id } }, avatar(profile, size));
}

function sync(root, online) {
  for (const wrap of root.querySelectorAll("[data-presence]")) {
    const dot = wrap.querySelector(".online-dot");
    if (online.has(wrap.dataset.presence) && !dot) wrap.append(h("span.online-dot", { title: "Online" }));
    if (!online.has(wrap.dataset.presence) && dot) dot.remove();
  }
}

// Keeps the dots inside `root` current. Returns a function that stops watching.
export function watchPresence(root) {
  return onOnlineChange((online) => sync(root, online));
}

// For lists that re-render: apply the latest known state right away.
export function refreshPresence(root) {
  sync(root, getOnlineIds());
}
