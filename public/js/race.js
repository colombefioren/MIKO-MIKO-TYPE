import { supabase } from "./database.js";

let raceChannel;

export async function createRace(textContent, mode, difficulty) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("races")
    .insert({
      creator_id: user.id,
      text_content,
      mode,
      difficulty,
      status: "waiting",
    })
    .select()
    .single();

  if (error) throw error;

  // Join the race as participant
  await joinRace(data.id);

  return data;
}

export async function joinRace(raceId) {
  const user = await getCurrentUser();

  const { error } = await supabase.from("race_participants").insert({
    race_id: raceId,
    user_id: user.id,
  });

  if (error) throw error;
}

export function setupRaceUpdates(raceId, callback) {
  raceChannel = supabase
    .channel("race_updates")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "race_participants",
        filter: `race_id=eq.${raceId}`,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
}

export async function submitRaceResult(raceId, wpm, accuracy) {
  const user = await getCurrentUser();

  // Get current position
  const { count } = await supabase
    .from("race_participants")
    .select("*", { count: "exact" })
    .eq("race_id", raceId)
    .eq("finished", true);

  const position = count + 1;

  const { error } = await supabase
    .from("race_participants")
    .update({
      wpm,
      accuracy,
      finished: true,
      position,
    })
    .eq("race_id", raceId)
    .eq("user_id", user.id);

  if (error) throw error;

  // Check if all participants finished
  const { count: remaining } = await supabase
    .from("race_participants")
    .select("*", { count: "exact" })
    .eq("race_id", raceId)
    .eq("finished", false);

  if (remaining === 0) {
    await supabase
      .from("races")
      .update({ status: "completed" })
      .eq("id", raceId);
  }
}
