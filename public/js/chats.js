import { supabase } from "./database.js";
import { getCurrentUser } from "./auth.js";
import {
  setupRealtimeNotifications,
  loadNotifications,
} from "./notifications.js";

let currentChatId = null;
let currentContact = null;
let user = null;
let isUserScrollingUp = false;
let lastScrollPosition = 0;
const messagesContainer = document.getElementById("chat-messages");

document.addEventListener("DOMContentLoaded", async () => {
  user = await getCurrentUser();
  if (user) {
    loadingMessages();
    setupRealtimeChat();
    setupEventListeners();
    setupRealtimeNotifications();
  }
});

function loadingMessages() {
  setInterval(async () => {
    await loadChats();
    if (currentChatId && !isUserScrollingUp) {
      const messages = await getMessages(currentChatId);
      renderMessages(messages);
      await markMessagesAsRead(currentChatId);
    }
  }, 1000);
}
messagesContainer.addEventListener("scroll", () => {
  const currentScrollPosition = messagesContainer.scrollTop;
  isUserScrollingUp = currentScrollPosition < lastScrollPosition;
  lastScrollPosition = currentScrollPosition;
});
// Chat functions
export async function createChat(otherUserId) {
  try {
    // check if chat already exists
    const { data: existingChat, error: checkError } = await supabase
      .from("chats")
      .select()
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .or(`user1_id.eq.${otherUserId},user2_id.eq.${otherUserId}`)
      .single();

    if (existingChat) {
      return existingChat;
    }

    // a new chat
    const user1_id = user.id < otherUserId ? user.id : otherUserId;
    const user2_id = user.id < otherUserId ? otherUserId : user.id;

    const { data, error } = await supabase
      .from("chats")
      .insert({ user1_id, user2_id })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating chat:", error);
    throw error;
  }
}

export async function getChats() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    const { data: chats, error } = await supabase
      .from("chats")
      .select(
        `
        *,
        user1:user1_id (id, username, avatar_url),
        user2:user2_id (id, username, avatar_url)
      `
      )
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const chatsDetails = await Promise.all(
      chats.map(async (chat) => {
        // get the latest message
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("chat_id", chat.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: unreadMessages } = await supabase
          .from("messages")
          .select("id")
          .eq("chat_id", chat.id)
          .eq("read", false)
          .neq("sender_id", user.id);

        return {
          ...chat,
          last_message: lastMessage || null,
          unread_count: unreadMessages?.length || 0,
        };
      })
    );

    return chatsDetails;
  } catch (error) {
    console.error("Error getting chats:", error);
    throw error;
  }
}

export async function getMessages(chatId) {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select(
        `
        *,
        sender:sender_id (id, username, avatar_url)
      `
      )
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error getting messages:", error);
    throw error;
  }
}

