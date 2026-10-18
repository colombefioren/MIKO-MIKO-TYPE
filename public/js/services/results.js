import { supabase, unwrap } from "../lib/supabase.js";

const GUEST_KEY = "mikomiko:guest-results";
const GUEST_LIMIT = 50;

export async function saveResult(result) {
  return unwrap(
    await supabase
      .from("game_results")
      .insert({
        wpm: result.wpm,
        raw_wpm: result.rawWpm,
        accuracy: result.accuracy,
        difficulty: result.difficulty,
        word_count: result.wordCount,
        content_types: result.contentTypes,
        duration_ms: Math.round(result.durationMs),
      })
      .select()
      .single()
  );
}

export async function listResults(userId, limit = 50) {
  return unwrap(
    await supabase
      .from("game_results")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
  );
}

export async function getLeaderboard(difficulty = null, limit = 50) {
  return unwrap(await supabase.rpc("leaderboard", { p_difficulty: difficulty, p_limit: limit }));
}

// Guests keep their latest results in this browser only.
export function getGuestResults() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function saveGuestResult(result) {
  const entry = {
    wpm: result.wpm,
    raw_wpm: result.rawWpm,
    accuracy: result.accuracy,
    difficulty: result.difficulty,
    word_count: result.wordCount,
    content_types: result.contentTypes,
    duration_ms: Math.round(result.durationMs),
    created_at: new Date().toISOString(),
  };
  try {
    const next = [entry, ...getGuestResults()].slice(0, GUEST_LIMIT);
    localStorage.setItem(GUEST_KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked; the result is still shown on screen.
  }
  return entry;
}
