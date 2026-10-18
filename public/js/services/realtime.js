// Realtime over Supabase's websocket: database change feeds, presence and broadcast.
import { supabase, isBackendReady } from "../lib/supabase.js";

let channelCount = 0;

// subscribeToChanges("feed", [{ table: "posts", event: "INSERT" }], (payload) => ...)
export function subscribeToChanges(name, specs, handler) {
  if (!isBackendReady) return () => {};
  const channel = supabase.channel(`${name}:${++channelCount}`);
  for (const spec of specs) {
    channel.on(
      "postgres_changes",
      { schema: "public", event: spec.event ?? "*", table: spec.table, filter: spec.filter },
      (payload) => handler({ ...payload, table: spec.table })
    );
  }
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}

// Online status of signed-in users, shared by every page.
const onlineListeners = new Set();
let presenceChannel = null;
let onlineIds = new Set();

export function joinPresence(userId) {
  if (!isBackendReady || presenceChannel) return;
  presenceChannel = supabase.channel("presence:online", { config: { presence: { key: userId } } });
  presenceChannel
    .on("presence", { event: "sync" }, () => {
      onlineIds = new Set(Object.keys(presenceChannel.presenceState()));
      for (const listener of onlineListeners) listener(onlineIds);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") presenceChannel.track({ online_at: new Date().toISOString() });
    });
}

export function leavePresence() {
  if (!presenceChannel) return;
  supabase.removeChannel(presenceChannel);
  presenceChannel = null;
  onlineIds = new Set();
  for (const listener of onlineListeners) listener(onlineIds);
}

export function onOnlineChange(listener) {
  onlineListeners.add(listener);
  listener(onlineIds);
  return () => onlineListeners.delete(listener);
}

export const isOnline = (userId) => onlineIds.has(userId);

// Typing indicator inside a conversation, sent as ephemeral broadcast messages.
export function joinChatRoom(chatId, onTyping) {
  if (!isBackendReady) return { sendTyping() {}, leave() {} };
  // Private channel: realtime policies only let the two chat members join.
  const channel = supabase.channel(`chat:${chatId}`, { config: { private: true, broadcast: { self: false } } });
  channel.on("broadcast", { event: "typing" }, () => onTyping());
  channel.subscribe();

  let lastSent = 0;
  return {
    sendTyping() {
      const now = Date.now();
      if (now - lastSent < 1500) return;
      lastSent = now;
      channel.send({ type: "broadcast", event: "typing", payload: {} });
    },
    leave() {
      supabase.removeChannel(channel);
    },
  };
}
