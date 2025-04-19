import { supabase } from "./database.js";

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUp(email, password, username) {
  // Generate default avatar URL
  const defaultAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    username
  )}&background=random`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        avatar_url: defaultAvatarUrl,
      },
    },
  });

  if (error) throw error;

  // Wait a moment for the user to be created
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Create profile in public.profiles table with default avatar
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: data.user.id,
    username: username,
    avatar_url: defaultAvatarUrl,
    created_at: new Date().toISOString(),
  });

  if (profileError) {
    console.error("Profile creation error:", profileError);
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function uploadAvatar(userId, file) {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${Math.random()
      .toString(36)
      .substring(2, 15)}.${fileExt}`;
    const filePath = fileName;

    const { data: existingFiles, error: listError } = await supabase.storage
      .from("avatar")
      .list("", {
        search: `${userId}-`,
      });

    if (!listError && existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map((x) => x.name);
      await supabase.storage.from("avatar").remove(filesToRemove);
    }

    // upload new file
    const { error: uploadError } = await supabase.storage
      .from("avatar")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatar").getPublicUrl(filePath);

    // update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    if (profileError) throw profileError;

    // update auth metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl },
    });

    if (authError) throw authError;

    return publicUrl;
  } catch (error) {
    console.error("Detailed upload error:", error);
    throw error;
  }
}
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}
