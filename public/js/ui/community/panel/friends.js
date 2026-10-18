// Friends tab: search typists, answer requests, message or remove friends.
import { h, icon, emptyState, replaceChildren, skeletonRows } from "../../../lib/dom.js";
import { round } from "../../../lib/format.js";
import { profileUrl } from "../../../lib/routes.js";
import { errorMessage } from "../../../lib/toast.js";
import { acceptFriendRequest, getFriendships, removeFriendship, sendFriendRequest } from "../../../services/friends.js";
import { searchProfiles } from "../../../services/profiles.js";
import { runAction } from "../../common/actions.js";
import { confirmAction } from "../../common/confirm.js";
import { presenceAvatar, refreshPresence } from "../../common/presence.js";

function personRow(profile, actions, sub) {
  return h(
    "div.list-row",
    {},
    presenceAvatar(profile, 40),
    h(
      "span.list-main",
      {},
      h("a.list-title.user-link", { href: profileUrl(profile.id) }, profile.username),
      h("span.list-sub", {}, sub ?? `Best ${round(profile.best_wpm)} wpm`)
    ),
    h("span.list-actions", {}, actions)
  );
}

export function createFriendsTab({ panel, setCount, onMessage }) {
  let user = null;
  let friendships = { friends: [], incoming: [], outgoing: [] };
  const searchInput = h("input.input", { type: "search", placeholder: "Search typists by username", "aria-label": "Search typists" });
  const search = h("div.search", {}, icon("magnifying-glass"), searchInput);
  const body = h("div");
  panel.append(search, body);

  // Icon button that runs a friendship change, then redraws the tab.
  const action = (label, iconName, run, success, extra = "") =>
    h(`button.icon-btn${extra}`, {
      type: "button",
      "aria-label": label,
      title: label,
      onclick: (event) => runAction(event.currentTarget, { action: run, success, after: refresh }),
    }, icon(iconName));

  function friendRow(row) {
    const unfriend = h("button.icon-btn", { type: "button", "aria-label": `Unfriend ${row.other.username}`, title: "Unfriend" }, icon("user-minus"));
    unfriend.addEventListener("click", async () => {
      const ok = await confirmAction({ title: `Remove ${row.other.username}?`, body: "They will be removed from your friends. You can still message each other.", confirmLabel: "Unfriend", danger: true });
      if (ok) runAction(unfriend, { action: () => removeFriendship(row.id), success: "Friend removed.", after: refresh });
    });
    return personRow(row.other, [messageButton(row.other), unfriend]);
  }

  // Anyone can be messaged, friends or not.
  const messageButton = (profile) =>
    h("button.icon-btn", { type: "button", "aria-label": `Message ${profile.username}`, title: "Message", onclick: () => onMessage(profile) }, icon("chat-circle"));

  const incomingRow = (row) =>
    personRow(
      row.other,
      [
        messageButton(row.other),
        action("Accept", "check", () => acceptFriendRequest(row.id), `You and ${row.other.username} are now friends.`, ".is-active"),
        action("Decline", "x", () => removeFriendship(row.id)),
      ],
      "Wants to be friends"
    );
  const outgoingRow = (row) =>
    personRow(row.other, [messageButton(row.other), action("Cancel request", "x", () => removeFriendship(row.id), "Request cancelled.")], "Request pending");

  function renderLists() {
    const { friends, incoming, outgoing } = friendships;
    setCount(incoming.length);
    const sections = [];
    if (incoming.length) sections.push(h("p.list-heading", {}, "Requests"), incoming.map(incomingRow));
    if (friends.length) sections.push(h("p.list-heading", {}, `Friends (${friends.length})`), friends.map(friendRow));
    if (outgoing.length) sections.push(h("p.list-heading", {}, "Sent"), outgoing.map(outgoingRow));
    if (!sections.length) sections.push(emptyState({ iconName: "users-three", title: "No friends yet", body: "Search for a username above to send a request." }));
    replaceChildren(body, h("div.list", {}, sections));
    refreshPresence(body);
  }

  function searchRow(profile) {
    const find = (rows) => rows.find((row) => row.other.id === profile.id);
    const friend = find(friendships.friends);
    if (friend) return friendRow(friend);
    const incoming = find(friendships.incoming);
    if (incoming) return incomingRow(incoming);
    const outgoing = find(friendships.outgoing);
    if (outgoing) return outgoingRow(outgoing);
    return personRow(profile, [messageButton(profile), action(`Add ${profile.username}`, "user-plus", () => sendFriendRequest(user.id, profile.id), "Friend request sent.")]);
  }

  let searchToken = 0;
  async function renderSearch(term) {
    const token = ++searchToken;
    replaceChildren(body, skeletonRows(2));
    try {
      const results = await searchProfiles(term, user.id);
      if (token !== searchToken) return;
      replaceChildren(
        body,
        results.length
          ? h("div.list", {}, results.map(searchRow))
          : emptyState({ iconName: "magnifying-glass", title: "No typists found", body: `Nobody matches "${term}".` })
      );
      refreshPresence(body);
    } catch (error) {
      replaceChildren(body, h("p.form-error", {}, errorMessage(error)));
    }
  }

  async function refresh() {
    if (!user) return;
    try {
      friendships = await getFriendships(user.id);
    } catch (error) {
      replaceChildren(body, h("p.form-error", {}, errorMessage(error)));
      return;
    }
    const term = searchInput.value.trim();
    if (term) renderSearch(term);
    else renderLists();
  }

  let searchTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const term = searchInput.value.trim();
    searchTimer = setTimeout(() => (term ? renderSearch(term) : renderLists()), 250);
  });

  return {
    async load(nextUser) {
      user = nextUser;
      search.hidden = !user;
      if (!user) {
        replaceChildren(body, emptyState({ iconName: "users-three", title: "Find your friends", body: "Log in to add friends and chat." }));
        return;
      }
      await refresh();
    },
    refresh,
  };
}
