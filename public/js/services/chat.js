import { supabase, unwrap } from "../lib/supabase.js";

export async function getChatList() {
  return unwrap(await supabase.rpc("chat_list"));
}

export async function openChatWith(otherUserId) {
  return unwrap(await supabase.rpc("get_or_create_chat", { p_other: otherUserId }));
}

export async function getMessages(chatId, limit = 100) {
  const rows = unwrap(
    await supabase
      .from("messages")
      .select("id, chat_id, sender_id, content, created_at, read_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(limit)
  );
  return rows.reverse();
}

export async function sendMessage(chatId, content) {
  return unwrap(
    await supabase
      .from("messages")
      .insert({ chat_id: chatId, content })
      .select("id, chat_id, sender_id, content, created_at, read_at")
      .single()
  );
}

export async function markChatRead(chatId, userId) {
  unwrap(
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("chat_id", chatId)
      .neq("sender_id", userId)
      .is("read_at", null)
  );
}

export async function countUnreadMessages(userId) {
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .neq("sender_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}
