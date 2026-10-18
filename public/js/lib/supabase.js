import { SUPABASE } from "../config.js";

const SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm";

async function createSupabaseClient() {
  if (!SUPABASE.url || !SUPABASE.anonKey) return null;
  try {
    const { createClient } = await import(SDK_URL);
    return createClient(SUPABASE.url, SUPABASE.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch (error) {
    // The typing test keeps working without the backend.
    console.warn("Supabase SDK unavailable, running in guest-only mode.", error);
    return null;
  }
}

export const supabase = await createSupabaseClient();
export const isBackendReady = supabase !== null;

// Only images served by this project's storage are rendered, never arbitrary third-party URLs.
export function isStorageUrl(url) {
  if (!url || !SUPABASE.url) return false;
  try {
    const parsed = new URL(url);
    return parsed.origin === new URL(SUPABASE.url).origin && parsed.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

// Throws the Supabase error so callers can use plain try/catch.
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}
