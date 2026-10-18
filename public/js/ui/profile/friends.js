import { h, emptyState } from "../../lib/dom.js";
import { round } from "../../lib/format.js";
import { profileUrl } from "../../lib/routes.js";
import { presenceAvatar, watchPresence } from "../common/presence.js";

let stopPresence = () => {};

export function friendsSection(friends) {
  if (!friends.length) {
    return emptyState({ iconName: "users-three", title: "No friends yet", body: "Find people from the Community page and send a request." });
  }
  const grid = h(
    "div.friend-grid",
    {},
    friends.map(({ other }) =>
      h(
        "a.card.friend-card",
        { href: profileUrl(other.id) },
        presenceAvatar(other, 40),
        h("span.list-main", {}, h("span.list-title", {}, other.username), h("span.list-sub", {}, `Best ${round(other.best_wpm)} wpm`))
      )
    )
  );
  stopPresence();
  stopPresence = watchPresence(grid);
  return grid;
}
