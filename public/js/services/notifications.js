import { supabase, unwrap } from "../lib/supabase.js";

export async function getNotifications(userId, limit = 30) {
  return unwrap(
    await supabase
      .from("notifications")
      .select("id, type, post_id, created_at, read_at, actor:profiles!notifications_actor_id_fkey (id, username, avatar_url)")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
  );
}

export async function countUnreadNotifications(userId) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllNotificationsRead(userId) {
  unwrap(
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .is("read_at", null)
  );
}

export async function clearNotifications(userId) {
  unwrap(await supabase.from("notifications").delete().eq("recipient_id", userId));
}

export function describeNotification(type) {
  switch (type) {
    case "friend_request":
      return { icon: "user-plus", text: "sent you a friend request" };
    case "friend_accepted":
      return { icon: "handshake", text: "accepted your friend request" };
    case "post_liked":
      return { icon: "heart", text: "liked your post" };
    case "post_commented":
      return { icon: "chat-circle", text: "commented on your post" };
    default:
      return { icon: "bell", text: "sent you an update" };
  }
}
