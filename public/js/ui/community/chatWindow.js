// Floating direct-message window with live delivery and a typing indicator.
import { h, icon, replaceChildren } from "../../lib/dom.js";
import { avatar } from "../../lib/avatar.js";
import { clockTime, dayLabel } from "../../lib/format.js";
import { errorMessage, toast } from "../../lib/toast.js";
import { profileUrl } from "../../lib/routes.js";
import { scheduleBadgeRefresh } from "../shell/inboxBadge.js";
import { getMessages, markChatRead, sendMessage } from "../../services/chat.js";
import { isOnline, joinChatRoom, onOnlineChange } from "../../services/realtime.js";

export function createChatWindow({ onActivity }) {
  let me = null;
  let current = null;
  let room = null;
  let typingTimer = null;
  let lastDay = null;
  let stopPresence = () => {};

  const status = h("span.list-sub");
  const typing = h("div.chat-typing", { "aria-live": "polite" });
  const messages = h("div.chat-messages", { role: "log", "aria-label": "Messages" });
  const input = h("input.input", { placeholder: "Write a message", maxlength: 2000, "aria-label": "Message", autocomplete: "off" });
  const send = h("button.btn.btn-primary", { type: "submit", "aria-label": "Send" }, icon("paper-plane-right"));
  const form = h("form.chat-form", {}, input, send);
  const title = h("a.list-title");
  const headAvatar = h("span.avatar-wrap");

  const panel = h(
    "section.chat",
    { hidden: true, "aria-label": "Conversation" },
    h(
      "div.chat-head",
      {},
      headAvatar,
      h("div.list-main", {}, title, status),
      h("button.icon-btn", { type: "button", "aria-label": "Close conversation", onclick: () => close() }, icon("x"))
    ),
    messages,
    typing,
    form
  );
  document.body.append(panel);

  const nearBottom = () => messages.scrollHeight - messages.scrollTop - messages.clientHeight < 80;
  const scrollToBottom = () => (messages.scrollTop = messages.scrollHeight);

  function updateStatus() {
    if (!current) return;
    status.textContent = isOnline(current.other.id) ? "Online" : "Offline";
  }

  function bubble(message) {
    const nodes = [];
    const day = dayLabel(message.created_at);
    if (day !== lastDay) {
      lastDay = day;
      nodes.push(h("p.chat-day", {}, day));
    }
    nodes.push(
      h(
        `div.bubble${message.sender_id === me.id ? ".is-mine" : ""}`,
        { dataset: { messageId: message.id } },
        message.content,
        h("time.bubble-time", { datetime: message.created_at }, clockTime(message.created_at))
      )
    );
    return nodes;
  }

  function append(message) {
    if (messages.querySelector(`[data-message-id="${message.id}"]`)) return;
    const stick = nearBottom() || message.sender_id === me.id;
    messages.querySelector(".empty-state")?.remove();
    messages.append(...bubble(message));
    if (stick) scrollToBottom();
  }

  async function open(chat, user) {
    me = user;
    if (current?.id !== chat.id) {
      room?.leave();
      current = chat;
      lastDay = null;
      replaceChildren(headAvatar, avatar(chat.other, 36));
      title.textContent = chat.other.username;
      title.href = profileUrl(chat.other.id);
      typing.textContent = "";
      replaceChildren(messages, h("div.skeleton.skeleton-row"), h("div.skeleton.skeleton-row"));
      room = joinChatRoom(chat.id, () => {
        typing.textContent = `${chat.other.username} is typing`;
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => (typing.textContent = ""), 3000);
      });
      stopPresence();
      stopPresence = onOnlineChange(updateStatus);
    }
    panel.hidden = false;
    input.focus();

    try {
      const list = await getMessages(chat.id);
      if (current?.id !== chat.id) return;
      messages.replaceChildren();
      lastDay = null;
      if (!list.length) messages.append(h("div.empty-state", {}, h("p.empty-state-body", {}, `Say hello to ${chat.other.username}.`)));
      for (const message of list) messages.append(...bubble(message));
      scrollToBottom();
      await markChatRead(chat.id, me.id);
      scheduleBadgeRefresh();
      onActivity?.();
    } catch (error) {
      replaceChildren(messages, h("p.form-error", {}, errorMessage(error)));
    }
  }

  function close() {
    panel.hidden = true;
    room?.leave();
    room = null;
    stopPresence();
    current = null;
  }

  input.addEventListener("input", () => room?.sendTyping());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = input.value.trim();
    if (!content || !current) return;
    send.disabled = true;
    try {
      const message = await sendMessage(current.id, content);
      input.value = "";
      append(message);
      onActivity?.();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      send.disabled = false;
      input.focus();
    }
  });

  return {
    open,
    close,
    get chatId() {
      return current?.id ?? null;
    },
    // Called for every message insert the user is allowed to see.
    async receive(message) {
      if (!current || message.chat_id !== current.id) return false;
      append(message);
      typing.textContent = "";
      if (message.sender_id !== me.id && !panel.hidden) {
        await markChatRead(current.id, me.id);
        scheduleBadgeRefresh();
      }
      return true;
    },
  };
}
