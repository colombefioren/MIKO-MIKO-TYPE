export async function saveGameResult(result) {
  const user = await getCurrentUser();

  if (!user) {
    console.error("User not found");
    return;
  }

  // Save to game_results (for average calculation)
  const { error: gameResultsError } = await supabase
    .from("game_results")
    .insert({
      user_id: user.id,
      wpm: result.wpm,
      accuracy: result.accuracy,
      mode: result.mode,
    });

  if (gameResultsError) {
    console.error("Error saving to game_results:", gameResultsError);
  }

  // Fetch current high scores
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("wpm_avg, accuracy_avg")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
  }


  // Recalculate and update average stats
  await updateUserAverages(user.id);

  return result;
}