export async function sendMessage(chatId, content) {
  try {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: content,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

export async function markMessagesAsRead(chatId) {
  try {
    const { error } = await supabase
      .from("messages")
      .update({ read: true })
      .eq("chat_id", chatId)
      .neq("sender_id", user.id)
      .eq("read", false);

    if (error) throw error;
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw error;
  }
}

async function loadChats() {
  try {
    const chats = await getChats();
    renderChats(chats);
  } catch (error) {
    console.error("Error loading chats:", error);
    showError("Failed to load chats");
  }
}

function renderChats(chats) {
  const container = document.getElementById("chat-list-container");
  container.innerHTML = "";

  if (chats.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-comments text-5xl text-dusk mb-4"></i>
        <h3 class="text-slate-200 font-bold text-lg mb-2">No conversations yet</h3>
        <p class="text-azure">Start a new chat to connect with friends</p>
      </div>
    `;
    return;
  }

  chats.forEach((chat) => {
    const otherUser = chat.user1_id === user.id ? chat.user2 : chat.user1;
    const unreadCount = chat.unread_count || 0;

    const chatElement = document.createElement("div");
    chatElement.className =
      "bg-midnight border border-lightabyss w-full rounded-3xl py-3 px-6 h-20 flex items-center justify-between cursor-pointer hover:bg-lightabyss/20 transition-colors";
    chatElement.innerHTML = `
      <div class="flex gap-3 h-full items-center">
        <img src="${
          otherUser.avatar_url || "../public/assets/images/blank-profile.png"
        }"
             alt="Profile Pic" class="rounded-full w-12 h-12 object-cover">
        <div class="flex flex-col justify-between h-[85%]">
          <div class="text-slate-200 text-[14px]">${otherUser.username}</div>
          <div class="text-azure text-[12px] truncate max-w-[180px]">
            ${chat.last_message?.content || "No messages yet"}
          </div>
        </div>
      </div>
      <div class="flex flex-col items-end gap-1">
        <div class="text-dusk text-xs">${formatChatDate(
          chat.last_message?.created_at || chat.created_at
        )}</div>
        ${
          unreadCount > 0
            ? `
          <div class="bg-green-400 rounded-full w-5 h-5 flex items-center justify-center text-xs text-midnight">
            ${unreadCount}
          </div>
        `
            : ""
        }
      </div>
    `;

    chatElement.addEventListener("click", () =>
      openChatConversation(otherUser.username, chat.id, otherUser.avatar_url)
    );
    container.appendChild(chatElement);
  });
}

export async function openChatConversation(contactName, chatId, contactAvatar) {
  if (currentChatId && currentChatId !== chatId) {
    await markMessagesAsRead(currentChatId);
  }

  currentChatId = chatId;
  currentContact = contactName;

  const chat = document.getElementById("chat-conversation");
  document.getElementById("chat-contact-name").textContent = contactName;
  document.getElementById("chat-contact-avatar").src =
    contactAvatar || "../public/assets/images/blank-profile.png";

  // Show the chat if hidden
  if (chat.classList.contains("hidden")) {
    chat.classList.remove("hidden");
    chat.classList.add("flex");
    setTimeout(() => {
      chat.classList.remove("translate-y-full");
      chat.classList.add("translate-y-0");
    }, 10);
  }

  // Load messages
  try {
    const messages = await getMessages(chatId);
    renderMessages(messages);
    scrollToBottom();
    await markMessagesAsRead(chatId);
    await loadChats(); // refresh chat list to update unread counts
  } catch (error) {
    console.error("Error loading messages:", error);
  }
}
function renderMessages(messages) {
  const currentMessageCount = messagesContainer.querySelectorAll(".message-container").length;
  if (Math.abs(messages.length - currentMessageCount) > 1 || messages.length === 0) {
    messagesContainer.innerHTML = "";
  } else if (messages.length === currentMessageCount) {
    return;
  }

  const previousScrollHeight = messagesContainer.scrollHeight;
  const previousScrollTop = messagesContainer.scrollTop;

  if (messages.length === 0) {
    messagesContainer.innerHTML = `
      <div class="flex items-center justify-center h-full">
        <div class="text-dusk text-center">
          <i class="fas fa-comments text-4xl mb-2"></i>
          <p>No messages yet. Send the first message!</p>
        </div>
      </div>
    `;
    return;
  }

  // group messages by date
  const groupedMessages = groupMessagesByDate(messages);

  for (const [date, dayMessages] of Object.entries(groupedMessages)) {
    // add date divider
    messagesContainer.innerHTML += `
      <div class="flex items-center my-4">
        <div class="flex-1 border-t border-lightabyss"></div>
        <div class="px-3 text-dusk text-xs">${date}</div>
        <div class="flex-1 border-t border-lightabyss"></div>
      </div>
    `;

    // add messages for this date
    dayMessages.forEach((message) => {
      const isCurrentUser = message.sender_id === user.id;

      const messageElement = document.createElement("div");
      messageElement.className = `mb-4 flex flex-col items-${
        isCurrentUser ? "end" : "start"
      }`;
      messageElement.innerHTML = `
        <div class="text-azure text-xs">${
          isCurrentUser ? "You" : message.sender.username
        }</div>
        <div class="mt-1 px-4 py-2 ${
          isCurrentUser ? "bg-blaze text-white" : "bg-lightabyss text-slate-200"
        } rounded-xl max-w-[80%]">
          ${message.content}
          <div class="flex justify-end mt-1">
            <span class="text-xs ${
              isCurrentUser ? "text-blaze-200" : "text-dusk"
            } flex items-center">
              <span class="mr-1">${formatMessageTime(message.created_at)}</span>
              ${
                isCurrentUser
                  ? '<i class="fas fa-check-double text-[10px] text-green-400"></i>'
                  : ""
              }
            </span>
          </div>
        </div>
      `;
      messagesContainer.appendChild(messageElement);
    });
  }

  const isNewMessageFromUser = messages[messages.length - 1]?.sender_id === user.id;
  const wasNearBottom = isScrolledToBottom();
  
  if ((!isUserScrollingUp && wasNearBottom) || isNewMessageFromUser) {
    scrollToBottom();
  } else {
    const newScrollHeight = messagesContainer.scrollHeight;
    messagesContainer.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
  }
}

function isScrolledToBottom() {
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
  return Math.abs(scrollHeight - scrollTop - clientHeight) < 50; 
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function groupMessagesByDate(messages) {
  const grouped = {};

  messages.forEach((message) => {
    const date = new Date(message.created_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    if (!grouped[date]) {
      grouped[date] = [];
    }

    grouped[date].push(message);
  });

  return grouped;
}

async function sendChatMessage() {
  if (!currentChatId) return;

  const input = document.getElementById("chat-message-input");
  const message = input.value.trim();
  if (!message) return;

  try {
    await sendMessage(currentChatId, message);
    input.value = "";

    // reload messages to show the new one
    const messages = await getMessages(currentChatId);
    renderMessages(messages);
    loadChats();

    // scroll to bottom
    scrollToBottom();
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

function setupRealtimeChat() {
  const existingChannels = supabase.getChannels();
  existingChannels.forEach((channel) => {
    if (
      channel.topic === "realtime:public:messages" ||
      channel.topic === "realtime:public:chats"
    ) {
      supabase.removeChannel(channel);
    }
  });

  const messagesChannel = supabase
    .channel("messages_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `chat_id=in.(${getUserChatIds()})`,
      },
      async (payload) => {
        if (payload.new.chat_id === currentChatId) {
          const messages = await getMessages(currentChatId);
          renderMessages(messages);
          await markMessagesAsRead(currentChatId);

          // scroll to bottom if the new message is from the other user
          if (payload.new.sender_id !== user.id) {
            scrollToBottom();
          }
        }
        await loadChats(); 
      }
    )
    .subscribe();

  const chatsChannel = supabase
    .channel("chats_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chats",
        filter: `user1_id=eq.${user.id},user2_id=eq.${user.id}`,
      },
      async () => {
        await loadChats();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(messagesChannel);
    supabase.removeChannel(chatsChannel);
  };
}

async function getUserChatIds() {
  try {
    const { data: chats, error } = await supabase
      .from("chats")
      .select("id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    if (error) throw error;

    return chats.map((chat) => chat.id).join(",");
  } catch (error) {
    console.error("Error getting user chats:", error);
    return "";
  }
}
function setupEventListeners() {
  // send on button click
  document
    .getElementById("chat-send-btn")
    .addEventListener("click", sendChatMessage);

  // send on esnter key
  document
    .getElementById("chat-message-input")
    .addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendChatMessage();
    });

  // new chat button
  document.getElementById("new-chat-btn").addEventListener("click", () => {
    document.getElementById("new-chat-modal").classList.remove("hidden");
    loadFriendsForNewChat();
  });

  // close new chat modal
  document
    .getElementById("close-new-chat-modal")
    .addEventListener("click", () => {
      document.getElementById("new-chat-modal").classList.add("hidden");
    });
}

async function loadFriendsForNewChat() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data: friends, error } = await supabase
      .from("friends")
      .select(
        `
        *,
        user1:user1_id (id, username, avatar_url),
        user2:user2_id (id, username, avatar_url)
      `
      )
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq("status", "accepted");

    if (error) throw error;

    const friendsList = document.getElementById("friends-list");
    friendsList.innerHTML = "";

    if (!friends || friends.length === 0) {
      friendsList.innerHTML = `
        <div class="text-center py-8 text-dusk">
          <i class="fas fa-user-friends text-4xl mb-2"></i>
          <p>No friends yet. Add some friends to start chatting!</p>
        </div>
      `;
      return;
    }

    friends.forEach((friendship) => {
      // Determine who the *other* user is
      const friendUser =
        friendship.user1.id === user.id ? friendship.user2 : friendship.user1;

      const friendElement = document.createElement("div");
      friendElement.className =
        "friend-item flex items-center gap-3 p-3 hover:bg-lightabyss/20 rounded-lg cursor-pointer";
      friendElement.dataset.userId = friendUser.id;
      friendElement.dataset.username = friendUser.username;
      friendElement.innerHTML = `
        <img src="${
          friendUser.avatar_url || "../public/assets/images/blank-profile.png"
        }" 
             class="w-10 h-10 rounded-full object-cover">
        <div class="text-slate-200">${friendUser.username}</div>
      `;

      friendElement.addEventListener("click", async () => {
        const chat = await createChat(friendUser.id);
        document.getElementById("new-chat-modal").classList.add("hidden");
        openChatConversation(
          friendUser.username,
          chat.id,
          friendUser.avatar_url
        );
      });

      friendsList.appendChild(friendElement);
    });
  } catch (error) {
    console.error("Error loading friends:", error);
  }
}

function formatChatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < week) return `${Math.floor(diff / day)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMessageTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// make functions available globally for HTML onclick handlers
window.toggleChatConversation = function () {
  const chat = document.getElementById("chat-conversation");
  chat.classList.toggle("hidden");
  chat.classList.toggle("flex");
  chat.classList.toggle("translate-y-full");
  chat.classList.toggle("translate-y-0");
};
window.openChatConversation = openChatConversation;
window.sendChatMessage = sendChatMessage;
