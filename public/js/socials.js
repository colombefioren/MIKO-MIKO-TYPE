import { supabase } from "./database.js";
import { getCurrentUser } from "./auth.js";

// Post functions
export async function createPost(title, content, imageDataUrl, hashtags = []) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    let imageUrl = null;

    if (imageDataUrl) {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();

      const fileName = `post_images/${user.id}/${Date.now()}.png`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      imageUrl = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("posts")
      .insert([
        {
          user_id: user.id,
          title,
          content,
          image_url: imageUrl,
          hashtags,
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
}
export async function getPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles:user_id (username, avatar_url),
      comments:comments (count),
      likes:likes (user_id)
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data.map((post) => ({
    ...post,
    likes_count: post.likes.length,
  }));
}

// Comment functions
export async function createComment(postId, content) {
  const user = await getCurrentUser();
  if (!user) throw new Error("User not logged in");

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      content: content,
    })
    .select();

  if (error) throw error;
  return data[0];
}

export async function getComments(postId) {
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      *,
      profiles:user_id (username, avatar_url)
    `
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

// Like functions
export async function toggleLike(postId) {
  const user = await getCurrentUser();
  if (!user) throw new Error("User not logged in");

  // Check if already liked
  const { data: existingLike, error: checkError } = await supabase
    .from("likes")
    .select()
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .single();

  if (existingLike) {
    // Unlike
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (error) throw error;
    return { liked: false };
  } else {
    // Like
    const { error } = await supabase.from("likes").insert({
      post_id: postId,
      user_id: user.id,
    });

    if (error) throw error;
    return { liked: true };
  }
}

// Notification functions
export async function getNotifications() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      *,
      sender:from_user (username, avatar_url),
      post:post_id (id)
    `
    )
    .eq("to_user", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

export async function markNotificationAsRead(notificationId) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) throw error;
}
