import { pageUrl } from "../lib/routes.js";
import { supabase, isBackendReady, unwrap } from "../lib/supabase.js";

const listeners = new Set();
let session = null;
let profile = null;
let ready;

export const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,24}$/;

async function loadProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.error("Could not load profile", error);
    return null;
  }
  return data;
}

async function applySession(next) {
  const previousId = session?.user?.id ?? null;
  session = next;
  const nextId = session?.user?.id ?? null;
  if (nextId !== previousId || (nextId && !profile)) {
    profile = nextId ? await loadProfile(nextId) : null;
  }
  for (const listener of listeners) listener(getAuthState());
}

// Resolves once the stored session has been read. Safe to call many times.
export function initAuth() {
  if (!ready) {
    ready = (async () => {
      if (!isBackendReady) return getAuthState();
      const { data } = await supabase.auth.getSession();
      await applySession(data.session);
      supabase.auth.onAuthStateChange((event, nextSession) => {
        if (event === "INITIAL_SESSION") return;
        // Defer: running Supabase calls inside this callback can deadlock the auth lock.
        setTimeout(() => applySession(nextSession), 0);
      });
      return getAuthState();
    })();
  }
  return ready;
}

export function getAuthState() {
  return { user: session?.user ?? null, profile };
}

export function onAuthChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshProfile() {
  if (!session?.user) return null;
  profile = await loadProfile(session.user.id);
  for (const listener of listeners) listener(getAuthState());
  return profile;
}

export async function signIn(email, password) {
  return unwrap(await supabase.auth.signInWithPassword({ email, password }));
}

// Returns true when the account still needs email confirmation.
export async function signUp(email, password, username) {
  const pattern = username.replace(/[\\%_]/g, "\\$&");
  const taken = unwrap(await supabase.from("profiles").select("id").ilike("username", pattern).limit(1));
  if (taken.length) throw new Error("That username is taken.");

  const data = unwrap(
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: pageUrl("index.html"),
      },
    })
  );
  return !data.session;
}

export async function signOut() {
  unwrap(await supabase.auth.signOut());
}

export async function changePassword(currentPassword, newPassword) {
  const email = session?.user?.email;
  const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (error) throw new Error("Your current password is incorrect.");
  unwrap(await supabase.auth.updateUser({ password: newPassword }));
}
