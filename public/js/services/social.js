import { supabase, unwrap } from "../lib/supabase.js";
import { uploadImage } from "./profiles.js";

export const PAGE_SIZE = 15;

const POST_FIELDS = `
  id, content, image_url, hashtags, created_at, user_id,
  author:profiles!posts_user_id_fkey (id, username, avatar_url),
  result:game_results (wpm, raw_wpm, accuracy, difficulty, word_count, content_types),
  likes (count),
  comments (count)
`;

export function extractHashtags(text) {
  const tags = text.match(/#[\p{L}\p{N}_]{1,30}/gu) ?? [];
  return [...new Set(tags.map((tag) => tag.slice(1).toLowerCase()))].slice(0, 10);
}

function normalize(post, likedIds) {
  return {
    ...post,
    likeCount: post.likes?.[0]?.count ?? 0,
    commentCount: post.comments?.[0]?.count ?? 0,
    likedByMe: likedIds.has(post.id),
  };
}

async function likedPostIds(userId, postIds) {
  if (!userId || !postIds.length) return new Set();
  const rows = unwrap(await supabase.from("likes").select("post_id").eq("user_id", userId).in("post_id", postIds));
  return new Set(rows.map((row) => row.post_id));
}

// Keyset pagination: pass the smallest id already shown to get the next page.
export async function getFeed({ userId, beforeId = null, authorId = null } = {}) {
  let query = supabase.from("posts").select(POST_FIELDS).order("id", { ascending: false }).limit(PAGE_SIZE);
  if (beforeId) query = query.lt("id", beforeId);
  if (authorId) query = query.eq("user_id", authorId);
  const posts = unwrap(await query);
  const liked = await likedPostIds(userId, posts.map((post) => post.id));
  return posts.map((post) => normalize(post, liked));
}

export async function getPost(postId, userId) {
  const post = unwrap(await supabase.from("posts").select(POST_FIELDS).eq("id", postId).maybeSingle());
  if (!post) return null;
  return normalize(post, await likedPostIds(userId, [post.id]));
}

export async function createPost({ userId, content, imageFile = null, resultId = null }) {
  const image = imageFile ? await uploadImage("post-images", userId, imageFile) : null;
  const row = unwrap(
    await supabase
      .from("posts")
      .insert({
        content,
        image_url: image?.url ?? null,
        hashtags: extractHashtags(content),
        result_id: resultId,
      })
      .select("id")
      .single()
  );
  return row.id;
}

export async function deletePost(postId) {
  unwrap(await supabase.from("posts").delete().eq("id", postId));
}

export async function setLike(postId, userId, liked) {
  if (liked) {
    const { error } = await supabase.from("likes").insert({ post_id: postId });
    // 23505 = already liked, which is the state we want.
    if (error && error.code !== "23505") throw error;
  } else {
    unwrap(await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId));
  }
}

export async function getComments(postId) {
  return unwrap(
    await supabase
      .from("comments")
      .select("id, content, created_at, user_id, author:profiles (id, username, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
  );
}

export async function addComment(postId, content) {
  return unwrap(
    await supabase
      .from("comments")
      .insert({ post_id: postId, content })
      .select("id, content, created_at, user_id, author:profiles (id, username, avatar_url)")
      .single()
  );
}

export async function deleteComment(commentId) {
  unwrap(await supabase.from("comments").delete().eq("id", commentId));
}
