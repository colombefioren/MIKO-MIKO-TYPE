// Chats tab: conversations with the last message and unread count.
import { h, emptyState, replaceChildren, skeletonRows } from "../../../lib/dom.js";
import { timeAgo } from "../../../lib/format.js";
import { errorMessage } from "../../../lib/toast.js";
import { getChatList } from "../../../services/chat.js";
import { presenceAvatar, refreshPresence } from "../../common/presence.js";

function chatRow(chat, userId, onOpenChat) {
  const other = { id: chat.other_id, username: chat.other_username, avatar_url: chat.other_avatar_url };
  const unread = Number(chat.unread_count);
  const preview = chat.last_message ? `${chat.last_sender_id === userId ? "You: " : ""}${chat.last_message}` : "No messages yet";
  return h(
    `button.list-row${unread ? ".is-unread" : ""}`,
    { type: "button", onclick: () => onOpenChat({ id: chat.chat_id, other }) },
    presenceAvatar(other, 40),
    h("span.list-main", {}, h("span.list-title", {}, other.username), h("span.list-sub", {}, preview)),
    h("span.list-side", {}, timeAgo(chat.last_message_at), unread ? h("span.count-pill", {}, unread) : null)
  );
}

export function createChatsTab({ panel, setCount, onOpenChat, onFindFriends }) {
  return async function load(user) {
    if (!panel.children.length) replaceChildren(panel, skeletonRows(3));
    try {
      const chats = await getChatList();
      setCount(chats.reduce((sum, chat) => sum + Number(chat.unread_count), 0));
      if (!chats.length) {
        replaceChildren(
          panel,
          emptyState({
            iconName: "chats-circle",
            title: "No conversations yet",
            body: "Message a friend to start chatting.",
            action: h("button.btn.btn-secondary.btn-sm", { type: "button", onclick: onFindFriends }, "Find friends"),
          })
        );
        return;
      }
      replaceChildren(panel, h("div.list", {}, chats.map((chat) => chatRow(chat, user.id, onOpenChat))));
      refreshPresence(panel);
    } catch (error) {
      replaceChildren(panel, h("p.form-error", {}, errorMessage(error)));
    }
  };
}
