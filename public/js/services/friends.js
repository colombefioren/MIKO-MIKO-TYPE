import { supabase, unwrap } from "../lib/supabase.js";

const FRIENDSHIP_FIELDS = `
  id, status, requester_id, addressee_id, created_at,
  requester:profiles!friendships_requester_id_fkey (id, username, avatar_url, best_wpm),
  addressee:profiles!friendships_addressee_id_fkey (id, username, avatar_url, best_wpm)
`;

function withOther(row, userId) {
  const incoming = row.addressee_id === userId;
  return { ...row, incoming, other: incoming ? row.requester : row.addressee };
}

// All friendships of the user, split into accepted friends and pending requests.
export async function getFriendships(userId) {
  const rows = unwrap(
    await supabase
      .from("friendships")
      .select(FRIENDSHIP_FIELDS)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false })
  ).map((row) => withOther(row, userId));

  return {
    friends: rows.filter((row) => row.status === "accepted"),
    incoming: rows.filter((row) => row.status === "pending" && row.incoming),
    outgoing: rows.filter((row) => row.status === "pending" && !row.incoming),
  };
}

// Friendships of any user, used on public profiles.
export async function getFriendsOf(userId) {
  const { friends } = await getFriendships(userId);
  return friends;
}

export async function getFriendshipWith(userId, otherId) {
  const row = unwrap(
    await supabase
      .from("friendships")
      .select(FRIENDSHIP_FIELDS)
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`
      )
      .maybeSingle()
  );
  return row ? withOther(row, userId) : null;
}

// Sending a request to someone who already asked you accepts theirs instead.
export async function sendFriendRequest(userId, otherId) {
  const existing = await getFriendshipWith(userId, otherId);
  if (existing?.status === "pending" && existing.incoming) return acceptFriendRequest(existing.id);
  if (existing) return existing;
  return unwrap(await supabase.from("friendships").insert({ addressee_id: otherId }).select().single());
}

export async function acceptFriendRequest(friendshipId) {
  return unwrap(await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId).select().single());
}

// Used to decline, cancel, or unfriend.
export async function removeFriendship(friendshipId) {
  unwrap(await supabase.from("friendships").delete().eq("id", friendshipId));
}
