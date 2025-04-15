import { supabase } from "./database.js";

let chatChannel;

export function setupRealtimeChat() {
  // Subscribe to new messages
  chatChannel = supabase
    .channel("chat_channel")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        // Handle new message
        displayMessage(payload.new);
      }
    )
    .subscribe();
}

export async function sendMessage(receiverId, content) {
  const user = await getCurrentUser();

  const { error } = await supabase.from("messages").insert({
    sender_id: user.id,
    receiver_id: receiverId,
    content,
  });

  if (error) throw error;
}

export async function getConversation(userId) {
  const currentUser = await getCurrentUser();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.id})`
    )
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function markMessagesAsRead(senderId) {
  const currentUser = await getCurrentUser();

  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("sender_id", senderId)
    .eq("receiver_id", currentUser.id)
    .eq("read", false);

  if (error) throw error;
}
