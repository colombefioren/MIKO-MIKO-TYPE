import { supabase, unwrap } from "../lib/supabase.js";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function getProfile(userId) {
  return unwrap(await supabase.from("profiles").select("*").eq("id", userId).maybeSingle());
}

export async function searchProfiles(term, excludeId) {
  const pattern = `%${term.replace(/[\\%_]/g, "\\$&")}%`;
  let query = supabase.from("profiles").select("id, username, avatar_url, best_wpm").ilike("username", pattern).limit(10);
  if (excludeId) query = query.neq("id", excludeId);
  return unwrap(await query);
}

export async function updateProfile(userId, changes) {
  return unwrap(await supabase.from("profiles").update(changes).eq("id", userId).select().single());
}

export function validateImage(file, maxBytes) {
  if (!IMAGE_TYPES.includes(file.type)) return "Use a PNG, JPEG, WebP or GIF image.";
  if (file.size > maxBytes) return `Images must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  return null;
}

// Uploads into "<bucket>/<userId>/..." which is the only folder storage policies allow.
export async function uploadImage(bucket, userId, file) {
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  unwrap(await supabase.storage.from(bucket).upload(path, file, { cacheControl: "31536000", contentType: file.type }));
  return { path, url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

export async function updateAvatar(userId, file) {
  const previous = await getProfile(userId);
  const { url } = await uploadImage("avatars", userId, file);
  const updated = await updateProfile(userId, { avatar_url: url });

  // Remove the old file so each user keeps a single avatar.
  const marker = "/storage/v1/object/public/avatars/";
  const oldPath = previous?.avatar_url?.split(marker)[1];
  if (oldPath) await supabase.storage.from("avatars").remove([decodeURIComponent(oldPath)]);
  return updated;
}
