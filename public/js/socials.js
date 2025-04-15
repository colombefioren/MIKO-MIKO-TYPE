import { supabase } from "./database.js";

export async function createPost(content, gameResult) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      content,
      wpm: gameResult?.wpm,
      accuracy: gameResult?.accuracy,
      mode: gameResult?.mode,
      difficulty: gameResult?.difficulty,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      id, 
      content,
      wpm,
      accuracy,
      mode,
      difficulty,
      created_at,
      profiles:user_id (id, username, avatar_url),
      likes(count),
      comments(count)
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function likePost(postId) {
  const user = await getCurrentUser();

  const { error } = await supabase.from("likes").insert({
    post_id: postId,
    user_id: user.id,
  });

  if (error) throw error;
}

export async function addComment(postId, content) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      content,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
