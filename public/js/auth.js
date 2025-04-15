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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          username
        )}&background=random`,
      },
    },
  });

  if (error) throw error;

  // Wait a moment for the user to be fully created
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Create profile in public.profiles table with the correct user ID
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: data.user.id,
    username: username,
    created_at: new Date().toISOString(),
  });

  if (profileError) {
    console.error("Profile creation error:", profileError);
    // Don't throw error - auth succeeded even if profile creation failed
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
