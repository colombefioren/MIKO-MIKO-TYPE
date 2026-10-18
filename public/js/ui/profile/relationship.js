// Buttons on someone else's profile: message (always), plus add, accept, cancel or unfriend.
import { h, icon, replaceChildren } from "../../lib/dom.js";
import { pageUrl } from "../../lib/routes.js";
import { acceptFriendRequest, getFriendshipWith, removeFriendship, sendFriendRequest } from "../../services/friends.js";
import { runAction } from "../common/actions.js";
import { confirmAction } from "../common/confirm.js";

export async function renderRelationship(container, me, profile) {
  let friendship;
  try {
    friendship = await getFriendshipWith(me.id, profile.id);
  } catch (error) {
    console.error("Could not load friendship", error);
    return;
  }

  const rerender = () => renderRelationship(container, me, profile);
  const button = (classes, label, iconName, options) =>
    h(`button.btn.${classes}`, {
      type: "button",
      onclick: (event) => runAction(event.currentTarget, { ...options, after: rerender }),
    }, iconName && icon(iconName), label);

  // Anyone can be messaged, friends or not.
  const buttons = [
    h("a.btn.btn-primary", { href: pageUrl(`pages/friends.html?chat=${encodeURIComponent(profile.id)}`) }, icon("chat-circle"), "Message"),
  ];
  if (!friendship) {
    buttons.push(button("btn-secondary", "Add friend", "user-plus", { busyLabel: "Sending", action: () => sendFriendRequest(me.id, profile.id), success: "Friend request sent." }));
  } else if (friendship.status === "pending" && friendship.incoming) {
    buttons.push(
      button("btn-secondary", "Accept request", "check", { busyLabel: "Accepting", action: () => acceptFriendRequest(friendship.id), success: "You are now friends." }),
      button("btn-secondary", "Decline", null, { busyLabel: "Declining", action: () => removeFriendship(friendship.id) })
    );
  } else if (friendship.status === "pending") {
    buttons.push(button("btn-secondary", "Cancel request", "clock", { busyLabel: "Cancelling", action: () => removeFriendship(friendship.id), success: "Request cancelled." }));
  } else {
    const unfriend = h("button.btn.btn-danger", { type: "button" }, "Unfriend");
    unfriend.addEventListener("click", async () => {
      const ok = await confirmAction({
        title: `Remove ${profile.username}?`,
        body: "They will be removed from your friends. You can still message each other.",
        confirmLabel: "Unfriend",
        danger: true,
      });
      if (ok) runAction(unfriend, { busyLabel: "Removing", action: () => removeFriendship(friendship.id), success: "Friend removed.", after: rerender });
    });
    buttons.push(unfriend);
  }
  replaceChildren(container, buttons);
}
