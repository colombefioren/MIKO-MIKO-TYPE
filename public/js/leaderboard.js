import { supabase } from "./database.js";

export async function getLeaderboard(timeframe = "daily", mode = "all") {
  let query = supabase
    .from("leaderboard")
    .select(
      `
      wpm,
      accuracy,
      mode,
      difficulty,
      created_at,
      profiles:user_id (username, avatar_url)
    `
    )
    .order("wpm", { ascending: false })
    .limit(100);

  // Apply timeframe filter
  if (timeframe === "daily") {
    query = query.gte(
      "created_at",
      new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
    );
  } else if (timeframe === "weekly") {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    query = query.gte("created_at", oneWeekAgo.toISOString());
  } else if (timeframe === "monthly") {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    query = query.gte("created_at", oneMonthAgo.toISOString());
  }

  // Apply mode filter
  if (mode !== "all") {
    query = query.eq("mode", mode);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getUserRank(userId) {
  // Get all users ordered by highest WPM
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, wpm_record")
    .order("wpm_record", { ascending: false });

  if (error) throw error;

  // Find user's rank
  const rank = data.findIndex((user) => user.id === userId) + 1;
  return rank;
}
